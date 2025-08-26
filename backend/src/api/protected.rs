use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json;
use sqlx::{SqlitePool, Row};
use time::OffsetDateTime;

use crate::users::{AuthSession, WatcherRepository, CreateWatcherRequest, WatcherResponse};

// Enhanced DTOs for dashboard data
#[derive(Debug, Serialize)]
pub struct WatcherSummary {
    pub id: i64,
    pub name: String,
    pub source_service: String,
    pub target_service: String,
    pub is_active: bool,
    pub last_sync_at: Option<OffsetDateTime>,
    pub last_sync_status: Option<String>,
    pub total_songs: Option<i32>,
    pub sync_success_rate: Option<f32>,
    pub created_at: OffsetDateTime,
    pub source_playlist_id: String,
    pub target_playlist_id: Option<String>,
    pub sync_frequency: i32,
}

#[derive(Debug, Serialize)]
pub struct WatcherStatusDetail {
    pub watcher: WatcherSummary,
    pub recent_sync_operations: Vec<SyncOperationSummary>,
    pub statistics: WatcherStatistics,
}

#[derive(Debug, Serialize)]
pub struct SyncOperationSummary {
    pub id: i64,
    pub operation_type: String,
    pub status: String,
    pub songs_added: i32,
    pub songs_removed: i32,
    pub songs_failed: i32,
    pub error_message: Option<String>,
    pub started_at: OffsetDateTime,
    pub completed_at: Option<OffsetDateTime>,
}

#[derive(Debug, Serialize)]
pub struct WatcherStatistics {
    pub total_sync_operations: i32,
    pub successful_syncs: i32,
    pub failed_syncs: i32,
    pub success_rate: f32,
    pub total_songs_synced: i32,
    pub average_sync_time_seconds: Option<f32>,
}

#[derive(Debug, Serialize)]
pub struct SyncHistoryResponse {
    pub watcher_id: i64,
    pub watcher_name: String,
    pub operations: Vec<SyncOperationSummary>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub per_page: i32,
    pub total_count: i32,
    pub total_pages: i32,
}

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
        // Enhanced dashboard endpoints
        .route("/watchers/enhanced", get(get::list_watchers_enhanced))
        .route("/watchers/{id}/status", get(get::watcher_status_detail))
        .route("/watchers/{id}/history", get(get::watcher_sync_history))
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
            Ok(Some(_watcher)) => {
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

    pub async fn list_watchers_enhanced(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        
        match get_enhanced_watchers(&pool, user.id).await {
            Ok(watchers) => Ok(Json(watchers)),
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn watcher_status_detail(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Path(id): Path<i64>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        
        match get_watcher_status_detail(&pool, user.id, id).await {
            Ok(Some(detail)) => Ok(Json(detail)),
            Ok(None) => Err(StatusCode::NOT_FOUND),
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn watcher_sync_history(
        auth_session: AuthSession,
        State(pool): State<SqlitePool>,
        Path(id): Path<i64>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = auth_required(auth_session)?;
        
        match get_watcher_sync_history(&pool, user.id, id, 1, 20).await {
            Ok(Some(history)) => Ok(Json(history)),
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

// Helper functions for enhanced dashboard data

async fn get_enhanced_watchers(pool: &SqlitePool, user_id: i64) -> Result<Vec<WatcherSummary>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT 
            w.id, w.name, w.source_service, w.source_playlist_id, w.target_service, w.target_playlist_id,
            w.is_active, w.sync_frequency, w.last_sync_at, w.created_at, w.updated_at,
            so.status as last_sync_status,
            COUNT(so.id) as total_sync_operations,
            COUNT(CASE WHEN so.status = 'completed' THEN 1 END) as successful_syncs,
            SUM(so.songs_added + so.songs_removed) as total_songs
        FROM watchers w
        LEFT JOIN sync_operations so ON w.id = so.watcher_id
        WHERE w.user_id = ?
        GROUP BY w.id
        ORDER BY w.created_at DESC
        "#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let mut watchers = Vec::new();
    for row in rows {
        let total_ops: i64 = row.get::<Option<i64>, _>("total_sync_operations").unwrap_or(0);
        let successful_ops: i64 = row.get::<Option<i64>, _>("successful_syncs").unwrap_or(0);
        let sync_success_rate = if total_ops > 0 {
            Some(successful_ops as f32 / total_ops as f32 * 100.0)
        } else {
            None
        };

        watchers.push(WatcherSummary {
            id: row.get("id"),
            name: row.get("name"),
            source_service: row.get("source_service"),
            target_service: row.get("target_service"),
            is_active: row.get::<i64, _>("is_active") != 0,
            last_sync_at: row.get("last_sync_at"),
            last_sync_status: row.get("last_sync_status"),
            total_songs: row.get::<Option<i64>, _>("total_songs").map(|v| v as i32),
            sync_success_rate,
            created_at: row.get("created_at"),
            source_playlist_id: row.get("source_playlist_id"),
            target_playlist_id: row.get("target_playlist_id"),
            sync_frequency: row.get("sync_frequency"),
        });
    }

    Ok(watchers)
}

async fn get_watcher_status_detail(pool: &SqlitePool, user_id: i64, watcher_id: i64) -> Result<Option<WatcherStatusDetail>, sqlx::Error> {
    // First check if watcher belongs to user
    let watcher_check = sqlx::query("SELECT id FROM watchers WHERE id = ? AND user_id = ?")
        .bind(watcher_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

    if watcher_check.is_none() {
        return Ok(None);
    }

    // Get enhanced watcher info
    let enhanced_watchers = get_enhanced_watchers(pool, user_id).await?;
    let watcher_summary = enhanced_watchers.into_iter()
        .find(|w| w.id == watcher_id);

    let Some(watcher_summary) = watcher_summary else {
        return Ok(None);
    };

    // Get recent sync operations (last 10)
    let recent_operations = get_recent_sync_operations(pool, watcher_id, 10).await?;

    // Calculate statistics
    let statistics = calculate_watcher_statistics(pool, watcher_id).await?;

    Ok(Some(WatcherStatusDetail {
        watcher: watcher_summary,
        recent_sync_operations: recent_operations,
        statistics,
    }))
}

async fn get_watcher_sync_history(
    pool: &SqlitePool, 
    user_id: i64, 
    watcher_id: i64, 
    page: i32, 
    per_page: i32
) -> Result<Option<SyncHistoryResponse>, sqlx::Error> {
    // First check if watcher belongs to user and get name
    let watcher_info = sqlx::query("SELECT name FROM watchers WHERE id = ? AND user_id = ?")
        .bind(watcher_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

    let Some(watcher_info) = watcher_info else {
        return Ok(None);
    };

    // Get total count for pagination
    let total_count = sqlx::query("SELECT COUNT(*) as count FROM sync_operations WHERE watcher_id = ?")
        .bind(watcher_id)
        .fetch_one(pool)
        .await?;

    let total_count = total_count.get::<i64, _>("count") as i32;
    let total_pages = (total_count + per_page - 1) / per_page;

    // Get paginated operations
    let offset = (page - 1) * per_page;
    let operations = sqlx::query(
        r#"
        SELECT id, operation_type, status, songs_added, songs_removed, songs_failed, 
               error_message, started_at, completed_at
        FROM sync_operations
        WHERE watcher_id = ?
        ORDER BY started_at DESC
        LIMIT ? OFFSET ?
        "#
    )
    .bind(watcher_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let operations = operations.into_iter().map(|row| {
        SyncOperationSummary {
            id: row.get("id"),
            operation_type: row.get("operation_type"),
            status: row.get("status"),
            songs_added: row.get("songs_added"),
            songs_removed: row.get("songs_removed"),
            songs_failed: row.get("songs_failed"),
            error_message: row.get("error_message"),
            started_at: row.get("started_at"),
            completed_at: row.get("completed_at"),
        }
    }).collect();

    Ok(Some(SyncHistoryResponse {
        watcher_id,
        watcher_name: watcher_info.get("name"),
        operations,
        pagination: PaginationInfo {
            page,
            per_page,
            total_count,
            total_pages,
        },
    }))
}

async fn get_recent_sync_operations(pool: &SqlitePool, watcher_id: i64, limit: i32) -> Result<Vec<SyncOperationSummary>, sqlx::Error> {
    let operations = sqlx::query(
        r#"
        SELECT id, operation_type, status, songs_added, songs_removed, songs_failed, 
               error_message, started_at, completed_at
        FROM sync_operations
        WHERE watcher_id = ?
        ORDER BY started_at DESC
        LIMIT ?
        "#
    )
    .bind(watcher_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(operations.into_iter().map(|row| {
        SyncOperationSummary {
            id: row.get("id"),
            operation_type: row.get("operation_type"),
            status: row.get("status"),
            songs_added: row.get("songs_added"),
            songs_removed: row.get("songs_removed"),
            songs_failed: row.get("songs_failed"),
            error_message: row.get("error_message"),
            started_at: row.get("started_at"),
            completed_at: row.get("completed_at"),
        }
    }).collect())
}

async fn calculate_watcher_statistics(pool: &SqlitePool, watcher_id: i64) -> Result<WatcherStatistics, sqlx::Error> {
    let stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_operations,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_syncs,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
            SUM(songs_added + songs_removed) as total_songs,
            AVG(CASE 
                WHEN completed_at IS NOT NULL AND started_at IS NOT NULL THEN 
                    (julianday(completed_at) - julianday(started_at)) * 24 * 60 * 60
                ELSE NULL 
            END) as avg_sync_time_seconds
        FROM sync_operations
        WHERE watcher_id = ?
        "#
    )
    .bind(watcher_id)
    .fetch_one(pool)
    .await?;

    let total_operations = stats.get::<i64, _>("total_operations") as i32;
    let successful_syncs = stats.get::<Option<i64>, _>("successful_syncs").unwrap_or(0) as i32;
    let failed_syncs = stats.get::<Option<i64>, _>("failed_syncs").unwrap_or(0) as i32;
    let success_rate = if total_operations > 0 {
        successful_syncs as f32 / total_operations as f32 * 100.0
    } else {
        0.0
    };

    Ok(WatcherStatistics {
        total_sync_operations: total_operations,
        successful_syncs,
        failed_syncs,
        success_rate,
        total_songs_synced: stats.get::<Option<i64>, _>("total_songs").unwrap_or(0) as i32,
        average_sync_time_seconds: stats.get::<Option<f64>, _>("avg_sync_time_seconds").map(|v| v as f32),
    })
}
