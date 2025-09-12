use rspotify::model::{
    FullPlaylist, PlayableId, PlaylistId, PlaylistItem, SimplifiedPlaylist, TrackId,
};
use rspotify::prelude::*;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use time::OffsetDateTime;
use tokio::sync::Mutex;

use super::client::SpotifyClient;
use super::types::{SpotifyError, SpotifyResult};
use crate::users::models::Playlist;

/// Cache entry for playlist data
#[derive(Debug, Clone)]
struct PlaylistCacheEntry {
    playlist: FullPlaylist,
    cached_at: OffsetDateTime,
    #[allow(dead_code)]
    tracks_cached: bool,
}

/// Cache entry for track data
#[derive(Debug, Clone)]
struct TrackCacheEntry {
    tracks: Vec<PlaylistItem>,
    cached_at: OffsetDateTime,
}

/// Spotify playlist service for high-level playlist operations with caching
#[derive(Debug, Clone)]
pub struct SpotifyPlaylistService {
    client: SpotifyClient,
    db: SqlitePool,
    playlist_cache: Arc<Mutex<HashMap<String, PlaylistCacheEntry>>>,
    track_cache: Arc<Mutex<HashMap<String, TrackCacheEntry>>>,
    cache_duration_seconds: i64,
}

impl SpotifyPlaylistService {
    /// Create a new Spotify playlist service
    pub fn new(client_id: String, redirect_uri: String, db: SqlitePool) -> Self {
        let client = SpotifyClient::new(client_id, redirect_uri, db.clone());

        Self {
            client,
            db,
            playlist_cache: Arc::new(Mutex::new(HashMap::new())),
            track_cache: Arc::new(Mutex::new(HashMap::new())),
            cache_duration_seconds: 300, // 5 minutes default cache
        }
    }

    /// Set cache duration in seconds
    pub fn with_cache_duration(mut self, duration_seconds: i64) -> Self {
        self.cache_duration_seconds = duration_seconds;
        self
    }

    /// Get user's playlists with caching
    pub async fn get_user_playlists(&self, user_id: i64) -> SpotifyResult<Vec<SimplifiedPlaylist>> {
        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;

        // Get current user's playlists
        let mut playlists = Vec::new();
        let mut offset = 0;
        let limit = 50;

        loop {
            let playlist_page = spotify
                .current_user_playlists_manual(Some(limit), Some(offset))
                .await
                .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

            if playlist_page.items.is_empty() {
                break;
            }

            playlists.extend(playlist_page.items);
            offset += limit;

            // Spotify API pagination
            if playlist_page.next.is_none() {
                break;
            }
        }

        Ok(playlists)
    }

    /// Get detailed playlist information with caching
    pub async fn get_playlist(
        &self,
        user_id: i64,
        playlist_id: &str,
    ) -> SpotifyResult<FullPlaylist> {
        let cache_key = format!("{}:{}", user_id, playlist_id);
        let now = OffsetDateTime::now_utc();

        // Check cache first
        {
            let cache = self.playlist_cache.lock().await;
            if let Some(entry) = cache.get(&cache_key) {
                let age_seconds = (now - entry.cached_at).whole_seconds();
                if age_seconds < self.cache_duration_seconds {
                    return Ok(entry.playlist.clone());
                }
            }
        }

        // Cache miss or expired, fetch from Spotify
        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;
        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid playlist ID: {}", e)))?;

        let playlist = spotify
            .playlist(playlist_id, None, None)
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        // Update cache
        {
            let mut cache = self.playlist_cache.lock().await;
            cache.insert(
                cache_key,
                PlaylistCacheEntry {
                    playlist: playlist.clone(),
                    cached_at: now,
                    tracks_cached: false,
                },
            );
        }

        Ok(playlist)
    }

    /// Get playlist tracks with caching and batch processing
    pub async fn get_playlist_tracks(
        &self,
        user_id: i64,
        playlist_id: &str,
    ) -> SpotifyResult<Vec<PlaylistItem>> {
        let cache_key = format!("{}:{}", user_id, playlist_id);
        let now = OffsetDateTime::now_utc();

        // Check cache first
        {
            let cache = self.track_cache.lock().await;
            if let Some(entry) = cache.get(&cache_key) {
                let age_seconds = (now - entry.cached_at).whole_seconds();
                if age_seconds < self.cache_duration_seconds {
                    return Ok(entry.tracks.clone());
                }
            }
        }

        // Cache miss or expired, fetch from Spotify
        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;
        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid playlist ID: {}", e)))?;

        let mut tracks = Vec::new();
        let mut offset = 0;
        let limit = 100; // Maximum allowed by Spotify API

        loop {
            let track_page = spotify
                .playlist_items_manual(playlist_id.clone(), None, None, Some(limit), Some(offset))
                .await
                .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

            if track_page.items.is_empty() {
                break;
            }

            tracks.extend(track_page.items);
            offset += limit;

            if track_page.next.is_none() {
                break;
            }
        }

        // Update cache
        {
            let mut cache = self.track_cache.lock().await;
            cache.insert(
                cache_key,
                TrackCacheEntry {
                    tracks: tracks.clone(),
                    cached_at: now,
                },
            );
        }

        Ok(tracks)
    }

    /// Add tracks to a playlist in batches
    pub async fn add_tracks_to_playlist(
        &self,
        user_id: i64,
        playlist_id: &str,
        track_ids: &[String],
    ) -> SpotifyResult<()> {
        if track_ids.is_empty() {
            return Ok(());
        }

        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;
        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid playlist ID: {}", e)))?;

        // Convert track IDs
        let track_ids: Result<Vec<TrackId>, _> =
            track_ids.iter().map(TrackId::from_id).collect();
        let track_ids = track_ids
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid track ID: {}", e)))?;

        // Add tracks in batches (Spotify allows max 100 per request)
        const BATCH_SIZE: usize = 100;

        for chunk in track_ids.chunks(BATCH_SIZE) {
            let playable_ids: Vec<PlayableId> =
                chunk.iter().map(|t| PlayableId::Track(t.clone())).collect();
            spotify
                .playlist_add_items(playlist_id.clone(), playable_ids, None)
                .await
                .map_err(|e| SpotifyError::ApiError(e.to_string()))?;
        }

        // Invalidate cache
        let cache_key = format!("{}:{}", user_id, playlist_id.id());
        {
            let mut cache = self.track_cache.lock().await;
            cache.remove(&cache_key);
        }

        Ok(())
    }

    /// Remove tracks from a playlist in batches
    pub async fn remove_tracks_from_playlist(
        &self,
        user_id: i64,
        playlist_id: &str,
        track_ids: &[String],
    ) -> SpotifyResult<()> {
        if track_ids.is_empty() {
            return Ok(());
        }

        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;
        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid playlist ID: {}", e)))?;

        // Convert track IDs
        let track_ids: Result<Vec<TrackId>, _> =
            track_ids.iter().map(TrackId::from_id).collect();
        let track_ids = track_ids
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid track ID: {}", e)))?;

        // Remove tracks in batches
        const BATCH_SIZE: usize = 100;

        for chunk in track_ids.chunks(BATCH_SIZE) {
            let playable_ids: Vec<PlayableId> =
                chunk.iter().map(|t| PlayableId::Track(t.clone())).collect();
            spotify
                .playlist_remove_all_occurrences_of_items(playlist_id.clone(), playable_ids, None)
                .await
                .map_err(|e| SpotifyError::ApiError(e.to_string()))?;
        }

        // Invalidate cache
        let cache_key = format!("{}:{}", user_id, playlist_id.id());
        {
            let mut cache = self.track_cache.lock().await;
            cache.remove(&cache_key);
        }

        Ok(())
    }

    /// Create a new playlist
    pub async fn create_playlist(
        &self,
        user_id: i64,
        name: &str,
        description: Option<&str>,
        public: bool,
    ) -> SpotifyResult<FullPlaylist> {
        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;

        // Get current user to create playlist for
        let current_user = spotify
            .current_user()
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        let playlist = spotify
            .user_playlist_create(current_user.id, name, Some(public), None, description)
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        Ok(playlist)
    }

    /// Update playlist details
    pub async fn update_playlist(
        &self,
        user_id: i64,
        playlist_id: &str,
        name: Option<&str>,
        description: Option<&str>,
        public: Option<bool>,
    ) -> SpotifyResult<()> {
        let spotify = self
            .client
            .get_authenticated_client_with_refresh(user_id)
            .await?;
        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::ValidationError(format!("Invalid playlist ID: {}", e)))?;

        spotify
            .playlist_change_detail(playlist_id.clone(), name, public, description, None)
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        // Invalidate playlist cache
        let cache_key = format!("{}:{}", user_id, playlist_id.id());
        {
            let mut cache = self.playlist_cache.lock().await;
            cache.remove(&cache_key);
        }

        Ok(())
    }

    /// Sync playlist to database for local storage and caching
    pub async fn sync_playlist_to_database(
        &self,
        user_id: i64,
        playlist_id: &str,
    ) -> SpotifyResult<()> {
        let playlist = self.get_playlist(user_id, playlist_id).await?;
        let tracks = self.get_playlist_tracks(user_id, playlist_id).await?;

        let now = OffsetDateTime::now_utc();

        // Store playlist in database
        let playlist_id_str = playlist.id.id();
        let owner_id_str = playlist.owner.id.id();
        let total_tracks = tracks.len() as i64;
        sqlx::query!(
            r#"
            INSERT OR REPLACE INTO playlists 
            (service, external_id, name, description, total_tracks, is_public, owner_id, updated_at)
            VALUES ('spotify', ?, ?, ?, ?, ?, ?, ?)
            "#,
            playlist_id_str,
            playlist.name,
            playlist.description,
            total_tracks,
            playlist.public,
            owner_id_str,
            now
        )
        .execute(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        // Get the database playlist ID
        let playlist_record = sqlx::query!(
            "SELECT id FROM playlists WHERE service = 'spotify' AND external_id = ?",
            playlist_id_str
        )
        .fetch_one(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        // Clear existing playlist_songs relationships
        sqlx::query!(
            "DELETE FROM playlist_songs WHERE playlist_id = ?",
            playlist_record.id
        )
        .execute(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        // Store tracks and relationships
        for (position, item) in tracks.iter().enumerate() {
            if let Some(rspotify::model::PlayableItem::Track(full_track)) = &item.track {
                    // Store song
                    let track_id_opt = full_track.id.as_ref().map(|id| id.id());
                    let artist_name_opt = full_track.artists.first().map(|a| a.name.as_str());
                    let duration_ms = full_track.duration.num_milliseconds();

                    sqlx::query!(
                        r#"
                        INSERT OR REPLACE INTO songs 
                        (service, external_id, title, artist, album, duration_ms, updated_at)
                        VALUES ('spotify', ?, ?, ?, ?, ?, ?)
                        "#,
                        track_id_opt,
                        full_track.name,
                        artist_name_opt,
                        full_track.album.name,
                        duration_ms,
                        now
                    )
                    .execute(&self.db)
                    .await
                    .map_err(SpotifyError::DatabaseError)?;

                    // Get song database ID
                    if let Some(track_id) = &full_track.id {
                        let track_id_str = track_id.id();
                        let song_record = sqlx::query!(
                            "SELECT id FROM songs WHERE service = 'spotify' AND external_id = ?",
                            track_id_str
                        )
                        .fetch_one(&self.db)
                        .await
                        .map_err(SpotifyError::DatabaseError)?;

                        // Create playlist-song relationship
                        let position_i64 = position as i64;
                        sqlx::query!(
                            r#"
                            INSERT INTO playlist_songs (playlist_id, song_id, position, added_at)
                            VALUES (?, ?, ?, ?)
                            "#,
                            playlist_record.id,
                            song_record.id,
                            position_i64,
                            now
                        )
                        .execute(&self.db)
                        .await
                        .map_err(SpotifyError::DatabaseError)?;
                    }
            }
        }

        Ok(())
    }

    /// Get playlist from database
    pub async fn get_playlist_from_database(
        &self,
        playlist_id: &str,
    ) -> SpotifyResult<Option<Playlist>> {
        let record = sqlx::query_as!(
            Playlist,
            r#"
            SELECT id, service, external_id, name, description, total_tracks, is_public, owner_id, created_at, updated_at
            FROM playlists 
            WHERE service = 'spotify' AND external_id = ?
            "#,
            playlist_id
        )
        .fetch_optional(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        Ok(record)
    }

    /// Clear all caches
    pub async fn clear_cache(&self) {
        let mut playlist_cache = self.playlist_cache.lock().await;
        let mut track_cache = self.track_cache.lock().await;
        playlist_cache.clear();
        track_cache.clear();
    }

    /// Clear cache for specific user
    pub async fn clear_user_cache(&self, user_id: i64) {
        let user_prefix = format!("{}:", user_id);

        {
            let mut cache = self.playlist_cache.lock().await;
            cache.retain(|key, _| !key.starts_with(&user_prefix));
        }

        {
            let mut cache = self.track_cache.lock().await;
            cache.retain(|key, _| !key.starts_with(&user_prefix));
        }
    }

    /// Get cache statistics
    pub async fn get_cache_stats(&self) -> (usize, usize) {
        let playlist_count = self.playlist_cache.lock().await.len();
        let track_count = self.track_cache.lock().await.len();
        (playlist_count, track_count)
    }
}

// Note: Default implementation not provided as this service requires
// database connection and Spotify credentials

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use tokio;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL,
                external_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                total_tracks INTEGER DEFAULT 0,
                is_public BOOLEAN DEFAULT FALSE,
                owner_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(service, external_id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create playlists table");

        sqlx::query(
            r#"
            CREATE TABLE songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL,
                external_id TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT,
                album TEXT,
                duration_ms INTEGER,
                songlink_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(service, external_id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create songs table");

        sqlx::query(
            r#"
            CREATE TABLE playlist_songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL,
                song_id INTEGER NOT NULL,
                position INTEGER NOT NULL,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
                UNIQUE(playlist_id, song_id, position)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create playlist_songs table");

        pool
    }

    #[tokio::test]
    async fn test_service_creation() {
        let db = setup_test_db().await;
        let service = SpotifyPlaylistService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            db,
        );

        assert_eq!(service.cache_duration_seconds, 300);
        let (playlist_cache_size, track_cache_size) = service.get_cache_stats().await;
        assert_eq!(playlist_cache_size, 0);
        assert_eq!(track_cache_size, 0);
    }

    #[tokio::test]
    async fn test_cache_duration_configuration() {
        let db = setup_test_db().await;
        let service = SpotifyPlaylistService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            db,
        )
        .with_cache_duration(600);

        assert_eq!(service.cache_duration_seconds, 600);
    }

    #[tokio::test]
    async fn test_cache_clearing() {
        let db = setup_test_db().await;
        let service = SpotifyPlaylistService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            db,
        );

        // Clear all caches (should not panic even when empty)
        service.clear_cache().await;

        // Clear user cache (should not panic even when empty)
        service.clear_user_cache(123).await;

        let (playlist_cache_size, track_cache_size) = service.get_cache_stats().await;
        assert_eq!(playlist_cache_size, 0);
        assert_eq!(track_cache_size, 0);
    }

    #[tokio::test]
    async fn test_database_playlist_operations() {
        let db = setup_test_db().await;
        let service = SpotifyPlaylistService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            db,
        );

        // Test getting non-existent playlist
        let result = service
            .get_playlist_from_database("non_existent_playlist")
            .await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }
}
