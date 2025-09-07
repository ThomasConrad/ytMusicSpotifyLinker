use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use serde_json;
use sqlx::{SqlitePool, Row};
use time::OffsetDateTime;

use crate::users::AuthSession;

pub fn router() -> Router<SqlitePool> {
    Router::new()
        // Protected service connections endpoint  
        .route("/connections", get(get::get_service_connections))
}

mod get {
    use super::*;
    
    pub async fn get_service_connections(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        
        // Query user credentials for service connections
        let credentials = sqlx::query(
            "SELECT service, access_token, expires_at, token_scope, created_at, updated_at 
             FROM user_credentials WHERE user_id = ?"
        )
        .bind(user.id)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut connections = Vec::new();
        
        for cred in credentials {
            let service: String = cred.get("service");
            let expires_at: Option<OffsetDateTime> = cred.get("expires_at");
            let created_at: OffsetDateTime = cred.get("created_at");
            
            // Check if token is expired
            let is_connected = if let Some(expires_at) = expires_at {
                OffsetDateTime::now_utc() < expires_at
            } else {
                true // No expiry means it's still valid
            };

            connections.push(serde_json::json!({
                "service": service,
                "connected": is_connected,
                "connected_at": created_at,
                "expires_at": expires_at,
                "scopes": cred.get::<Option<String>, _>("token_scope")
                    .map(|s| s.split(',').map(|s| s.to_string()).collect::<Vec<String>>())
                    .unwrap_or_default()
            }));
        }
        
        // Always include standard services even if not connected
        let mut has_spotify = false;
        let mut has_youtube = false;
        
        for conn in &connections {
            match conn["service"].as_str() {
                Some("spotify") => has_spotify = true,
                Some("youtube_music") => has_youtube = true,
                _ => {}
            }
        }
        
        if !has_spotify {
            connections.push(serde_json::json!({
                "service": "spotify",
                "connected": false,
                "connected_at": null,
                "expires_at": null,
                "scopes": []
            }));
        }
        
        if !has_youtube {
            connections.push(serde_json::json!({
                "service": "youtube_music", 
                "connected": false,
                "connected_at": null,
                "expires_at": null,
                "scopes": []
            }));
        }

        Ok(Json(connections))
    }

}

// Shared helper function for authentication
fn auth_required(auth_session: AuthSession) -> Result<crate::users::database::User, StatusCode> {
    match auth_session.user {
        Some(user) => Ok(user),
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
