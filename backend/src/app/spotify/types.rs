use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

/// Spotify user information from the API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyUser {
    pub id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub followers: Option<SpotifyFollowers>,
    pub images: Vec<SpotifyImage>,
}

/// Spotify followers count
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyFollowers {
    pub total: i32,
}

/// Spotify image object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyImage {
    pub url: String,
    pub height: Option<i32>,
    pub width: Option<i32>,
}

/// Spotify playlist representation for service layer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyPlaylist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub track_count: i32,
    pub is_public: bool,
    pub owner_id: String,
    pub owner_display_name: String,
    pub image_url: Option<String>,
    pub external_url: String,
    pub tracks: Option<Vec<SpotifyTrack>>, // Lazy loaded
}

/// Spotify track representation for service layer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyTrack {
    pub id: String,
    pub name: String,
    pub artists: Vec<String>,
    pub album: Option<String>,
    pub duration_ms: Option<i32>,
    pub external_url: String,
    pub uri: String,
    pub is_playable: bool,
    pub added_at: Option<OffsetDateTime>,
}

/// OAuth flow state stored in memory during authentication
#[derive(Debug, Clone)]
pub struct OAuthState {
    pub state: String,
    pub code_verifier: String,
    pub user_id: i64,
    pub expires_at: OffsetDateTime,
}

/// OAuth token response from Spotify
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub scope: String,
    pub expires_in: i32,
    pub refresh_token: Option<String>,
}

/// Request/Response DTOs for API endpoints
#[derive(Debug, Serialize, Deserialize)]
pub struct SpotifyConnectionRequest {
    pub redirect_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpotifyConnectionResponse {
    pub authorization_url: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpotifyCallbackRequest {
    pub code: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpotifyPlaylistResponse {
    pub playlists: Vec<SpotifyPlaylist>,
    pub total: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpotifyTrackResponse {
    pub tracks: Vec<SpotifyTrack>,
    pub total: i32,
}

/// Error types for Spotify operations
#[derive(Debug, thiserror::Error)]
pub enum SpotifyError {
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("API request failed: {0}")]
    ApiRequestFailed(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Invalid OAuth state")]
    InvalidOAuthState,

    #[error("Token expired")]
    TokenExpired,

    #[error("Insufficient permissions: {0}")]
    InsufficientPermissions(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Playlist not found: {0}")]
    PlaylistNotFound(String),

    #[error("Track not found: {0}")]
    TrackNotFound(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Generic error: {0}")]
    Generic(String),
}

/// Result type for Spotify operations
pub type SpotifyResult<T> = Result<T, SpotifyError>;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_spotify_track_serialization() {
        let track = SpotifyTrack {
            id: "4iV5W9uYEdYUVa79Axb7Rh".to_string(),
            name: "Never Gonna Give You Up".to_string(),
            artists: vec!["Rick Astley".to_string()],
            album: Some("Whenever You Need Somebody".to_string()),
            duration_ms: Some(213000),
            external_url: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh".to_string(),
            uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh".to_string(),
            is_playable: true,
            added_at: None,
        };

        let serialized = serde_json::to_string(&track).expect("Should serialize");
        let deserialized: SpotifyTrack =
            serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(track.id, deserialized.id);
        assert_eq!(track.name, deserialized.name);
        assert_eq!(track.artists, deserialized.artists);
    }

    #[test]
    fn test_spotify_playlist_serialization() {
        let playlist = SpotifyPlaylist {
            id: "37i9dQZF1DXcBWIGoYBM5M".to_string(),
            name: "Today's Top Hits".to_string(),
            description: Some("The most played songs right now".to_string()),
            track_count: 50,
            is_public: true,
            owner_id: "spotify".to_string(),
            owner_display_name: "Spotify".to_string(),
            image_url: Some(
                "https://i.scdn.co/image/ab67706f00000003c13b4f1dffebed6b639c6ef4".to_string(),
            ),
            external_url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M".to_string(),
            tracks: None,
        };

        let serialized = serde_json::to_string(&playlist).expect("Should serialize");
        let deserialized: SpotifyPlaylist =
            serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(playlist.id, deserialized.id);
        assert_eq!(playlist.name, deserialized.name);
        assert_eq!(playlist.track_count, deserialized.track_count);
    }

    #[test]
    fn test_token_response_serialization() {
        let token_json = r#"{
            "access_token": "BQDYPfKKX5sYI123example",
            "token_type": "Bearer",
            "scope": "playlist-read-private",
            "expires_in": 3600,
            "refresh_token": "AQBuBOdZ9example"
        }"#;

        let token: TokenResponse = serde_json::from_str(token_json).expect("Should deserialize");

        assert_eq!(token.access_token, "BQDYPfKKX5sYI123example");
        assert_eq!(token.token_type, "Bearer");
        assert_eq!(token.scope, "playlist-read-private");
        assert_eq!(token.expires_in, 3600);
        assert_eq!(token.refresh_token, Some("AQBuBOdZ9example".to_string()));
    }

    #[test]
    fn test_oauth_state_creation() {
        let state = OAuthState {
            state: "random_state_string".to_string(),
            code_verifier: "code_verifier_123".to_string(),
            user_id: 42,
            expires_at: time::OffsetDateTime::now_utc() + time::Duration::minutes(10),
        };

        assert_eq!(state.user_id, 42);
        assert!(!state.state.is_empty());
        assert!(!state.code_verifier.is_empty());
    }
}
