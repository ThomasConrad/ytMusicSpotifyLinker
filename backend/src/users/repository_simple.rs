use anyhow::Result;
use sqlx::{SqlitePool, Row};
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
        
        let row = sqlx::query(
            r#"
            INSERT INTO watchers (user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, sync_frequency, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, is_active, sync_frequency, last_sync_at, created_at, updated_at
            "#
        )
        .bind(user_id)
        .bind(&request.name)
        .bind(&request.source_service)
        .bind(&request.source_playlist_id)
        .bind(&request.target_service)
        .bind(&request.target_playlist_id)
        .bind(sync_frequency)
        .bind(now)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(Watcher {
            id: row.get("id"),
            user_id: row.get("user_id"),
            name: row.get("name"),
            source_service: row.get("source_service"),
            source_playlist_id: row.get("source_playlist_id"),
            target_service: row.get("target_service"),
            target_playlist_id: row.get("target_playlist_id"),
            is_active: row.get::<i64, _>("is_active") != 0,
            sync_frequency: row.get("sync_frequency"),
            last_sync_at: row.get("last_sync_at"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_watchers_by_user(&self, user_id: i64) -> Result<Vec<Watcher>> {
        let rows = sqlx::query(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE user_id = ? 
            ORDER BY created_at DESC
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let mut watchers = Vec::new();
        for row in rows {
            watchers.push(Watcher {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                source_service: row.get("source_service"),
                source_playlist_id: row.get("source_playlist_id"),
                target_service: row.get("target_service"),
                target_playlist_id: row.get("target_playlist_id"),
                is_active: row.get::<i64, _>("is_active") != 0,
                sync_frequency: row.get("sync_frequency"),
                last_sync_at: row.get("last_sync_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            });
        }

        Ok(watchers)
    }

    pub async fn get_watcher_by_id(&self, watcher_id: i64) -> Result<Option<Watcher>> {
        let row = sqlx::query(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE id = ?
            "#
        )
        .bind(watcher_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(Watcher {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                source_service: row.get("source_service"),
                source_playlist_id: row.get("source_playlist_id"),
                target_service: row.get("target_service"),
                target_playlist_id: row.get("target_playlist_id"),
                is_active: row.get::<i64, _>("is_active") != 0,
                sync_frequency: row.get("sync_frequency"),
                last_sync_at: row.get("last_sync_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_watcher_by_name(&self, user_id: i64, name: &str) -> Result<Option<Watcher>> {
        let row = sqlx::query(
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE user_id = ? AND name = ?
            "#
        )
        .bind(user_id)
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(Watcher {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                source_service: row.get("source_service"),
                source_playlist_id: row.get("source_playlist_id"),
                target_service: row.get("target_service"),
                target_playlist_id: row.get("target_playlist_id"),
                is_active: row.get::<i64, _>("is_active") != 0,
                sync_frequency: row.get("sync_frequency"),
                last_sync_at: row.get("last_sync_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_watcher_status(&self, watcher_id: i64, is_active: bool) -> Result<()> {
        sqlx::query("UPDATE watchers SET is_active = ?, updated_at = ? WHERE id = ?")
            .bind(is_active)
            .bind(OffsetDateTime::now_utc())
            .bind(watcher_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn update_last_sync(&self, watcher_id: i64) -> Result<()> {
        let now = OffsetDateTime::now_utc();
        sqlx::query("UPDATE watchers SET last_sync_at = ?, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(now)
            .bind(watcher_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_active_watchers(&self) -> Result<Vec<Watcher>> {
        let rows = sqlx::query(
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
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                source_service: row.get("source_service"),
                source_playlist_id: row.get("source_playlist_id"),
                target_service: row.get("target_service"),
                target_playlist_id: row.get("target_playlist_id"),
                is_active: row.get::<i64, _>("is_active") != 0,
                sync_frequency: row.get("sync_frequency"),
                last_sync_at: row.get("last_sync_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
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
        
        let row = sqlx::query(
            r#"
            INSERT INTO sync_operations (watcher_id, operation_type, status, started_at)
            VALUES (?, ?, 'pending', ?)
            RETURNING id, watcher_id, operation_type, status, songs_added, songs_removed, songs_failed, error_message, started_at, completed_at
            "#
        )
        .bind(watcher_id)
        .bind(operation_type)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(SyncOperation {
            id: row.get("id"),
            watcher_id: row.get("watcher_id"),
            operation_type: row.get("operation_type"),
            status: row.get("status"),
            songs_added: row.get("songs_added"),
            songs_removed: row.get("songs_removed"),
            songs_failed: row.get("songs_failed"),
            error_message: row.get("error_message"),
            started_at: row.get("started_at"),
            completed_at: row.get("completed_at"),
        })
    }

    pub async fn update_sync_operation(&self, sync_id: i64, status: &str, songs_added: i32, songs_removed: i32, songs_failed: i32, error_message: Option<&str>) -> Result<()> {
        let now = OffsetDateTime::now_utc();
        let completed_at = if status == "completed" || status == "failed" { Some(now) } else { None };
        
        sqlx::query(
            r#"
            UPDATE sync_operations 
            SET status = ?, songs_added = ?, songs_removed = ?, songs_failed = ?, error_message = ?, completed_at = ?
            WHERE id = ?
            "#
        )
        .bind(status)
        .bind(songs_added)
        .bind(songs_removed)
        .bind(songs_failed)
        .bind(error_message)
        .bind(completed_at)
        .bind(sync_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_sync_operations_by_watcher(&self, watcher_id: i64, limit: i32) -> Result<Vec<SyncOperation>> {
        let rows = sqlx::query(
            r#"
            SELECT id, watcher_id, operation_type, status, songs_added, songs_removed, songs_failed, 
                   error_message, started_at, completed_at
            FROM sync_operations 
            WHERE watcher_id = ?
            ORDER BY started_at DESC
            LIMIT ?
            "#
        )
        .bind(watcher_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let mut operations = Vec::new();
        for row in rows {
            operations.push(SyncOperation {
                id: row.get("id"),
                watcher_id: row.get("watcher_id"),
                operation_type: row.get("operation_type"),
                status: row.get("status"),
                songs_added: row.get("songs_added"),
                songs_removed: row.get("songs_removed"),
                songs_failed: row.get("songs_failed"),
                error_message: row.get("error_message"),
                started_at: row.get("started_at"),
                completed_at: row.get("completed_at"),
            });
        }

        Ok(operations)
    }
}