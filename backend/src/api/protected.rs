use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use serde_json;
use sqlx::SqlitePool;

use crate::users::{AuthSession, WatcherRepository, CreateWatcherRequest, WatcherResponse};

pub fn router() -> Router<SqlitePool> {
    Router::new()
        // /watchers endpoints
        .route(
            "/watchers",
            get(get::list_watchers).post(post::create_watcher),
        )
        // /watchers/{watchername}/ytmusic endpoints
        .route(
            "/watchers/{watchername}/ytmusic",
            get(get::get_ytmusic).post(post::post_ytmusic),
        )
        // /watchers/{watchername}/ytmusic/songs endpoint
        .route(
            "/watchers/{watchername}/ytmusic/songs",
            get(get::get_ytmusic_songs),
        )
        // /watchers/{watchername}/spotify endpoints
        .route(
            "/watchers/{watchername}/spotify",
            get(get::get_spotify).post(post::post_spotify),
        )
        // /watchers/{watchername}/spotify/songs endpoint
        .route(
            "/watchers/{watchername}/spotify/songs",
            get(get::get_spotify_songs),
        )
        // /watchers/{watchername}/share endpoint
        .route("/watchers/{watchername}/share", post(post::share_watcher))
        // /watchers/{watchername}/start endpoint
        .route("/watchers/{watchername}/start", get(get::start_watcher))
        // /watchers/{watchername}/stop endpoint
        .route("/watchers/{watchername}/stop", get(get::stop_watcher))
        // /watchers/{watchername}/preview endpoint
        .route("/watchers/{watchername}/preview", get(get::preview_watcher))
}

mod get {
    use super::*;

    pub async fn list_watchers(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        let repo = WatcherRepository::new(pool);
        
        match repo.get_watchers_by_user(user.id).await {
            Ok(watchers) => {
                let response: Vec<WatcherResponse> = watchers.into_iter()
                    .map(|w| WatcherResponse {
                        id: w.id,
                        name: w.name,
                        source_service: w.source_service,
                        source_playlist_id: w.source_playlist_id,
                        target_service: w.target_service,
                        target_playlist_id: w.target_playlist_id,
                        is_active: w.is_active,
                        sync_frequency: w.sync_frequency,
                        last_sync_at: w.last_sync_at,
                        created_at: w.created_at,
                    })
                    .collect();
                Ok(Json(response))
            }
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn get_ytmusic(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Getting YouTube Music for watcher: {}",
            watchername
        ))
    }

    pub async fn get_ytmusic_songs(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Getting YouTube Music songs for watcher: {}",
            watchername
        ))
    }

    pub async fn get_spotify(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!("Getting Spotify for watcher: {}", watchername))
    }

    pub async fn get_spotify_songs(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Getting Spotify songs for watcher: {}",
            watchername
        ))
    }

    pub async fn start_watcher(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        let repo = WatcherRepository::new(pool);
        
        match repo.get_watcher_by_name(user.id, &watchername).await {
            Ok(Some(watcher)) => {
                if let Err(_) = repo.update_watcher_status(watcher.id, true).await {
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }
                Ok(Json(serde_json::json!({
                    "message": format!("Started watcher: {}", watchername),
                    "status": "active"
                })))
            }
            Ok(None) => Err(StatusCode::NOT_FOUND),
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn stop_watcher(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        let repo = WatcherRepository::new(pool);
        
        match repo.get_watcher_by_name(user.id, &watchername).await {
            Ok(Some(watcher)) => {
                if let Err(_) = repo.update_watcher_status(watcher.id, false).await {
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }
                Ok(Json(serde_json::json!({
                    "message": format!("Stopped watcher: {}", watchername),
                    "status": "inactive"
                })))
            }
            Ok(None) => Err(StatusCode::NOT_FOUND),
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn preview_watcher(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        let repo = WatcherRepository::new(pool.clone());
        
        match repo.get_watcher_by_name(user.id, &watchername).await {
            Ok(Some(watcher)) => {
                // TODO: Implement actual preview logic with playlist comparison
                Ok(Json(serde_json::json!({
                    "message": format!("Preview for watcher: {}", watchername),
                    "songs_to_add": [],
                    "songs_to_remove": [],
                    "songs_failed": []
                })))
            }
            Ok(None) => Err(StatusCode::NOT_FOUND),
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }
}

mod post {
    use super::*;

    pub async fn create_watcher(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Json(request): Json<CreateWatcherRequest>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        let repo = WatcherRepository::new(pool);
        
        match repo.create_watcher(user.id, request).await {
            Ok(watcher) => {
                let response = WatcherResponse {
                    id: watcher.id,
                    name: watcher.name,
                    source_service: watcher.source_service,
                    source_playlist_id: watcher.source_playlist_id,
                    target_service: watcher.target_service,
                    target_playlist_id: watcher.target_playlist_id,
                    is_active: watcher.is_active,
                    sync_frequency: watcher.sync_frequency,
                    last_sync_at: watcher.last_sync_at,
                    created_at: watcher.created_at,
                };
                Ok((StatusCode::CREATED, Json(response)))
            }
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn post_ytmusic(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
        body: String,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Posted to YouTube Music for watcher: {} with data: {}",
            watchername, body
        ))
    }

    #[derive(Deserialize)]
    pub struct SpotifyData {
        pub playlist: String,
    }

    pub async fn post_spotify(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
        Json(data): Json<SpotifyData>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Posted to Spotify for watcher: {} with playlist: {}",
            watchername, data.playlist
        ))
    }

    pub async fn share_watcher(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
        body: String,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Shared watcher: {} with user: {}",
            watchername, body
        ))
    }
}

// Shared helper function for authentication
fn auth_required(auth_session: AuthSession) -> Result<crate::users::database::User, StatusCode> {
    match auth_session.user {
        Some(user) => Ok(user),
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
