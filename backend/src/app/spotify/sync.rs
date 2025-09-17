use anyhow::Result;
use rspotify::model::PlayableItem;
use rspotify::prelude::Id;
use sqlx::SqlitePool;
use time::OffsetDateTime;

use super::playlists::SpotifyPlaylistService;
use super::types::{SpotifyError, SpotifyResult};
use crate::app::songlink::{LinksResponse, Platform, SonglinkClient};
use crate::users::{
    models::{
        SongFailure, SongResponse, SyncOperation, SyncOperationResponse, SyncPreviewResponse,
    },
    repository::{SyncRepository, WatcherRepository},
};

/// Spotify synchronization service that integrates with the existing sync system
#[derive(Clone)]
pub struct SpotifySyncService {
    playlist_service: SpotifyPlaylistService,
    songlink_client: SonglinkClient,
    db: SqlitePool,
}

impl SpotifySyncService {
    /// Create a new Spotify sync service
    pub fn new(client_id: String, redirect_uri: String, db: SqlitePool) -> Self {
        let playlist_service = SpotifyPlaylistService::new(client_id, redirect_uri, db.clone());
        let songlink_client = SonglinkClient::new(None);

        Self {
            playlist_service,
            songlink_client,
            db,
        }
    }

    /// Preview sync operation between Spotify playlist and target service
    pub async fn preview_sync(
        &self,
        user_id: i64,
        source_playlist_id: &str,
        target_service: &str,
        _target_playlist_id: Option<&str>,
    ) -> SpotifyResult<SyncPreviewResponse> {
        // Get source playlist tracks from Spotify
        let source_tracks = self
            .playlist_service
            .get_playlist_tracks(user_id, source_playlist_id)
            .await?;

        let mut songs_to_add = Vec::new();
        let mut songs_failed = Vec::new();

        // Process each track for cross-platform matching
        for track_item in source_tracks {
            if let Some(PlayableItem::Track(full_track)) = track_item.track {
                let spotify_url = full_track
                    .external_urls
                    .get("spotify")
                    .cloned()
                    .unwrap_or_else(|| {
                        format!(
                            "spotify:track:{}",
                            full_track
                                .id
                                .as_ref()
                                .map(|id| id.id())
                                .unwrap_or("unknown")
                        )
                    });

                match self
                    .find_track_on_target_service(&spotify_url, target_service)
                    .await
                {
                    Ok(Some(target_track_info)) => {
                        songs_to_add.push(SongResponse {
                            id: 0, // Will be populated from database
                            service: target_service.to_string(),
                            external_id: target_track_info.external_id,
                            title: full_track.name.clone(),
                            artist: full_track.artists.first().map(|a| a.name.clone()),
                            album: Some(full_track.album.name.clone()),
                            duration_ms: Some(full_track.duration.num_milliseconds() as i32),
                        });
                    }
                    Ok(None) => {
                        songs_failed.push(SongFailure {
                            title: full_track.name,
                            artist: full_track.artists.first().map(|a| a.name.clone()),
                            error: format!("Track not found on {}", target_service),
                        });
                    }
                    Err(e) => {
                        songs_failed.push(SongFailure {
                            title: full_track.name,
                            artist: full_track.artists.first().map(|a| a.name.clone()),
                            error: format!("Error finding track: {}", e),
                        });
                    }
                }
            }
        }

        // TODO: If target_playlist_id is provided, also check what songs to remove
        let songs_to_remove = Vec::new(); // For now, we only support adding songs

        Ok(SyncPreviewResponse {
            songs_to_add,
            songs_to_remove,
            songs_failed,
        })
    }

    /// Execute sync operation for a watcher
    pub async fn sync_playlist_to_target(
        &self,
        watcher_id: i64,
    ) -> SpotifyResult<SyncOperationResponse> {
        let watcher_repo = WatcherRepository::new(self.db.clone());
        let sync_repo = SyncRepository::new(self.db.clone());

        // Get watcher details
        let watcher = watcher_repo
            .get_watcher_by_id(watcher_id)
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?
            .ok_or_else(|| SpotifyError::ValidationError("Watcher not found".to_string()))?;

        // Create sync operation record
        let sync_op = sync_repo
            .create_sync_operation(watcher_id, "spotify_sync")
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        let mut songs_added = 0;
        let songs_failed;
        let mut error_message = None;

        // Get user ID from watcher (assuming it's stored or can be derived)
        // For now, we'll need to get this from the watcher or user context
        let user_id = watcher.user_id; // Assuming watcher has user_id field

        // Execute sync preview to get songs to add
        match self
            .preview_sync(
                user_id,
                &watcher.source_playlist_id,
                &watcher.target_service,
                watcher.target_playlist_id.as_deref(),
            )
            .await
        {
            Ok(preview) => {
                songs_added = preview.songs_to_add.len() as i32;
                songs_failed = preview.songs_failed.len() as i32;

                // TODO: Actually add songs to target playlist
                // This would require target service-specific implementation

                if !preview.songs_failed.is_empty() {
                    error_message = Some(format!(
                        "Failed to match {} tracks",
                        preview.songs_failed.len()
                    ));
                }
            }
            Err(e) => {
                error_message = Some(e.to_string());
                songs_failed = -1; // Indicates complete failure
            }
        }

        // Update sync operation with results
        let final_status = if error_message.is_none() && songs_failed == 0 {
            "completed"
        } else if songs_added > 0 {
            "completed_with_errors"
        } else {
            "failed"
        };

        sync_repo
            .update_sync_operation(
                sync_op.id,
                final_status,
                songs_added,
                0, // songs_removed - not implemented yet
                songs_failed,
                error_message.as_deref(),
            )
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        // Create the response from the original sync_op with updated values
        let updated_sync_op = SyncOperation {
            id: sync_op.id,
            watcher_id: sync_op.watcher_id,
            operation_type: sync_op.operation_type,
            status: final_status.to_string(),
            songs_added,
            songs_removed: 0,
            songs_failed,
            error_message: error_message.clone(),
            started_at: sync_op.started_at,
            completed_at: if final_status != "in_progress" {
                Some(OffsetDateTime::now_utc())
            } else {
                None
            },
        };

        // Update watcher last sync time
        watcher_repo
            .update_last_sync(watcher_id)
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        Ok(SyncOperationResponse {
            id: updated_sync_op.id,
            operation_type: updated_sync_op.operation_type,
            status: updated_sync_op.status,
            songs_added: updated_sync_op.songs_added,
            songs_removed: updated_sync_op.songs_removed,
            songs_failed: updated_sync_op.songs_failed,
            error_message: updated_sync_op.error_message,
            started_at: updated_sync_op.started_at,
            completed_at: updated_sync_op.completed_at,
        })
    }

    /// Find a track on the target service using Songlink API
    async fn find_track_on_target_service(
        &self,
        spotify_url: &str,
        target_service: &str,
    ) -> Result<Option<TargetTrackInfo>> {
        let target_platform = match target_service {
            "youtube_music" => Platform::YoutubeMusic,
            "apple_music" => Platform::AppleMusic,
            "deezer" => Platform::Deezer,
            "tidal" => Platform::Tidal,
            "amazon_music" => Platform::AmazonMusic,
            _ => return Ok(None),
        };

        // Use Songlink to find the track on other platforms
        match self
            .songlink_client
            .fetch_links(spotify_url, Some("US"), Some(true))
            .await
        {
            Ok(response) => {
                if let Some(link) = response.links_by_platform.get(&target_platform) {
                    // Extract the external ID from the URL or entity
                    let external_id = self.extract_external_id_from_link(
                        &response,
                        &link.entity_unique_id,
                        target_service,
                    )?;

                    Ok(Some(TargetTrackInfo {
                        external_id,
                        url: link.url.0.to_string(),
                    }))
                } else {
                    Ok(None)
                }
            }
            Err(e) => {
                // Log the error but don't fail the entire sync
                tracing::warn!("Songlink API error for {}: {}", spotify_url, e);
                Ok(None)
            }
        }
    }

    /// Extract external ID from Songlink response
    fn extract_external_id_from_link(
        &self,
        response: &LinksResponse,
        entity_unique_id: &str,
        target_service: &str,
    ) -> Result<String> {
        if let Some(entity) = response.entities_by_unique_id.get(entity_unique_id) {
            // The entity ID should be the external ID for the target service
            Ok(entity.id.clone())
        } else {
            // Fallback: try to extract ID from URL
            // This is service-specific logic that would need to be expanded
            Ok(format!("unknown_{}", target_service))
        }
    }

    /// Get sync history for a specific watcher
    pub async fn get_sync_history(
        &self,
        watcher_id: i64,
        limit: Option<i32>,
    ) -> SpotifyResult<Vec<SyncOperationResponse>> {
        let sync_repo = SyncRepository::new(self.db.clone());

        let sync_operations = sync_repo
            .get_sync_operations_by_watcher(watcher_id, limit.unwrap_or(10))
            .await
            .map_err(|e| SpotifyError::ApiError(e.to_string()))?;

        let responses = sync_operations
            .into_iter()
            .map(|op| SyncOperationResponse {
                id: op.id,
                operation_type: op.operation_type,
                status: op.status,
                songs_added: op.songs_added,
                songs_removed: op.songs_removed,
                songs_failed: op.songs_failed,
                error_message: op.error_message,
                started_at: op.started_at,
                completed_at: op.completed_at,
            })
            .collect();

        Ok(responses)
    }

    /// Clear cached data for a user
    pub async fn clear_user_cache(&self, user_id: i64) {
        self.playlist_service.clear_user_cache(user_id).await;
    }
}

/// Information about a track found on the target service
#[derive(Debug, Clone)]
struct TargetTrackInfo {
    external_id: String,
    #[allow(dead_code)]
    url: String,
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Create required tables for testing
        sqlx::query(
            r#"
            CREATE TABLE watchers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                source_service TEXT NOT NULL,
                source_playlist_id TEXT NOT NULL,
                target_service TEXT NOT NULL,
                target_playlist_id TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                sync_frequency INTEGER DEFAULT 300,
                last_sync_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create watchers table");

        sqlx::query(
            r#"
            CREATE TABLE sync_operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                watcher_id INTEGER NOT NULL,
                operation_type TEXT NOT NULL,
                status TEXT NOT NULL,
                songs_added INTEGER DEFAULT 0,
                songs_removed INTEGER DEFAULT 0,
                songs_failed INTEGER DEFAULT 0,
                error_message TEXT,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (watcher_id) REFERENCES watchers (id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create sync_operations table");

        pool
    }

    #[tokio::test]
    async fn test_sync_service_creation() {
        let db = setup_test_db().await;
        let service = SpotifySyncService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            db,
        );

        // Test that service was created successfully
        assert!(!service.db.is_closed());
    }

    #[tokio::test]
    async fn test_extract_external_id_from_link() {
        let db = setup_test_db().await;
        let service = SpotifySyncService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            db,
        );

        // Create a mock LinksResponse
        let mut entities = HashMap::new();
        entities.insert(
            "YOUTUBE_MUSIC::test123".to_string(),
            crate::app::songlink::Entity {
                id: "test123".to_string(),
                entity_type: crate::app::songlink::EntityType::Song,
                title: Some("Test Song".to_string()),
                artist_name: Some("Test Artist".to_string()),
                thumbnail_url: None,
                thumbnail_width: None,
                thumbnail_height: None,
                api_provider: crate::app::songlink::APIProvider::Youtube,
                platforms: vec![Platform::YoutubeMusic],
            },
        );

        let response = LinksResponse {
            entity_unique_id: "SPOTIFY::spotify_id".to_string(),
            user_country: "US".to_string(),
            page_url: crate::app::songlink::UrlWrapper(
                url::Url::parse("https://song.link/test").unwrap(),
            ),
            links_by_platform: HashMap::new(),
            entities_by_unique_id: entities,
        };

        let result = service.extract_external_id_from_link(
            &response,
            "YOUTUBE_MUSIC::test123",
            "youtube_music",
        );

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test123");
    }
}
