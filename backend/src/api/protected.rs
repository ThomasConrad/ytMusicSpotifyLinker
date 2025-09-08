use axum::{
    extract::{Json, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::Deserialize;
use serde_json;
use sqlx::SqlitePool;
use time::OffsetDateTime;

use crate::users::AuthSession;

#[derive(Debug, Deserialize)]
pub struct SyncHistoryParams {
    limit: Option<i64>,
    watcher_id: Option<i64>,
}

pub fn router() -> Router<SqlitePool> {
    Router::new()
        // Protected service connections endpoint
        .route("/connections", get(get::get_service_connections))
        // Dashboard data endpoint
        .route("/dashboard", get(get::get_dashboard))
        // Sync history endpoint
        .route("/sync-history", get(get::get_sync_history))
}

mod get {
    use super::*;

    pub async fn get_service_connections(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;

        // Query user credentials for service connections
        let credentials = sqlx::query!(
            "SELECT service, access_token, expires_at, token_scope, created_at, updated_at 
             FROM user_credentials WHERE user_id = ?",
            user.id
        )
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut connections = Vec::new();

        for cred in credentials {
            let service = &cred.service;
            let expires_at = cred.expires_at;
            let created_at = cred.created_at;

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
                "scopes": cred.token_scope
                    .as_ref()
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

    pub async fn get_dashboard(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;

        // Get watcher statistics
        let watcher_stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as "total_watchers!: i64",
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as "active_watchers!: i64"
            FROM watchers 
            WHERE user_id = ?
            "#,
            user.id
        )
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Get sync statistics - use separate queries to avoid type issues
        let total_syncs_result = sqlx::query!(
            r#"
            SELECT COUNT(*) as "count!: i64"
            FROM sync_operations so
            INNER JOIN watchers w ON so.watcher_id = w.id
            WHERE w.user_id = ? AND so.status = 'completed'
            "#,
            user.id
        )
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Get last sync time separately
        let last_sync_result = sqlx::query!(
            r#"
            SELECT completed_at
            FROM sync_operations so
            INNER JOIN watchers w ON so.watcher_id = w.id
            WHERE w.user_id = ? AND so.status = 'completed' AND completed_at IS NOT NULL
            ORDER BY completed_at DESC
            LIMIT 1
            "#,
            user.id
        )
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Build dashboard response
        let dashboard_data = serde_json::json!({
            "user": {
                "id": user.id,
                "username": user.username
            },
            "stats": {
                "totalWatchers": watcher_stats.total_watchers,
                "activeWatchers": watcher_stats.active_watchers,
                "totalSyncs": total_syncs_result.count,
                "lastSyncTime": last_sync_result.and_then(|r| r.completed_at).map(|t| t.to_string())
            }
        });

        Ok(Json(dashboard_data))
    }

    pub async fn get_sync_history(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Query(params): Query<SyncHistoryParams>,
    ) -> Result<impl IntoResponse, StatusCode> {
        use sqlx::Row;

        let user = auth_required(auth_session)?;

        let limit = params.limit.unwrap_or(50).min(100); // Max 100 records

        // Build a single dynamic query to avoid distinct anonymous record types from multiple query! macros
        let mut sql = String::from(
            r#"
            SELECT 
                so.id,
                so.watcher_id,
                w.name as watcher_name,
                so.started_at as timestamp,
                so.status,
                so.songs_added,
                so.songs_failed,
                so.error_message as error
            FROM sync_operations so
            INNER JOIN watchers w ON so.watcher_id = w.id
            WHERE w.user_id = ?
            "#,
        );

        if params.watcher_id.is_some() {
            sql.push_str(" AND so.watcher_id = ?");
        }
        sql.push_str(" ORDER BY so.started_at DESC LIMIT ?");

        let mut query = sqlx::query(&sql).bind(user.id);

        if let Some(wid) = params.watcher_id {
            query = query.bind(wid);
        }
        query = query.bind(limit);

        let rows = query
            .fetch_all(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let sync_activities: Vec<serde_json::Value> = rows
            .into_iter()
            .map(|row| {
                let status_raw: String = row.get("status");
                let status = match status_raw.as_str() {
                    "completed" => "success",
                    "failed" => "error",
                    _ => "partial",
                };
                let id: i64 = row.get("id");
                let watcher_id: i64 = row.get("watcher_id");
                let watcher_name: String = row.get("watcher_name");
                let timestamp: Option<OffsetDateTime> = row.try_get("timestamp").ok();
                let songs_added: i64 = row.get("songs_added");
                let songs_failed: i64 = row.get("songs_failed");
                let error: Option<String> = row.try_get("error").ok();

                serde_json::json!({
                    "id": id,
                    "watcherId": watcher_id,
                    "watcherName": watcher_name,
                    "timestamp": timestamp.unwrap_or_else(OffsetDateTime::now_utc).to_string(),
                    "status": status,
                    "songsAdded": songs_added,
                    "songsFailed": songs_failed,
                    "songsSkipped": 0,
                    "error": error
                })
            })
            .collect();

        Ok(Json(sync_activities))
    }
}

// Shared helper function for authentication
fn auth_required(auth_session: AuthSession) -> Result<crate::users::database::User, StatusCode> {
    match auth_session.user {
        Some(user) => Ok(user),
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
