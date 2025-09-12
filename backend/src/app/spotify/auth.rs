use std::collections::{HashMap, HashSet};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::{thread_rng, Rng};
use rspotify::prelude::*;
use rspotify::{AuthCodePkceSpotify, Config, Credentials, OAuth, Token};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use time::OffsetDateTime;
use uuid::Uuid;

use super::types::{OAuthState, SpotifyError, SpotifyResult};
use crate::users::models::UserCredential;

/// Generate a code verifier for PKCE
fn generate_code_verifier() -> String {
    let mut rng = thread_rng();
    (0..128)
        .map(|_| {
            let idx = rng.gen_range(0..ALPHABET.len());
            ALPHABET[idx] as char
        })
        .collect()
}

/// Generate a code challenge from a code verifier
fn generate_code_challenge(code_verifier: &str) -> String {
    let digest = Sha256::digest(code_verifier.as_bytes());
    BASE64
        .encode(digest)
        .trim_end_matches('=') // Remove padding
        .replace('+', "-")
        .replace('/', "_")
}

const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/// Spotify authentication service for OAuth 2.0 PKCE flow
#[derive(Debug, Clone)]
pub struct SpotifyAuthService {
    client_id: String,
    redirect_uri: String,
    db: SqlitePool,
    // In-memory storage for OAuth states (in production, use Redis or similar)
    oauth_states: HashMap<String, OAuthState>,
}

impl SpotifyAuthService {
    /// Create a new Spotify authentication service
    pub fn new(client_id: String, redirect_uri: String, db: SqlitePool) -> Self {
        Self {
            client_id,
            redirect_uri,
            db,
            oauth_states: HashMap::new(),
        }
    }

    /// Start the OAuth 2.0 PKCE authorization flow
    pub async fn start_auth_flow(&mut self, user_id: i64) -> SpotifyResult<String> {
        // Generate OAuth state and PKCE code verifier
        let state = Uuid::new_v4().to_string();
        let code_verifier = generate_code_verifier();
        let _code_challenge = generate_code_challenge(&code_verifier);

        // Store OAuth state in memory (expires in 10 minutes)
        let oauth_state = OAuthState {
            state: state.clone(),
            code_verifier: code_verifier.clone(),
            user_id,
            expires_at: OffsetDateTime::now_utc() + time::Duration::minutes(10),
        };
        self.oauth_states.insert(state.clone(), oauth_state);

        // Create Spotify OAuth configuration
        let creds = Credentials::new(&self.client_id, "");
        let oauth = OAuth {
            redirect_uri: self.redirect_uri.clone(),
            scopes: vec![
                "playlist-read-private".to_string(),
                "playlist-read-collaborative".to_string(),
                "playlist-modify-private".to_string(),
                "playlist-modify-public".to_string(),
                "user-read-private".to_string(),
            ]
            .into_iter()
            .collect(),
            state: state.clone(),
            proxies: None,
        };

        let config = Config {
            token_cached: false,
            token_refreshing: false,
            ..Default::default()
        };

        let mut spotify = AuthCodePkceSpotify::with_config(creds, oauth, config);

        // Generate authorization URL
        let auth_url = spotify.get_authorize_url(None).map_err(|e| {
            SpotifyError::AuthenticationFailed(format!("Failed to generate auth URL: {}", e))
        })?;

        Ok(auth_url)
    }

    /// Complete the OAuth 2.0 flow and store tokens
    pub async fn complete_auth_flow(
        &mut self,
        code: &str,
        state: &str,
    ) -> SpotifyResult<UserCredential> {
        // Validate and retrieve OAuth state
        let oauth_state = self
            .oauth_states
            .remove(state)
            .ok_or(SpotifyError::InvalidOAuthState)?;

        // Check if state has expired
        if OffsetDateTime::now_utc() > oauth_state.expires_at {
            return Err(SpotifyError::InvalidOAuthState);
        }

        // Create Spotify client for token exchange
        let creds = Credentials::new(&self.client_id, "");
        let oauth = OAuth {
            redirect_uri: self.redirect_uri.clone(),
            scopes: vec![
                "playlist-read-private".to_string(),
                "playlist-read-collaborative".to_string(),
                "playlist-modify-private".to_string(),
                "playlist-modify-public".to_string(),
                "user-read-private".to_string(),
            ]
            .into_iter()
            .collect(),
            state: state.to_string(),
            proxies: None,
        };

        let config = Config {
            token_cached: false,
            token_refreshing: false,
            ..Default::default()
        };

        let spotify = AuthCodePkceSpotify::with_config(creds, oauth, config);

        // Exchange authorization code for tokens
        spotify.request_token(code).await.map_err(|e| {
            SpotifyError::AuthenticationFailed(format!("Token exchange failed: {}", e))
        })?;

        // Get the token from Spotify client
        let token = spotify
            .token
            .lock()
            .await
            .unwrap()
            .as_ref()
            .ok_or(SpotifyError::AuthenticationFailed(
                "No token received".to_string(),
            ))?
            .clone();

        // Calculate expiry time
        let expires_at = Some(
            OffsetDateTime::now_utc() + time::Duration::seconds(token.expires_in.num_seconds()),
        );

        // Encrypt tokens before storage (simple base64 for now, use proper encryption in production)
        let encrypted_access_token = BASE64.encode(&token.access_token);
        let encrypted_refresh_token = token.refresh_token.as_ref().map(|t| BASE64.encode(t));

        // Create scope string
        let scope_string = Some(token.scopes.iter().cloned().collect::<Vec<_>>().join(" "));

        // Store credentials in database
        let user_credential = self
            .store_credentials(
                oauth_state.user_id,
                "spotify",
                &encrypted_access_token,
                encrypted_refresh_token.as_deref(),
                expires_at,
                scope_string.as_deref(),
            )
            .await?;

        Ok(user_credential)
    }

    /// Refresh expired access token
    pub async fn refresh_tokens(&self, user_id: i64) -> SpotifyResult<bool> {
        // Get existing credentials
        let credential = self.get_user_credential(user_id, "spotify").await?.ok_or(
            SpotifyError::AuthenticationFailed("No Spotify credentials found".to_string()),
        )?;

        let refresh_token = credential
            .refresh_token
            .as_ref()
            .ok_or(SpotifyError::TokenExpired)?;

        // Decrypt refresh token
        let decrypted_refresh_token = String::from_utf8(
            BASE64
                .decode(refresh_token)
                .map_err(|e| SpotifyError::Generic(format!("Token decryption failed: {}", e)))?,
        )
        .map_err(|e| SpotifyError::Generic(format!("Token decoding failed: {}", e)))?;

        // Create Spotify client with refresh token
        let creds = Credentials::new(&self.client_id, "");
        let oauth = OAuth {
            redirect_uri: self.redirect_uri.clone(),
            scopes: HashSet::new(),
            state: "".to_string(),
            proxies: None,
        };

        let config = Config {
            token_cached: false,
            token_refreshing: true,
            ..Default::default()
        };

        let spotify = AuthCodePkceSpotify::with_config(creds, oauth, config);

        // Set the current token
        let current_token = Token {
            access_token: "".to_string(), // Will be refreshed
            expires_in: chrono::TimeDelta::seconds(0),
            expires_at: None,
            refresh_token: Some(decrypted_refresh_token),
            scopes: HashSet::new(),
        };

        *spotify.token.lock().await.unwrap() = Some(current_token);

        // Refresh the token
        spotify.refresh_token().await.map_err(|e| {
            SpotifyError::AuthenticationFailed(format!("Token refresh failed: {}", e))
        })?;

        // Get the new token
        let new_token = spotify
            .token
            .lock()
            .await
            .unwrap()
            .as_ref()
            .ok_or(SpotifyError::AuthenticationFailed(
                "No token received after refresh".to_string(),
            ))?
            .clone();

        // Calculate new expiry time
        let expires_at = Some(
            OffsetDateTime::now_utc() + time::Duration::seconds(new_token.expires_in.num_seconds()),
        );

        // Encrypt new access token
        let encrypted_access_token = BASE64.encode(&new_token.access_token);
        let encrypted_refresh_token = new_token.refresh_token.as_ref().map(|t| BASE64.encode(t));

        // Update credentials in database
        self.update_credentials(
            user_id,
            "spotify",
            &encrypted_access_token,
            encrypted_refresh_token.as_deref(),
            expires_at,
        )
        .await?;

        Ok(true)
    }

    /// Revoke tokens and remove stored credentials
    pub async fn revoke_tokens(&self, user_id: i64) -> SpotifyResult<()> {
        // Remove from database
        sqlx::query!(
            "DELETE FROM user_credentials WHERE user_id = ? AND service = ?",
            user_id,
            "spotify"
        )
        .execute(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        Ok(())
    }

    /// Check if user has valid Spotify credentials
    pub async fn has_valid_credentials(&self, user_id: i64) -> SpotifyResult<bool> {
        match self.get_user_credential(user_id, "spotify").await? {
            Some(credential) => {
                // Check if token is expired
                if let Some(expires_at) = credential.expires_at {
                    Ok(OffsetDateTime::now_utc() < expires_at)
                } else {
                    Ok(true) // No expiry set, assume valid
                }
            }
            None => Ok(false),
        }
    }

    /// Get decrypted access token for API calls
    pub async fn get_access_token(&self, user_id: i64) -> SpotifyResult<String> {
        let credential = self.get_user_credential(user_id, "spotify").await?.ok_or(
            SpotifyError::AuthenticationFailed("No Spotify credentials found".to_string()),
        )?;

        // Check if token is expired
        if let Some(expires_at) = credential.expires_at {
            if OffsetDateTime::now_utc() >= expires_at {
                return Err(SpotifyError::TokenExpired);
            }
        }

        // Decrypt access token
        let decrypted_token = String::from_utf8(
            BASE64
                .decode(&credential.access_token)
                .map_err(|e| SpotifyError::Generic(format!("Token decryption failed: {}", e)))?,
        )
        .map_err(|e| SpotifyError::Generic(format!("Token decoding failed: {}", e)))?;

        Ok(decrypted_token)
    }

    /// Store user credentials in database
    async fn store_credentials(
        &self,
        user_id: i64,
        service: &str,
        access_token: &str,
        refresh_token: Option<&str>,
        expires_at: Option<OffsetDateTime>,
        token_scope: Option<&str>,
    ) -> SpotifyResult<UserCredential> {
        let now = OffsetDateTime::now_utc();

        let credential = sqlx::query_as!(
            UserCredential,
            r#"
            INSERT INTO user_credentials (user_id, service, access_token, refresh_token, expires_at, token_scope, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, service) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                expires_at = excluded.expires_at,
                token_scope = excluded.token_scope,
                updated_at = excluded.updated_at
            RETURNING *
            "#,
            user_id, service, access_token, refresh_token, expires_at, token_scope, now, now
        )
        .fetch_one(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        Ok(credential)
    }

    /// Update existing credentials
    async fn update_credentials(
        &self,
        user_id: i64,
        service: &str,
        access_token: &str,
        refresh_token: Option<&str>,
        expires_at: Option<OffsetDateTime>,
    ) -> SpotifyResult<()> {
        let now = OffsetDateTime::now_utc();

        sqlx::query!(
            r#"
            UPDATE user_credentials 
            SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
            WHERE user_id = ? AND service = ?
            "#,
            access_token,
            refresh_token,
            expires_at,
            now,
            user_id,
            service
        )
        .execute(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        Ok(())
    }

    /// Get user credential from database
    async fn get_user_credential(
        &self,
        user_id: i64,
        service: &str,
    ) -> SpotifyResult<Option<UserCredential>> {
        let credential = sqlx::query_as!(
            UserCredential,
            "SELECT * FROM user_credentials WHERE user_id = ? AND service = ?",
            user_id,
            service
        )
        .fetch_optional(&self.db)
        .await
        .map_err(SpotifyError::DatabaseError)?;

        Ok(credential)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

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
    async fn test_oauth_state_management() {
        let pool = setup_test_db().await;
        let mut auth_service = SpotifyAuthService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool,
        );

        // Test starting auth flow
        let auth_url = auth_service.start_auth_flow(1).await.unwrap();
        assert!(auth_url.contains("spotify.com/authorize"));
        assert!(auth_url.contains("client_id=test_client_id"));
        assert!(auth_url.contains("response_type=code"));
        assert!(auth_url.contains("code_challenge_method=S256"));

        // Verify OAuth state is stored
        assert_eq!(auth_service.oauth_states.len(), 1);
    }

    #[tokio::test]
    async fn test_credential_storage() {
        let pool = setup_test_db().await;
        let auth_service = SpotifyAuthService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool,
        );

        // Test storing credentials
        let credential = auth_service
            .store_credentials(
                1,
                "spotify",
                "encrypted_access_token",
                Some("encrypted_refresh_token"),
                Some(OffsetDateTime::now_utc() + time::Duration::hours(1)),
                Some("playlist-read-private playlist-modify-private"),
            )
            .await
            .unwrap();

        assert_eq!(credential.user_id, 1);
        assert_eq!(credential.service, "spotify");
        assert_eq!(credential.access_token, "encrypted_access_token");
    }

    #[tokio::test]
    async fn test_token_expiry_check() {
        let pool = setup_test_db().await;
        let auth_service = SpotifyAuthService::new(
            "test_client_id".to_string(),
            "http://localhost:3000/callback".to_string(),
            pool,
        );

        // Store expired credential
        auth_service
            .store_credentials(
                1,
                "spotify",
                "expired_token",
                Some("refresh_token"),
                Some(OffsetDateTime::now_utc() - time::Duration::hours(1)), // Expired
                Some("playlist-read-private"),
            )
            .await
            .unwrap();

        // Check that credentials are invalid
        let has_valid = auth_service.has_valid_credentials(1).await.unwrap();
        assert!(!has_valid);
    }
}
