use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use rspotify::prelude::Id;
use crate::{
    app::spotify::{SpotifyAuthService, SpotifyClient},
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

/// Spotify API routes
pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/api/spotify/auth/start", get(auth_start))
        .route("/api/spotify/auth/callback", get(auth_callback))
        .route("/api/spotify/auth/status", get(auth_status))
        .route("/api/spotify/auth/disconnect", post(auth_disconnect))
        .route("/api/spotify/test", get(test_connection))
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
}