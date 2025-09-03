use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserCredential {
    pub id: i64,
    pub user_id: i64,
    pub service: String,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<OffsetDateTime>,
    pub token_scope: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Watcher {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub source_service: String,
    pub source_playlist_id: String,
    pub target_service: String,
    pub target_playlist_id: Option<String>,
    pub is_active: bool,
    pub sync_frequency: i32,
    pub last_sync_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub service: String,
    pub external_id: String,
    pub name: String,
    pub description: Option<String>,
    pub total_tracks: i32,
    pub is_public: bool,
    pub owner_id: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Song {
    pub id: i64,
    pub service: String,
    pub external_id: String,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_ms: Option<i32>,
    pub songlink_data: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PlaylistSong {
    pub id: i64,
    pub playlist_id: i64,
    pub song_id: i64,
    pub position: i32,
    pub added_at: OffsetDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SyncOperation {
    pub id: i64,
    pub watcher_id: i64,
    pub operation_type: String,
    pub status: String,
    pub songs_added: i32,
    pub songs_removed: i32,
    pub songs_failed: i32,
    pub error_message: Option<String>,
    pub started_at: OffsetDateTime,
    pub completed_at: Option<OffsetDateTime>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SyncResult {
    pub id: i64,
    pub sync_operation_id: i64,
    pub source_song_id: i64,
    pub target_song_id: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: OffsetDateTime,
}

// DTOs for API requests/responses
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWatcherRequest {
    pub name: String,
    pub source_service: String,
    pub source_playlist_id: String,
    pub target_service: String,
    pub target_playlist_id: Option<String>,
    pub sync_frequency: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WatcherResponse {
    pub id: i64,
    pub name: String,
    pub source_service: String,
    pub source_playlist_id: String,
    pub target_service: String,
    pub target_playlist_id: Option<String>,
    pub is_active: bool,
    pub sync_frequency: i32,
    pub last_sync_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncPreviewResponse {
    pub songs_to_add: Vec<SongResponse>,
    pub songs_to_remove: Vec<SongResponse>,
    pub songs_failed: Vec<SongFailure>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SongResponse {
    pub id: i64,
    pub service: String,
    pub external_id: String,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_ms: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SongFailure {
    pub title: String,
    pub artist: Option<String>,
    pub error: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncOperationResponse {
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