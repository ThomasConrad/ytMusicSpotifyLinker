use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use rspotify::prelude::Id;
use crate::{
    app::spotify::{SpotifyAuthService, SpotifyClient, SpotifyPlaylistService, SpotifySyncService},
    users::AuthSession,
};

/// Request/Response DTOs for Spotify authentication
#[derive(Debug, Deserialize)]
pub struct SpotifyAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SpotifyAuthUrlResponse {
    pub success: bool,
    pub auth_url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SpotifyAuthStatusResponse {
    pub success: bool,
    pub authenticated: bool,
    pub user_profile: Option<SpotifyUserProfile>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SpotifyUserProfile {
    pub id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub followers: u32,
    pub premium: bool,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorResponse {
    pub success: bool,
    pub error: String,
}

#[derive(Debug, Serialize)]
pub struct ApiSuccessResponse {
    pub success: bool,
    pub message: String,
}

/// DTOs for playlist management
#[derive(Debug, Serialize)]
pub struct PlaylistResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub track_count: u32,
    pub is_public: bool,
    pub owner_id: String,
    pub owner_display_name: Option<String>,
    pub image_url: Option<String>,
    pub external_url: String,
}

#[derive(Debug, Serialize)]
pub struct PlaylistsResponse {
    pub success: bool,
    pub playlists: Vec<PlaylistResponse>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TrackResponse {
    pub id: Option<String>,
    pub name: String,
    pub artists: Vec<String>,
    pub album: Option<String>,
    pub duration_ms: Option<i32>,
    pub external_url: Option<String>,
    pub is_playable: bool,
    pub added_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PlaylistTracksResponse {
    pub success: bool,
    pub tracks: Vec<TrackResponse>,
    pub total: usize,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlaylistRequest {
    pub name: String,
    pub description: Option<String>,
    pub public: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PlaylistDetailResponse {
    pub success: bool,
    pub playlist: Option<PlaylistResponse>,
    pub error: Option<String>,
}

/// DTOs for sync operations
#[derive(Debug, Deserialize)]
pub struct SyncPreviewRequest {
    pub source_playlist_id: String,
    pub target_service: String,
    pub target_playlist_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncExecuteRequest {
    pub watcher_id: i64,
}

#[derive(Debug, Serialize)]
pub struct SyncPreviewResponse {
    pub success: bool,
    pub preview: Option<crate::users::models::SyncPreviewResponse>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SyncOperationResponse {
    pub success: bool,
    pub operation: Option<crate::users::models::SyncOperationResponse>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SyncStatusResponse {
    pub success: bool,
    pub status: Option<String>,
    pub operation: Option<crate::users::models::SyncOperationResponse>,
    pub error: Option<String>,
}

/// Spotify API routes
pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/auth/start", get(auth_start))
        .route("/auth/callback", get(auth_callback))
        .route("/auth/status", get(auth_status))
        .route("/auth/disconnect", post(auth_disconnect))
        .route("/test", get(test_connection))
        .route("/playlists", get(get_user_playlists))
        .route("/playlists/{playlist_id}", get(get_playlist_details))
        .route("/playlists/{playlist_id}/tracks", get(get_playlist_tracks))
        .route("/playlists", post(create_playlist))
        .route("/sync/preview", post(sync_preview))
        .route("/sync/execute", post(sync_execute))
        .route("/sync/{sync_id}/status", get(sync_status))
}

/// Start Spotify OAuth flow
async fn auth_start(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Create Spotify auth service
    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut auth_service = SpotifyAuthService::new(client_id, redirect_uri, pool);

    match auth_service.start_auth_flow(user.id).await {
        Ok(auth_url) => Ok(Json(SpotifyAuthUrlResponse {
            success: true,
            auth_url: Some(auth_url),
            error: None,
        })),
        Err(e) => Ok(Json(SpotifyAuthUrlResponse {
            success: false,
            auth_url: None,
            error: Some(format!("Failed to start auth flow: {}", e)),
        })),
    }
}

/// Handle Spotify OAuth callback
async fn auth_callback(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Query(params): Query<SpotifyAuthCallbackQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Check for OAuth error
    if let Some(error) = params.error {
        tracing::warn!("OAuth error: {}", error);
        return Ok(Redirect::to("/dashboard?error=oauth_denied").into_response());
    }

    let code = match params.code {
        Some(code) => code,
        None => {
            tracing::warn!("No authorization code received");
            return Ok(Redirect::to("/dashboard?error=no_code").into_response());
        }
    };

    let state = match params.state {
        Some(state) => state,
        None => {
            tracing::warn!("No state parameter received");
            return Ok(Redirect::to("/dashboard?error=no_state").into_response());
        }
    };

    // Create Spotify auth service
    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut auth_service = SpotifyAuthService::new(client_id, redirect_uri, pool);

    match auth_service.complete_auth_flow(&code, &state).await {
        Ok(_) => {
            tracing::info!("Successfully connected Spotify account for user {}", user.id);
            Ok(Redirect::to("/dashboard?spotify_connected=true").into_response())
        }
        Err(e) => {
            tracing::error!("Failed to complete auth flow: {}", e);
            Ok(Redirect::to(&format!("/dashboard?error=auth_failed&message={}", urlencoding::encode(&e.to_string()))).into_response())
        }
    }
}

/// Check Spotify authentication status
async fn auth_status(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let spotify_client = SpotifyClient::new(client_id, redirect_uri, pool);

    match spotify_client.is_authenticated(user.id).await {
        Ok(true) => {
            // Try to get user profile
            match spotify_client.get_current_user(user.id).await {
                Ok(profile) => Ok(Json(SpotifyAuthStatusResponse {
                    success: true,
                    authenticated: true,
                    user_profile: Some(SpotifyUserProfile {
                        id: profile.id.id().to_string(),
                        display_name: profile.display_name,
                        email: profile.email,
                        followers: profile.followers.map(|f| f.total).unwrap_or(0),
                        premium: profile.product.as_ref().map(|p| matches!(p, rspotify::model::SubscriptionLevel::Premium)).unwrap_or(false),
                    }),
                    error: None,
                })),
                Err(_) => Ok(Json(SpotifyAuthStatusResponse {
                    success: true,
                    authenticated: true,
                    user_profile: None,
                    error: Some("Could not fetch profile".to_string()),
                })),
            }
        }
        Ok(false) => Ok(Json(SpotifyAuthStatusResponse {
            success: true,
            authenticated: false,
            user_profile: None,
            error: None,
        })),
        Err(e) => Ok(Json(SpotifyAuthStatusResponse {
            success: false,
            authenticated: false,
            user_profile: None,
            error: Some(e.to_string()),
        })),
    }
}

/// Disconnect Spotify account
async fn auth_disconnect(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let auth_service = SpotifyAuthService::new(client_id, redirect_uri, pool);

    match auth_service.revoke_tokens(user.id).await {
        Ok(_) => Ok(Json(ApiSuccessResponse {
            success: true,
            message: "Successfully disconnected Spotify account".to_string(),
        }).into_response()),
        Err(e) => {
            let error_response = ApiErrorResponse {
                success: false,
                error: format!("Failed to disconnect: {}", e),
            };
            Ok(Json(error_response).into_response())
        },
    }
}

/// Test Spotify connection
async fn test_connection(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let spotify_client = SpotifyClient::new(client_id, redirect_uri, pool);

    match spotify_client.test_connection(user.id).await {
        Ok(true) => Ok(Json(ApiSuccessResponse {
            success: true,
            message: "Spotify connection is working".to_string(),
        }).into_response()),
        Ok(false) => {
            let error_response = ApiErrorResponse {
                success: false,
                error: "Spotify connection failed".to_string(),
            };
            Ok(Json(error_response).into_response())
        },
        Err(e) => {
            let error_response = ApiErrorResponse {
                success: false,
                error: format!("Connection test failed: {}", e),
            };
            Ok(Json(error_response).into_response())
        },
    }
}

/// Get user's Spotify playlists
async fn get_user_playlists(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let playlist_service = SpotifyPlaylistService::new(client_id, redirect_uri, pool);

    match playlist_service.get_user_playlists(user.id).await {
        Ok(playlists) => {
            let playlist_responses: Vec<PlaylistResponse> = playlists
                .into_iter()
                .map(|p| PlaylistResponse {
                    id: p.id.id().to_string(),
                    name: p.name,
                    description: None, // SimplifiedPlaylist doesn't have description field
                    track_count: p.tracks.total,
                    is_public: p.public.unwrap_or(false),
                    owner_id: p.owner.id.id().to_string(),
                    owner_display_name: p.owner.display_name,
                    image_url: p.images.first().map(|img| img.url.clone()),
                    external_url: p.external_urls.get("spotify").cloned().unwrap_or_default(),
                })
                .collect();

            Ok(Json(PlaylistsResponse {
                success: true,
                playlists: playlist_responses,
                error: None,
            }))
        }
        Err(e) => Ok(Json(PlaylistsResponse {
            success: false,
            playlists: vec![],
            error: Some(e.to_string()),
        })),
    }
}

/// Get detailed playlist information
async fn get_playlist_details(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Path(playlist_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let playlist_service = SpotifyPlaylistService::new(client_id, redirect_uri, pool);

    match playlist_service.get_playlist(user.id, &playlist_id).await {
        Ok(playlist) => {
            let playlist_response = PlaylistResponse {
                id: playlist.id.id().to_string(),
                name: playlist.name,
                description: playlist.description,
                track_count: playlist.tracks.total,
                is_public: playlist.public.unwrap_or(false),
                owner_id: playlist.owner.id.id().to_string(),
                owner_display_name: playlist.owner.display_name,
                image_url: playlist.images.first().map(|img| img.url.clone()),
                external_url: playlist.external_urls.get("spotify").cloned().unwrap_or_default(),
            };

            Ok(Json(PlaylistDetailResponse {
                success: true,
                playlist: Some(playlist_response),
                error: None,
            }))
        }
        Err(e) => Ok(Json(PlaylistDetailResponse {
            success: false,
            playlist: None,
            error: Some(e.to_string()),
        })),
    }
}

/// Get tracks from a specific playlist
async fn get_playlist_tracks(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Path(playlist_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let playlist_service = SpotifyPlaylistService::new(client_id, redirect_uri, pool);

    match playlist_service.get_playlist_tracks(user.id, &playlist_id).await {
        Ok(tracks) => {
            let track_responses: Vec<TrackResponse> = tracks
                .into_iter()
                .filter_map(|item| {
                    if let Some(track) = item.track {
                        if let rspotify::model::PlayableItem::Track(full_track) = track {
                            return Some(TrackResponse {
                                id: full_track.id.map(|id| id.id().to_string()),
                                name: full_track.name,
                                artists: full_track.artists.iter().map(|a| a.name.clone()).collect(),
                                album: Some(full_track.album.name),
                                duration_ms: Some(full_track.duration.num_milliseconds() as i32),
                                external_url: full_track.external_urls.get("spotify").cloned(),
                                is_playable: full_track.is_playable.unwrap_or(true),
                                added_at: item.added_at.map(|dt| dt.to_string()),
                            });
                        }
                    }
                    None
                })
                .collect();

            let total = track_responses.len();

            Ok(Json(PlaylistTracksResponse {
                success: true,
                tracks: track_responses,
                total,
                error: None,
            }))
        }
        Err(e) => Ok(Json(PlaylistTracksResponse {
            success: false,
            tracks: vec![],
            total: 0,
            error: Some(e.to_string()),
        })),
    }
}

/// Create a new playlist
async fn create_playlist(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Json(request): Json<CreatePlaylistRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Validate request
    if request.name.trim().is_empty() {
        return Ok(Json(ApiErrorResponse {
            success: false,
            error: "Playlist name cannot be empty".to_string(),
        }).into_response());
    }

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let playlist_service = SpotifyPlaylistService::new(client_id, redirect_uri, pool);

    match playlist_service.create_playlist(
        user.id,
        &request.name,
        request.description.as_deref(),
        request.public.unwrap_or(false),
    ).await {
        Ok(playlist) => {
            let playlist_response = PlaylistResponse {
                id: playlist.id.id().to_string(),
                name: playlist.name,
                description: playlist.description,
                track_count: playlist.tracks.total,
                is_public: playlist.public.unwrap_or(false),
                owner_id: playlist.owner.id.id().to_string(),
                owner_display_name: playlist.owner.display_name,
                image_url: playlist.images.first().map(|img| img.url.clone()),
                external_url: playlist.external_urls.get("spotify").cloned().unwrap_or_default(),
            };

            Ok(Json(PlaylistDetailResponse {
                success: true,
                playlist: Some(playlist_response),
                error: None,
            }).into_response())
        }
        Err(e) => Ok(Json(ApiErrorResponse {
            success: false,
            error: format!("Failed to create playlist: {}", e),
        }).into_response()),
    }
}

/// Preview sync operation to show what changes would be made
async fn sync_preview(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Json(request): Json<SyncPreviewRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Validate request
    if request.source_playlist_id.trim().is_empty() {
        return Ok(Json(SyncPreviewResponse {
            success: false,
            preview: None,
            error: Some("Source playlist ID cannot be empty".to_string()),
        }));
    }

    if request.target_service.trim().is_empty() {
        return Ok(Json(SyncPreviewResponse {
            success: false,
            preview: None,
            error: Some("Target service cannot be empty".to_string()),
        }));
    }

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let sync_service = SpotifySyncService::new(client_id, redirect_uri, pool);

    match sync_service.preview_sync(
        user.id,
        &request.source_playlist_id,
        &request.target_service,
        request.target_playlist_id.as_deref(),
    ).await {
        Ok(preview) => Ok(Json(SyncPreviewResponse {
            success: true,
            preview: Some(preview),
            error: None,
        })),
        Err(e) => Ok(Json(SyncPreviewResponse {
            success: false,
            preview: None,
            error: Some(e.to_string()),
        })),
    }
}

/// Execute sync operation for a watcher
async fn sync_execute(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Json(request): Json<SyncExecuteRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Validate that the watcher belongs to the authenticated user
    // This is a security check to prevent users from syncing other users' watchers
    use crate::users::repository::WatcherRepository;
    let watcher_repo = WatcherRepository::new(pool.clone());
    
    match watcher_repo.get_watcher_by_id(request.watcher_id).await {
        Ok(Some(watcher)) => {
            if watcher.user_id != user.id {
                return Ok(Json(SyncOperationResponse {
                    success: false,
                    operation: None,
                    error: Some("Access denied: watcher belongs to another user".to_string()),
                }));
            }
        }
        Ok(None) => {
            return Ok(Json(SyncOperationResponse {
                success: false,
                operation: None,
                error: Some("Watcher not found".to_string()),
            }));
        }
        Err(e) => {
            return Ok(Json(SyncOperationResponse {
                success: false,
                operation: None,
                error: Some(format!("Database error: {}", e)),
            }));
        }
    }

    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let sync_service = SpotifySyncService::new(client_id, redirect_uri, pool);

    // Execute sync in the background
    // Note: In a production environment, this would be better handled by a task queue
    // For now, we'll execute it directly but could timeout for long operations
    match sync_service.sync_playlist_to_target(request.watcher_id).await {
        Ok(operation) => Ok(Json(SyncOperationResponse {
            success: true,
            operation: Some(operation),
            error: None,
        })),
        Err(e) => Ok(Json(SyncOperationResponse {
            success: false,
            operation: None,
            error: Some(e.to_string()),
        })),
    }
}

/// Get status of a sync operation
async fn sync_status(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Path(sync_id): Path<i64>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    use crate::users::repository::SyncRepository;
    let sync_repo = SyncRepository::new(pool.clone());

    // First, we need to get the sync operation by ID to check if it exists
    // Since we don't have a direct method, we'll need to implement one or work around it
    // For now, let's get operations and filter by ID (not ideal, but works for testing)
    
    // Note: In a production system, we should add a get_sync_operation_by_id method
    // For now, we'll search across recent operations to find the one with matching ID
    use crate::users::repository::WatcherRepository;
    let watcher_repo = WatcherRepository::new(pool);
    
    // Get all watchers for this user and search their operations
    match watcher_repo.get_watchers_by_user(user.id).await {
        Ok(watchers) => {
            let mut found_operation = None;
            
            for watcher in watchers {
                match sync_repo.get_sync_operations_by_watcher(watcher.id, 50).await {
                    Ok(operations) => {
                        if let Some(operation) = operations.into_iter().find(|op| op.id == sync_id) {
                            found_operation = Some(operation);
                            break;
                        }
                    }
                    Err(_) => continue,
                }
            }
            
            if let Some(operation) = found_operation {
                // Operation already found in user's watchers, so it's owned by the user
                Ok(Json(SyncStatusResponse {
                    success: true,
                    status: Some(operation.status.clone()),
                    operation: Some(crate::users::models::SyncOperationResponse {
                        id: operation.id,
                        operation_type: operation.operation_type,
                        status: operation.status,
                        songs_added: operation.songs_added,
                        songs_removed: operation.songs_removed,
                        songs_failed: operation.songs_failed,
                        error_message: operation.error_message,
                        started_at: operation.started_at,
                        completed_at: operation.completed_at,
                    }),
                    error: None,
                }))
            } else {
                Ok(Json(SyncStatusResponse {
                    success: false,
                    status: None,
                    operation: None,
                    error: Some("Sync operation not found or access denied".to_string()),
                }))
            }
        }
        Err(e) => Ok(Json(SyncStatusResponse {
            success: false,
            status: None,
            operation: None,
            error: Some(format!("Failed to get sync status: {}", e)),
        })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create users table");

        sqlx::query(
            r#"
            CREATE TABLE user_credentials (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                service TEXT NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at DATETIME,
                token_scope TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, service)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create user_credentials table");

        pool
    }

    #[tokio::test]
    async fn test_spotify_auth_callback_query_deserialization() {
        let query = SpotifyAuthCallbackQuery {
            code: Some("test_code".to_string()),
            state: Some("test_state".to_string()),
            error: None,
        };

        assert_eq!(query.code.as_deref(), Some("test_code"));
        assert_eq!(query.state.as_deref(), Some("test_state"));
        assert!(query.error.is_none());
    }

    #[tokio::test]
    async fn test_spotify_auth_url_response_serialization() {
        let response = SpotifyAuthUrlResponse {
            success: true,
            auth_url: Some("https://accounts.spotify.com/authorize?...".to_string()),
            error: None,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"auth_url\""));
    }

    #[tokio::test]
    async fn test_spotify_user_profile_serialization() {
        let profile = SpotifyUserProfile {
            id: "spotify_user_123".to_string(),
            display_name: Some("Test User".to_string()),
            email: Some("test@example.com".to_string()),
            followers: 42,
            premium: true,
        };

        let json = serde_json::to_string(&profile).unwrap();
        assert!(json.contains("\"id\":\"spotify_user_123\""));
        assert!(json.contains("\"premium\":true"));
    }

    #[tokio::test]
    async fn test_playlist_response_serialization() {
        let playlist = PlaylistResponse {
            id: "test_playlist_id".to_string(),
            name: "My Test Playlist".to_string(),
            description: Some("A test playlist".to_string()),
            track_count: 10,
            is_public: true,
            owner_id: "test_user".to_string(),
            owner_display_name: Some("Test User".to_string()),
            image_url: Some("https://example.com/image.jpg".to_string()),
            external_url: "https://open.spotify.com/playlist/test".to_string(),
        };

        let json = serde_json::to_string(&playlist).unwrap();
        assert!(json.contains("\"id\":\"test_playlist_id\""));
        assert!(json.contains("\"name\":\"My Test Playlist\""));
        assert!(json.contains("\"track_count\":10"));
        assert!(json.contains("\"is_public\":true"));
    }

    #[tokio::test]
    async fn test_track_response_serialization() {
        let track = TrackResponse {
            id: Some("track_123".to_string()),
            name: "Test Song".to_string(),
            artists: vec!["Artist 1".to_string(), "Artist 2".to_string()],
            album: Some("Test Album".to_string()),
            duration_ms: Some(180000),
            external_url: Some("https://open.spotify.com/track/test".to_string()),
            is_playable: true,
            added_at: Some("2024-01-01T00:00:00Z".to_string()),
        };

        let json = serde_json::to_string(&track).unwrap();
        assert!(json.contains("\"id\":\"track_123\""));
        assert!(json.contains("\"name\":\"Test Song\""));
        assert!(json.contains("\"artists\":[\"Artist 1\",\"Artist 2\"]"));
        assert!(json.contains("\"duration_ms\":180000"));
    }

    #[tokio::test]
    async fn test_create_playlist_request_deserialization() {
        let json = r#"{"name":"New Playlist","description":"A new playlist","public":true}"#;
        let request: CreatePlaylistRequest = serde_json::from_str(json).unwrap();
        
        assert_eq!(request.name, "New Playlist");
        assert_eq!(request.description, Some("A new playlist".to_string()));
        assert_eq!(request.public, Some(true));
    }

    #[tokio::test]
    async fn test_playlists_response_serialization() {
        let response = PlaylistsResponse {
            success: true,
            playlists: vec![],
            error: None,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"playlists\":[]"));
    }

    #[tokio::test]
    async fn test_sync_preview_request_deserialization() {
        let json = r#"{"source_playlist_id":"spotify123","target_service":"youtube_music","target_playlist_id":"yt456"}"#;
        let request: SyncPreviewRequest = serde_json::from_str(json).unwrap();
        
        assert_eq!(request.source_playlist_id, "spotify123");
        assert_eq!(request.target_service, "youtube_music");
        assert_eq!(request.target_playlist_id, Some("yt456".to_string()));
    }

    #[tokio::test]
    async fn test_sync_execute_request_deserialization() {
        let json = r#"{"watcher_id":42}"#;
        let request: SyncExecuteRequest = serde_json::from_str(json).unwrap();
        
        assert_eq!(request.watcher_id, 42);
    }

    #[tokio::test]
    async fn test_sync_preview_response_serialization() {
        let response = SyncPreviewResponse {
            success: true,
            preview: None,
            error: None,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"preview\":null"));
    }

    #[tokio::test]
    async fn test_sync_operation_response_serialization() {
        let response = SyncOperationResponse {
            success: true,
            operation: None,
            error: None,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"operation\":null"));
    }

    #[tokio::test]
    async fn test_sync_status_response_serialization() {
        let response = SyncStatusResponse {
            success: true,
            status: Some("completed".to_string()),
            operation: None,
            error: None,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"status\":\"completed\""));
    }
}