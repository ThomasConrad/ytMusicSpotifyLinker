use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json;
use sqlx::SqlitePool;
use time::OffsetDateTime;

use crate::users::{models::UserCredential, AuthSession};

// DTOs for user profile operations
#[derive(Debug, Serialize)]
pub struct UserProfileResponse {
    pub id: i64,
    pub username: String,
    pub created_at: Option<OffsetDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ServiceConnectionStatus {
    pub service: String,
    pub is_connected: bool,
    pub expires_at: Option<OffsetDateTime>,
    pub last_successful_auth: Option<OffsetDateTime>,
    pub requires_reauth: bool,
}

#[derive(Debug, Serialize)]
pub struct ServiceConnectionsResponse {
    pub connections: Vec<ServiceConnectionStatus>,
}

#[derive(Debug, Serialize)]
pub struct UserDashboardResponse {
    pub profile: UserProfileResponse,
    pub service_connections: Vec<ServiceConnectionStatus>,
    pub watcher_count: i32,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorResponse {
    pub success: bool,
    pub error: String,
    pub error_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApiSuccessResponse {
    pub success: bool,
    pub message: String,
}

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/profile", get(get::profile).put(profile_put))
        .route("/dashboard", get(get::dashboard))
        .route("/connections", get(get::connections))
        .route("/connections/{service}", delete(delete::connection))
}

mod get {
    use super::*;

    pub async fn profile(auth_session: AuthSession) -> Result<impl IntoResponse, StatusCode> {
        match auth_session.user {
            Some(user) => {
                Ok(Json(UserProfileResponse {
                    id: user.id,
                    username: user.username,
                    created_at: None, // TODO: Add created_at field to User model
                })
                .into_response())
            }
            None => Err(StatusCode::UNAUTHORIZED),
        }
    }

    pub async fn dashboard(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = match auth_session.user {
            Some(user) => user,
            None => return Err(StatusCode::UNAUTHORIZED),
        };

        // Get basic dashboard stats
        let watcher_stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_watchers,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_watchers,
                COUNT(CASE WHEN last_sync_at IS NOT NULL THEN 1 END) as synced_watchers
            FROM watchers 
            WHERE user_id = ?
            "#,
            user.id
        )
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let sync_stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_sync_operations,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_syncs,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
                SUM(songs_added) as "total_songs_added!: i64",
                SUM(songs_removed) as "total_songs_removed!: i64",
                MAX(started_at) as "last_sync_time: Option<OffsetDateTime>"
            FROM sync_operations so
            JOIN watchers w ON so.watcher_id = w.id
            WHERE w.user_id = ?
            "#,
            user.id
        )
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Get recent activity (last 10 operations)
        let recent_activity = sqlx::query!(
            r#"
            SELECT 
                so.id, so.operation_type, so.status, so.songs_added, so.songs_removed,
                so.started_at, so.completed_at, w.name as watcher_name
            FROM sync_operations so
            JOIN watchers w ON so.watcher_id = w.id
            WHERE w.user_id = ?
            ORDER BY so.started_at DESC
            LIMIT 10
            "#,
            user.id
        )
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let activity: Vec<serde_json::Value> = recent_activity
            .into_iter()
            .map(|row| {
                serde_json::json!({
                    "id": row.id,
                    "type": row.operation_type,
                    "status": row.status,
                    "watcher_name": row.watcher_name,
                    "songs_added": row.songs_added,
                    "songs_removed": row.songs_removed,
                    "started_at": row.started_at,
                    "completed_at": row.completed_at
                })
            })
            .collect();

        let dashboard_data = serde_json::json!({
            "user": {
                "id": user.id,
                "username": user.username
            },
            "stats": {
                "total_watchers": watcher_stats.total_watchers,
                "active_watchers": watcher_stats.active_watchers,
                "synced_watchers": watcher_stats.synced_watchers,
                "total_sync_operations": sync_stats.total_sync_operations,
                "successful_syncs": sync_stats.successful_syncs,
                "failed_syncs": sync_stats.failed_syncs,
                "total_songs_added": sync_stats.total_songs_added,
                "total_songs_removed": sync_stats.total_songs_removed,
                "last_sync_time": sync_stats.last_sync_time
            },
            "recent_activity": activity
        });

        Ok(Json(dashboard_data))
    }

    pub async fn connections(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = match auth_session.user {
            Some(user) => user,
            None => return Err(StatusCode::UNAUTHORIZED),
        };

        let service_connections = get_user_service_connections(&pool, user.id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(Json(ServiceConnectionsResponse {
            connections: service_connections,
        })
        .into_response())
    }
}

async fn profile_put(
    auth_session: AuthSession,
    State(pool): State<SqlitePool>,
    Json(request): Json<UpdateProfileRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let user = match auth_session.user {
        Some(user) => user,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // For now, only username updates are supported
    if let Some(new_username) = request.username {
        // Validate username
        if new_username.trim().is_empty() {
            return Ok(Json(ApiErrorResponse {
                success: false,
                error: "Username cannot be empty".to_string(),
                error_code: Some("INVALID_USERNAME".to_string()),
            })
            .into_response());
        }

        // Update username in database
        match update_user_profile(&pool, user.id, &new_username).await {
            Ok(_) => {
                Ok(Json(UserProfileResponse {
                    id: user.id,
                    username: new_username,
                    created_at: None, // TODO: Add created_at field to User model
                })
                .into_response())
            }
            Err(e) => {
                let error_message = if e.to_string().contains("UNIQUE constraint failed") {
                    "Username already exists".to_string()
                } else {
                    "Failed to update profile".to_string()
                };

                Ok(Json(ApiErrorResponse {
                    success: false,
                    error: error_message,
                    error_code: Some("UPDATE_FAILED".to_string()),
                })
                .into_response())
            }
        }
    } else {
        // No updates provided
        Ok(Json(UserProfileResponse {
            id: user.id,
            username: user.username,
            created_at: None,
        })
        .into_response())
    }
}

mod delete {
    use super::*;

    pub async fn connection(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Path(service): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = match auth_session.user {
            Some(user) => user,
            None => return Err(StatusCode::UNAUTHORIZED),
        };

        // Validate service name
        if !["youtube_music", "spotify"].contains(&service.as_str()) {
            return Ok(Json(ApiErrorResponse {
                success: false,
                error: format!("Unsupported service: {}", service),
                error_code: Some("INVALID_SERVICE".to_string()),
            })
            .into_response());
        }

        // Delete user credentials for the service
        match delete_user_credentials(&pool, user.id, &service).await {
            Ok(_) => Ok(Json(ApiSuccessResponse {
                success: true,
                message: format!("Successfully disconnected from {}", service),
            })
            .into_response()),
            Err(_) => Ok(Json(ApiErrorResponse {
                success: false,
                error: "Failed to disconnect service".to_string(),
                error_code: Some("DISCONNECT_FAILED".to_string()),
            })
            .into_response()),
        }
    }
}

// Helper functions for database operations

async fn get_user_service_connections(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<ServiceConnectionStatus>, sqlx::Error> {
    let rows = sqlx::query_as!(
        UserCredential,
        "SELECT * FROM user_credentials WHERE user_id = ?",
        user_id
    )
    .fetch_all(pool)
    .await?;

    let mut connections = Vec::new();
    let now = OffsetDateTime::now_utc();

    // Add connections for existing services
    for row in rows {
        let requires_reauth = row
            .expires_at
            .map(|expires| expires <= now)
            .unwrap_or(false);

        connections.push(ServiceConnectionStatus {
            service: row.service,
            is_connected: true,
            expires_at: row.expires_at,
            last_successful_auth: row.updated_at,
            requires_reauth,
        });
    }

    // Add disconnected services
    let connected_services: Vec<String> = connections.iter().map(|c| c.service.clone()).collect();
    for service in ["youtube_music", "spotify"] {
        if !connected_services.contains(&service.to_string()) {
            connections.push(ServiceConnectionStatus {
                service: service.to_string(),
                is_connected: false,
                expires_at: None,
                last_successful_auth: None,
                requires_reauth: false,
            });
        }
    }

    Ok(connections)
}

async fn update_user_profile(
    pool: &SqlitePool,
    user_id: i64,
    new_username: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "UPDATE users SET username = ? WHERE id = ?",
        new_username,
        user_id
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn delete_user_credentials(
    pool: &SqlitePool,
    user_id: i64,
    service: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "DELETE FROM user_credentials WHERE user_id = ? AND service = ?",
        user_id,
        service
    )
    .execute(pool)
    .await?;

    Ok(())
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
                FOREIGN KEY (user_id) REFERENCES users (id),
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
    async fn test_get_user_service_connections() {
        let pool = setup_test_db().await;

        // Insert test user
        sqlx::query!("INSERT INTO users (id, username) VALUES (1, 'testuser')")
            .execute(&pool)
            .await
            .unwrap();

        // Insert test credential
        let now = OffsetDateTime::now_utc();
        sqlx::query!(
            "INSERT INTO user_credentials (user_id, service, access_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            1, "youtube_music", "test_token", now, now
        )
        .execute(&pool)
        .await
        .unwrap();

        let connections = get_user_service_connections(&pool, 1).await.unwrap();

        assert_eq!(connections.len(), 2); // youtube_music (connected) + spotify (disconnected)

        let youtube_connection = connections
            .iter()
            .find(|c| c.service == "youtube_music")
            .unwrap();
        assert!(youtube_connection.is_connected);
        assert!(!youtube_connection.requires_reauth);

        let spotify_connection = connections.iter().find(|c| c.service == "spotify").unwrap();
        assert!(!spotify_connection.is_connected);
    }

    #[tokio::test]
    async fn test_update_user_profile() {
        let pool = setup_test_db().await;

        // Insert test user
        sqlx::query!("INSERT INTO users (id, username) VALUES (1, 'testuser')")
            .execute(&pool)
            .await
            .unwrap();

        // Update username
        update_user_profile(&pool, 1, "newusername").await.unwrap();

        // Verify update
        let row = sqlx::query!("SELECT username FROM users WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();

        let username: String = row.username;
        assert_eq!(username, "newusername");
    }
}
