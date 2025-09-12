use futures_util::StreamExt;
use rspotify::prelude::*;
use rspotify::{AuthCodePkceSpotify, Config, Credentials, OAuth, Token};
use sqlx::SqlitePool;
use std::collections::HashSet;

use super::auth::SpotifyAuthService;
use super::types::{SpotifyError, SpotifyResult};

/// High-level Spotify client for API interactions
#[derive(Debug, Clone)]
pub struct SpotifyClient {
    auth_service: SpotifyAuthService,
    client_id: String,
    redirect_uri: String,
}

impl SpotifyClient {
    /// Create a new Spotify client
    pub fn new(client_id: String, redirect_uri: String, db: SqlitePool) -> Self {
        let auth_service = SpotifyAuthService::new(client_id.clone(), redirect_uri.clone(), db);

        Self {
            auth_service,
            client_id,
            redirect_uri,
        }
    }

    /// Get an authenticated Spotify client for a user
    pub async fn get_authenticated_client(
        &self,
        user_id: i64,
    ) -> SpotifyResult<AuthCodePkceSpotify> {
        // Get access token
        let access_token = self.auth_service.get_access_token(user_id).await?;

        // Create Spotify client
        let creds = Credentials::new(&self.client_id, "");
        let oauth = OAuth {
            redirect_uri: self.redirect_uri.clone(),
            scopes: HashSet::new(),
            state: "".to_string(),
            proxies: None,
        };

        let config = Config {
            token_cached: true,
            token_refreshing: false,
            ..Default::default()
        };

        let spotify = AuthCodePkceSpotify::with_config(creds, oauth, config);

        // Set the access token
        let token = Token {
            access_token,
            expires_in: chrono::TimeDelta::seconds(3600), // Default to 1 hour
            expires_at: Some(chrono::Utc::now() + chrono::TimeDelta::seconds(3600)),
            refresh_token: None, // Not needed for API calls
            scopes: HashSet::new(),
        };

        *spotify.token.lock().await.unwrap() = Some(token);

        Ok(spotify)
    }

    /// Check if client is authenticated for a user
    pub async fn is_authenticated(&self, user_id: i64) -> SpotifyResult<bool> {
        self.auth_service.has_valid_credentials(user_id).await
    }

    /// Refresh tokens if needed and get authenticated client
    pub async fn get_authenticated_client_with_refresh(
        &self,
        user_id: i64,
    ) -> SpotifyResult<AuthCodePkceSpotify> {
        // Check if tokens are valid
        if !self.auth_service.has_valid_credentials(user_id).await? {
            // Try to refresh tokens
            self.auth_service.refresh_tokens(user_id).await?;
        }

        // Get authenticated client
        self.get_authenticated_client(user_id).await
    }

    /// Test connection by fetching current user profile
    pub async fn test_connection(&self, user_id: i64) -> SpotifyResult<bool> {
        match self.get_authenticated_client_with_refresh(user_id).await {
            Ok(spotify) => match spotify.current_user().await {
                Ok(_) => Ok(true),
                Err(_) => Ok(false),
            },
            Err(_) => Ok(false),
        }
    }

    /// Get the current user's profile
    pub async fn get_current_user(
        &self,
        user_id: i64,
    ) -> SpotifyResult<rspotify::model::PrivateUser> {
        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;
        spotify
            .current_user()
            .await
            .map_err(|e| SpotifyError::ApiError(format!("Failed to fetch user profile: {}", e)))
    }

    /// Get user's playlists
    pub async fn get_user_playlists(
        &self,
        user_id: i64,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> SpotifyResult<rspotify::model::Page<rspotify::model::SimplifiedPlaylist>> {
        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;
        let limit = limit.unwrap_or(50).min(50); // Spotify API limit
        let offset = offset.unwrap_or(0);

        spotify
            .current_user_playlists_manual(Some(limit), Some(offset))
            .await
            .map_err(|e| SpotifyError::ApiError(format!("Failed to fetch playlists: {}", e)))
    }

    /// Get playlist tracks
    pub async fn get_playlist_tracks(
        &self,
        user_id: i64,
        playlist_id: &str,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> SpotifyResult<rspotify::model::Page<rspotify::model::PlaylistItem>> {
        use rspotify::model::PlaylistId;

        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;
        let limit = limit.unwrap_or(100).min(100); // Spotify API limit
        let offset = offset.unwrap_or(0);

        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::InvalidInput(format!("Invalid playlist ID: {}", e)))?;

        spotify
            .playlist_items_manual(playlist_id, None, None, Some(limit), Some(offset))
            .await
            .map_err(|e| SpotifyError::ApiError(format!("Failed to fetch playlist tracks: {}", e)))
    }

    /// Add tracks to a playlist
    pub async fn add_tracks_to_playlist(
        &self,
        user_id: i64,
        playlist_id: &str,
        track_uris: Vec<String>,
    ) -> SpotifyResult<()> {
        use rspotify::model::{PlaylistId, TrackId};

        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;

        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::InvalidInput(format!("Invalid playlist ID: {}", e)))?;

        // Convert string URIs to TrackIds
        let track_ids: Result<Vec<_>, _> = track_uris
            .iter()
            .map(|uri| TrackId::from_uri(uri))
            .collect();

        let track_ids = track_ids
            .map_err(|e| SpotifyError::InvalidInput(format!("Invalid track URI: {}", e)))?;

        // Spotify API allows max 100 tracks per request
        use rspotify::model::PlayableId;
        for chunk in track_ids.chunks(100) {
            let playable_ids: Vec<PlayableId> = chunk
                .iter()
                .map(|id| PlayableId::Track(id.clone()))
                .collect();
            spotify
                .playlist_add_items(playlist_id.clone(), playable_ids, None)
                .await
                .map_err(|e| {
                    SpotifyError::ApiError(format!("Failed to add tracks to playlist: {}", e))
                })?;
        }

        Ok(())
    }

    /// Remove tracks from a playlist
    pub async fn remove_tracks_from_playlist(
        &self,
        user_id: i64,
        playlist_id: &str,
        track_uris: Vec<String>,
    ) -> SpotifyResult<()> {
        use rspotify::model::{PlaylistId, TrackId};

        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;

        let playlist_id = PlaylistId::from_id(playlist_id)
            .map_err(|e| SpotifyError::InvalidInput(format!("Invalid playlist ID: {}", e)))?;

        // Convert string URIs to TrackIds
        let track_ids: Result<Vec<_>, _> = track_uris
            .iter()
            .map(|uri| TrackId::from_uri(uri))
            .collect();

        let track_ids = track_ids
            .map_err(|e| SpotifyError::InvalidInput(format!("Invalid track URI: {}", e)))?;

        // Spotify API allows max 100 tracks per request
        use rspotify::model::PlayableId;
        for chunk in track_ids.chunks(100) {
            let playable_ids: Vec<PlayableId> = chunk
                .iter()
                .map(|id| PlayableId::Track(id.clone()))
                .collect();
            spotify
                .playlist_remove_all_occurrences_of_items(playlist_id.clone(), playable_ids, None)
                .await
                .map_err(|e| {
                    SpotifyError::ApiError(format!("Failed to remove tracks from playlist: {}", e))
                })?;
        }

        Ok(())
    }

    /// Search for tracks
    pub async fn search_tracks(
        &self,
        user_id: i64,
        query: &str,
        limit: Option<u32>,
    ) -> SpotifyResult<rspotify::model::Page<rspotify::model::FullTrack>> {
        use rspotify::model::SearchType;

        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;
        let limit = limit.unwrap_or(20).min(50); // Spotify API limit

        let search_result = spotify
            .search(query, SearchType::Track, None, None, Some(limit), Some(0))
            .await
            .map_err(|e| SpotifyError::ApiError(format!("Failed to search tracks: {}", e)))?;

        match search_result {
            rspotify::model::SearchResult::Tracks(page) => Ok(page),
            _ => Err(SpotifyError::ApiError(
                "Unexpected search result format".to_string(),
            )),
        }
    }

    /// Create a new playlist
    pub async fn create_playlist(
        &self,
        user_id: i64,
        name: &str,
        description: Option<&str>,
        public: bool,
    ) -> SpotifyResult<rspotify::model::FullPlaylist> {
        let spotify = self.get_authenticated_client_with_refresh(user_id).await?;

        // Get current user ID
        let user = self.get_current_user(user_id).await?;
        let user_id_str = user.id.id();

        use rspotify::model::UserId;
        let user_id_obj = UserId::from_id(user_id_str)
            .map_err(|e| SpotifyError::InvalidInput(format!("Invalid user ID: {}", e)))?;

        spotify
            .user_playlist_create(user_id_obj, name, Some(public), Some(false), description)
            .await
            .map_err(|e| SpotifyError::ApiError(format!("Failed to create playlist: {}", e)))
    }

    /// Get authentication service (for use in API handlers)
    pub fn auth_service(&self) -> &SpotifyAuthService {
        &self.auth_service
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;
    use sqlx::sqlite::SqlitePoolOptions;
    use time::OffsetDateTime;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Create tables
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
    async fn test_client_creation() {
        let pool = setup_test_db().await;
        let client = SpotifyClient::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool,
        );

        assert_eq!(client.client_id, "test_client_id");
        assert_eq!(client.redirect_uri, "http://localhost:3000/callback");
    }

    #[tokio::test]
    async fn test_is_authenticated_no_credentials() {
        let pool = setup_test_db().await;
        let client = SpotifyClient::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool,
        );

        let is_auth = client.is_authenticated(1).await.unwrap();
        assert!(!is_auth);
    }

    #[tokio::test]
    async fn test_is_authenticated_with_valid_credentials() {
        let pool = setup_test_db().await;
        let client = SpotifyClient::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool.clone(),
        );

        // Insert valid credential
        let now = OffsetDateTime::now_utc();
        let expires_at = now + time::Duration::hours(1);

        sqlx::query!(
            "INSERT INTO user_credentials (user_id, service, access_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            1, "spotify", "test_token", expires_at, now, now
        )
        .execute(&pool)
        .await
        .unwrap();

        let is_auth = client.is_authenticated(1).await.unwrap();
        assert!(is_auth);
    }

    #[tokio::test]
    async fn test_is_authenticated_with_expired_credentials() {
        let pool = setup_test_db().await;
        let client = SpotifyClient::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool.clone(),
        );

        // Insert expired credential
        let now = OffsetDateTime::now_utc();
        let expires_at = now - time::Duration::hours(1); // Expired

        sqlx::query!(
            "INSERT INTO user_credentials (user_id, service, access_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            1, "spotify", "test_token", expires_at, now, now
        )
        .execute(&pool)
        .await
        .unwrap();

        let is_auth = client.is_authenticated(1).await.unwrap();
        assert!(!is_auth);
    }

    #[tokio::test]
    async fn test_spotify_api_connection_with_credentials() {
        // Load environment variables from .env file if present
        let _ = dotenvy::dotenv();

        let client_id = match std::env::var("SPOTIFY_CLIENT_ID") {
            Ok(id) => id,
            Err(_) => {
                println!("Skipping test - SPOTIFY_CLIENT_ID not set");
                return;
            }
        };

        let client_secret = match std::env::var("SPOTIFY_CLIENT_SECRET") {
            Ok(secret) => secret,
            Err(_) => {
                println!("Skipping test - SPOTIFY_CLIENT_SECRET not set");
                return;
            }
        };

        // Test basic Spotify API connectivity without user authentication
        // This tests if we can create a client credentials flow connection
        use rspotify::{ClientCredsSpotify, Credentials};

        let creds = Credentials::new(&client_id, &client_secret);
        let spotify = ClientCredsSpotify::new(creds);

        // Request a token using client credentials flow
        match spotify.request_token().await {
            Ok(_) => {
                println!("✓ Successfully obtained access token from Spotify API");

                // Try to make a simple API call to verify connection
                // Use featured_playlists as it's a simple async method
                let mut stream = spotify.new_releases(None);
                match stream.next().await {
                    Some(Ok(_album)) => println!("✓ Successfully made API call to Spotify"),
                    Some(Err(e)) => println!("⚠ Token obtained but API call failed: {}", e),
                    None => println!("⚠ No albums returned from Spotify"),
                }
            }
            Err(e) => {
                panic!("Failed to connect to Spotify API: {}. Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.", e);
            }
        }
    }

    #[tokio::test]
    async fn test_spotify_auth_flow_creation() {
        // This tests that we can create the auth flow without environment variables
        use rspotify::{AuthCodePkceSpotify, Config, Credentials, OAuth};
        use std::collections::HashSet;

        let client_id = "test_client_id";
        let redirect_uri = "http://localhost:3000/callback";

        let creds = Credentials::new(client_id, "");
        let oauth = OAuth {
            redirect_uri: redirect_uri.to_string(),
            scopes: HashSet::from([
                "user-read-private".to_string(),
                "user-read-email".to_string(),
                "playlist-read-private".to_string(),
                "playlist-modify-private".to_string(),
                "playlist-modify-public".to_string(),
            ]),
            state: "test_state".to_string(),
            proxies: None,
        };

        let config = Config {
            token_cached: false,
            token_refreshing: false,
            ..Default::default()
        };

        let mut spotify = AuthCodePkceSpotify::with_config(creds, oauth, config);

        // Test that we can generate an auth URL
        let auth_url = spotify.get_authorize_url(None).unwrap();
        assert!(auth_url.contains("spotify.com"));
        assert!(auth_url.contains(client_id));
        assert!(auth_url.contains("redirect_uri"));
        println!("✓ Successfully created Spotify auth URL: {}", auth_url);
    }
}
