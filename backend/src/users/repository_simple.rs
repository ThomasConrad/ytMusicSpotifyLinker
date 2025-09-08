use anyhow::Result;
use sqlx::SqlitePool;
use time::OffsetDateTime;

use crate::users::models::*;

pub struct WatcherRepository {
    pool: SqlitePool,
}

impl WatcherRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_watcher(&self, user_id: i64, request: CreateWatcherRequest) -> Result<Watcher> {
        let now = OffsetDateTime::now_utc();
        let sync_frequency = request.sync_frequency.unwrap_or(300);
        
        let row = sqlx::query!(
            r#"
            INSERT INTO watchers (user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, sync_frequency, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, is_active, sync_frequency, last_sync_at, created_at, updated_at
            "#,
            user_id, request.name, request.source_service, request.source_playlist_id, request.target_service, request.target_playlist_id, sync_frequency, now, now
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(Watcher {
            id: row.id.unwrap_or(0),
            user_id: row.user_id,
            name: row.name,
            source_service: row.source_service,
            source_playlist_id: row.source_playlist_id,
            target_service: row.target_service,
            target_playlist_id: row.target_playlist_id,
            is_active: row.is_active.unwrap_or(true),
            sync_frequency: row.sync_frequency.unwrap_or(300) as i32,
            last_sync_at: row.last_sync_at,
            created_at: row.created_at.unwrap_or_else(time::OffsetDateTime::now_utc),
            updated_at: row.updated_at.unwrap_or_else(time::OffsetDateTime::now_utc),
        })
    }

    pub async fn get_watchers_by_user(&self, user_id: i64) -> Result<Vec<Watcher>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE user_id = ? 
            ORDER BY created_at DESC
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        let mut watchers = Vec::new();
        for row in rows {
            watchers.push(Watcher {
                id: row.id.unwrap_or(0),
                user_id: row.user_id,
                name: row.name,
                source_service: row.source_service,
                source_playlist_id: row.source_playlist_id,
                target_service: row.target_service,
                target_playlist_id: row.target_playlist_id,
                is_active: row.is_active.unwrap_or(true),
                sync_frequency: row.sync_frequency.unwrap_or(300) as i32,
                last_sync_at: row.last_sync_at,
                created_at: row.created_at.unwrap_or_else(time::OffsetDateTime::now_utc),
                updated_at: row.updated_at.unwrap_or_else(time::OffsetDateTime::now_utc),
            });
        }

        Ok(watchers)
    }

    pub async fn get_watcher_by_id(&self, watcher_id: i64) -> Result<Option<Watcher>> {
        let row = sqlx::query!(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE id = ?
            "#,
            watcher_id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(Watcher {
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                source_service: row.source_service,
                source_playlist_id: row.source_playlist_id,
                target_service: row.target_service,
                target_playlist_id: row.target_playlist_id,
                is_active: row.is_active.unwrap_or(true),
                sync_frequency: row.sync_frequency.unwrap_or(300) as i32,
                last_sync_at: row.last_sync_at,
                created_at: row.created_at.unwrap_or_else(time::OffsetDateTime::now_utc),
                updated_at: row.updated_at.unwrap_or_else(time::OffsetDateTime::now_utc),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_watcher_by_name(&self, user_id: i64, name: &str) -> Result<Option<Watcher>> {
        let row = sqlx::query!(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE user_id = ? AND name = ?
            "#,
            user_id, name
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(Watcher {
                id: row.id.unwrap_or(0),
                user_id: row.user_id,
                name: row.name,
                source_service: row.source_service,
                source_playlist_id: row.source_playlist_id,
                target_service: row.target_service,
                target_playlist_id: row.target_playlist_id,
                is_active: row.is_active.unwrap_or(true),
                sync_frequency: row.sync_frequency.unwrap_or(300) as i32,
                last_sync_at: row.last_sync_at,
                created_at: row.created_at.unwrap_or_else(time::OffsetDateTime::now_utc),
                updated_at: row.updated_at.unwrap_or_else(time::OffsetDateTime::now_utc),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_watcher_status(&self, watcher_id: i64, is_active: bool) -> Result<()> {
        let now = OffsetDateTime::now_utc();
        sqlx::query!("UPDATE watchers SET is_active = ?, updated_at = ? WHERE id = ?", is_active, now, watcher_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn update_last_sync(&self, watcher_id: i64) -> Result<()> {
        let now = OffsetDateTime::now_utc();
        sqlx::query!("UPDATE watchers SET last_sync_at = ?, updated_at = ? WHERE id = ?", now, now, watcher_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_active_watchers(&self) -> Result<Vec<Watcher>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE is_active = 1
            ORDER BY last_sync_at ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut watchers = Vec::new();
        for row in rows {
            watchers.push(Watcher {
                id: row.id.unwrap_or(0),
                user_id: row.user_id,
                name: row.name,
                source_service: row.source_service,
                source_playlist_id: row.source_playlist_id,
                target_service: row.target_service,
                target_playlist_id: row.target_playlist_id,
                is_active: row.is_active.unwrap_or(true),
                sync_frequency: row.sync_frequency.unwrap_or(300) as i32,
                last_sync_at: row.last_sync_at,
                created_at: row.created_at.unwrap_or_else(time::OffsetDateTime::now_utc),
                updated_at: row.updated_at.unwrap_or_else(time::OffsetDateTime::now_utc),
            });
        }

        Ok(watchers)
    }
}

pub struct SyncRepository {
    pool: SqlitePool,
}

impl SyncRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_sync_operation(&self, watcher_id: i64, operation_type: &str) -> Result<SyncOperation> {
        let now = OffsetDateTime::now_utc();
        
        let row = sqlx::query!(
            r#"
            INSERT INTO sync_operations (watcher_id, operation_type, status, started_at)
            VALUES (?, ?, 'pending', ?)
            RETURNING id, watcher_id, operation_type, status, songs_added, songs_removed, songs_failed, error_message, started_at, completed_at
            "#,
            watcher_id, operation_type, now
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(SyncOperation {
            id: row.id.unwrap_or(0),
            watcher_id: row.watcher_id,
            operation_type: row.operation_type,
            status: row.status,
            songs_added: row.songs_added.unwrap_or(0) as i32,
            songs_removed: row.songs_removed.unwrap_or(0) as i32,
            songs_failed: row.songs_failed.unwrap_or(0) as i32,
            error_message: row.error_message,
            started_at: row.started_at.unwrap_or_else(time::OffsetDateTime::now_utc),
            completed_at: row.completed_at,
        })
    }

    pub async fn update_sync_operation(&self, sync_id: i64, status: &str, songs_added: i32, songs_removed: i32, songs_failed: i32, error_message: Option<&str>) -> Result<()> {
        let now = OffsetDateTime::now_utc();
        let completed_at = if status == "completed" || status == "failed" { Some(now) } else { None };
        
        sqlx::query!(
            r#"
            UPDATE sync_operations 
            SET status = ?, songs_added = ?, songs_removed = ?, songs_failed = ?, error_message = ?, completed_at = ?
            WHERE id = ?
            "#,
            status, songs_added, songs_removed, songs_failed, error_message, completed_at, sync_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_sync_operations_by_watcher(&self, watcher_id: i64, limit: i32) -> Result<Vec<SyncOperation>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, watcher_id, operation_type, status, songs_added, songs_removed, songs_failed, 
                   error_message, started_at, completed_at
            FROM sync_operations 
            WHERE watcher_id = ?
            ORDER BY started_at DESC
            LIMIT ?
            "#,
            watcher_id, limit
        )
        .fetch_all(&self.pool)
        .await?;

        let mut operations = Vec::new();
        for row in rows {
            operations.push(SyncOperation {
                id: row.id.unwrap_or(0),
                watcher_id: row.watcher_id,
                operation_type: row.operation_type,
                status: row.status,
                songs_added: row.songs_added.unwrap_or(0) as i32,
                songs_removed: row.songs_removed.unwrap_or(0) as i32,
                songs_failed: row.songs_failed.unwrap_or(0) as i32,
                error_message: row.error_message,
                started_at: row.started_at.unwrap_or_else(time::OffsetDateTime::now_utc),
                completed_at: row.completed_at,
            });
        }

        Ok(operations)
    }
}