use anyhow::Result;
use sqlx::SqlitePool;
#[allow(unused_imports)]
use time::OffsetDateTime;

use crate::users::models::*;

pub struct WatcherRepository {
    pool: SqlitePool,
}

impl WatcherRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_watcher(
        &self,
        user_id: i64,
        request: CreateWatcherRequest,
    ) -> Result<Watcher> {
        let sync_frequency = request.sync_frequency.unwrap_or(300);

        let watcher = sqlx::query_as!(
            Watcher,
            r#"
            INSERT INTO watchers (user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, sync_frequency, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'), datetime('now'))
            RETURNING id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                      is_active, sync_frequency, last_sync_at, created_at as "created_at: OffsetDateTime", updated_at as "updated_at: OffsetDateTime"
            "#,
            user_id,
            request.name,
            request.source_service,
            request.source_playlist_id,
            request.target_service,
            request.target_playlist_id,
            sync_frequency
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(watcher)
    }

    pub async fn get_watchers_by_user(&self, user_id: i64) -> Result<Vec<Watcher>> {
        let rows = sqlx::query_as!(
            Watcher,
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE user_id = ?1 
            ORDER BY created_at DESC
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn get_watcher_by_id(&self, watcher_id: i64) -> Result<Option<Watcher>> {
        let row = sqlx::query_as!(
            Watcher,
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE id = ?1
            "#,
            watcher_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn get_watcher_by_name(&self, user_id: i64, name: &str) -> Result<Option<Watcher>> {
        let row = sqlx::query_as!(
            Watcher,
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE user_id = ?1 AND name = ?2
            "#,
            user_id,
            name
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn update_watcher_status(&self, watcher_id: i64, is_active: bool) -> Result<()> {
        sqlx::query!(
            "UPDATE watchers SET is_active = ?1, updated_at = date('now') WHERE id = ?2",
            is_active,
            watcher_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_last_sync(&self, watcher_id: i64) -> Result<()> {
        sqlx::query!(
            "UPDATE watchers SET last_sync_at = date('now'), updated_at = date('now') WHERE id = ?1",
            watcher_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_active_watchers(&self) -> Result<Vec<Watcher>> {
        let rows = sqlx::query_as!(
            Watcher,
            r#"
            SELECT id, user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, 
                   is_active, sync_frequency, last_sync_at, created_at, updated_at
            FROM watchers 
            WHERE is_active = 1
            ORDER BY last_sync_at ASC NULLS FIRST
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }
}

pub struct SongRepository {
    pool: SqlitePool,
}

impl SongRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn upsert_song(
        &self,
        service: &str,
        external_id: &str,
        title: &str,
        artist: Option<&str>,
        album: Option<&str>,
        duration_ms: Option<i32>,
        songlink_data: Option<&str>,
    ) -> Result<Song> {
        let song = sqlx::query_as!(
            Song,
            r#"
            INSERT INTO songs (service, external_id, title, artist, album, duration_ms, songlink_data, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, date('now'), date('now'))
            ON CONFLICT(service, external_id) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                duration_ms = excluded.duration_ms,
                songlink_data = excluded.songlink_data,
                updated_at = date('now')
            RETURNING id, service, external_id, title, artist, album, duration_ms, songlink_data, created_at, updated_at
            "#,
            service,
            external_id,
            title,
            artist,
            album,
            duration_ms,
            songlink_data
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(song)
    }

    pub async fn get_song_by_service_id(
        &self,
        service: &str,
        external_id: &str,
    ) -> Result<Option<Song>> {
        let row = sqlx::query_as!(
            Song,
            r#"
            SELECT id, service, external_id, title, artist, album, duration_ms, songlink_data, created_at, updated_at
            FROM songs 
            WHERE service = ?1 AND external_id = ?2
            "#,
            service,
            external_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }
}

pub struct SyncRepository {
    pool: SqlitePool,
}

impl SyncRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_sync_operation(
        &self,
        watcher_id: i64,
        operation_type: &str,
    ) -> Result<SyncOperation> {
        let sync_operation = sqlx::query_as!(
            SyncOperation,
            r#"
            INSERT INTO sync_operations (watcher_id, operation_type, status, started_at)
            VALUES (?1, ?2, 'pending', date('now'))
            RETURNING id, watcher_id, operation_type, status, songs_added, songs_removed, songs_failed, error_message, started_at, completed_at
            "#,
            watcher_id,
            operation_type
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(sync_operation)
    }

    pub async fn update_sync_operation(
        &self,
        sync_id: i64,
        status: &str,
        songs_added: i32,
        songs_removed: i32,
        songs_failed: i32,
        error_message: Option<&str>,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE sync_operations 
            SET status = ?1, songs_added = ?2, songs_removed = ?3, songs_failed = ?4, error_message = ?5, 
                completed_at = CASE WHEN ?1 IN ('completed', 'failed') THEN date('now') ELSE NULL END
            WHERE id = ?6
            "#,
            status,
            songs_added,
            songs_removed,
            songs_failed,
            error_message,
            sync_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_sync_operations_by_watcher(
        &self,
        watcher_id: i64,
        limit: i32,
    ) -> Result<Vec<SyncOperation>> {
        let rows = sqlx::query_as!(
            SyncOperation,
            r#"
            SELECT id, watcher_id, operation_type, status, 
                   songs_added as "songs_added: i32", 
                   songs_removed as "songs_removed: i32", 
                   songs_failed as "songs_failed: i32", 
                   error_message, started_at, completed_at
            FROM sync_operations 
            WHERE watcher_id = ?1 
            ORDER BY started_at DESC 
            LIMIT ?2
            "#,
            watcher_id,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }
}
