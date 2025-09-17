use anyhow::Result;
use axum::Router as AxumRouter;
use httpmock::prelude::*;
use reqwest::Client;
use serde_json::json;
use sqlx::sqlite::SqlitePool;
use std::collections::HashMap;
use std::net::SocketAddr;
use test_log::test;
use time::Duration;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tower_sessions::cookie::Key;
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_sqlx_store::SqliteStore;

use playlist_linker::api::Router;
use playlist_linker::app::Watcher;
use playlist_linker::users::{database, Backend};

async fn setup_test_server_with_spotify_env(
) -> Result<(SocketAddr, SqlitePool, HashMap<String, String>)> {
    // Set up environment variables for testing
    let mut env_vars = HashMap::new();
    env_vars.insert(
        "SPOTIFY_CLIENT_ID".to_string(),
        "test_client_id".to_string(),
    );
    env_vars.insert(
        "SPOTIFY_CLIENT_SECRET".to_string(),
        "test_client_secret".to_string(),
    );
    env_vars.insert(
        "SPOTIFY_REDIRECT_URI".to_string(),
        "http://localhost:3000/api/spotify/auth/callback".to_string(),
    );

    // Set environment variables
    for (key, value) in &env_vars {
        std::env::set_var(key, value);
    }

    // Create a test database
    let pool = SqlitePool::connect("sqlite::memory:").await?;

    // Run migrations
    sqlx::migrate!().run(&pool).await?;

    // Create the app
    let app = Watcher::new(pool.clone()).await?;
    let router = Router::new(pool.clone(), app).await?;

    // Set up session store
    let session_store = SqliteStore::new(pool.clone());
    session_store.migrate().await?;

    let key = Key::generate();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(Expiry::OnInactivity(Duration::days(1)))
        .with_signed(key);

    // Set up auth layer
    let db = database::Database::new(pool.clone());
    let backend = Backend::new(db);
    let auth_layer = axum_login::AuthManagerLayerBuilder::new(backend, session_layer).build();

    // Build the app
    let app = AxumRouter::new()
        .merge(&router)
        .layer(ServiceBuilder::new().layer(auth_layer));

    // Bind to a random port
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let addr = listener.local_addr()?;

    // Start the server in the background
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    Ok((addr, pool, env_vars))
}

async fn create_authenticated_user(client: &Client, base_url: &str, username: &str) -> Result<()> {
    // Create and login user
    let response = client
        .post(format!("{}/api/auth/register", base_url))
        .json(&json!({
            "username": username,
            "password": "testpassword123"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());

    let response = client
        .post(format!("{}/api/auth/login", base_url))
        .json(&json!({
            "username": username,
            "password": "testpassword123"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());
    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_start_success() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "spotify_user").await?;

    // Test starting Spotify auth flow
    let response = client
        .get(format!("{}/api/spotify/auth/start", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let auth_response: serde_json::Value = response.json().await?;
    assert_eq!(auth_response["success"], true);
    assert!(auth_response["auth_url"].is_string());
    assert!(auth_response["auth_url"]
        .as_str()
        .unwrap()
        .contains("accounts.spotify.com"));
    assert!(auth_response["auth_url"]
        .as_str()
        .unwrap()
        .contains("client_id=test_client_id"));

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_start_unauthorized() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let client = Client::new();
    let base_url = format!("http://{}", addr);

    // Test starting Spotify auth flow without authentication
    let response = client
        .get(format!("{}/api/spotify/auth/start", base_url))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 401);

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_callback_success() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Start a mock Spotify server
    let spotify_server = MockServer::start_async().await;

    // Override redirect URI to use mock server
    std::env::set_var(
        "SPOTIFY_REDIRECT_URI",
        format!("{}/callback", spotify_server.base_url()),
    );

    // Mock the Spotify token endpoint
    let token_mock = spotify_server.mock_async(|when, then| {
        when.method(POST).path("/api/token");
        then.status(200).json_body(json!({
            "access_token": "mock_access_token_123",
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": "mock_refresh_token_123",
            "scope": "user-read-private user-read-email playlist-read-private playlist-modify-public"
        }));
    }).await;

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "callback_user").await?;

    // First, start auth flow to create state
    let start_response = client
        .get(format!("{}/api/spotify/auth/start", base_url))
        .send()
        .await?;

    assert!(start_response.status().is_success());

    // Start the OAuth flow to get proper state
    let start_response_body: serde_json::Value = start_response.json().await?;
    let auth_url = start_response_body["auth_url"].as_str().unwrap();

    // Extract state from the auth URL
    let url = url::Url::parse(auth_url).unwrap();
    let query_pairs: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    let state = query_pairs.get("state").unwrap().clone();

    // Test callback with valid code and state
    let response = client
        .get(format!(
            "{}/api/spotify/auth/callback?code=test_auth_code&state={}",
            base_url, state
        ))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 302); // Should redirect
    let location = response
        .headers()
        .get("location")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(location.contains("/dashboard"));
    assert!(location.contains("spotify_connected=true"));

    // Verify the token endpoint was called
    token_mock.assert_async().await;

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_callback_error_cases() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "error_user").await?;

    // Test callback with OAuth error
    let response = client
        .get(format!(
            "{}/api/spotify/auth/callback?error=access_denied",
            base_url
        ))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 302);
    let location = response
        .headers()
        .get("location")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(location.contains("/dashboard"));
    assert!(location.contains("error=oauth_denied"));

    // Test callback without code
    let response = client
        .get(format!(
            "{}/api/spotify/auth/callback?state=test_state",
            base_url
        ))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 302);
    let location = response
        .headers()
        .get("location")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(location.contains("error=no_code"));

    // Test callback without state
    let response = client
        .get(format!(
            "{}/api/spotify/auth/callback?code=test_code",
            base_url
        ))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 302);
    let location = response
        .headers()
        .get("location")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(location.contains("error=no_state"));

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_status_not_authenticated() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "status_user").await?;

    // Test auth status when not connected to Spotify
    let response = client
        .get(format!("{}/api/spotify/auth/status", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let status_response: serde_json::Value = response.json().await?;
    assert_eq!(status_response["success"], true);
    assert_eq!(status_response["authenticated"], false);
    assert!(status_response["user_profile"].is_null());

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_status_authenticated() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Start a mock Spotify server
    let spotify_server = MockServer::start_async().await;

    // Mock the Spotify user profile endpoint
    let profile_mock = spotify_server
        .mock_async(|when, then| {
            when.method(GET)
                .path("/v1/me")
                .header("authorization", "Bearer mock_token_456");
            then.status(200).json_body(json!({
                "id": "spotify_test_user",
                "display_name": "Test Spotify User",
                "email": "test@spotify.com",
                "followers": {"total": 42},
                "product": "premium"
            }));
        })
        .await;

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "auth_status_user").await?;

    // Insert mock credentials into database
    let user_record = sqlx::query!("SELECT id FROM users WHERE username = 'auth_status_user'")
        .fetch_one(&pool)
        .await?;

    sqlx::query!(
        "INSERT INTO user_credentials (user_id, service, access_token, refresh_token, expires_at, token_scope) 
         VALUES (?, 'spotify', 'mock_token_456', 'mock_refresh_456', datetime('now', '+1 hour'), 'user-read-private')",
         user_record.id
    )
    .execute(&pool)
    .await?;

    // Override Spotify API base URL to use mock server
    std::env::set_var("SPOTIFY_API_BASE_URL", spotify_server.base_url());

    // Test auth status when connected to Spotify
    let response = client
        .get(format!("{}/api/spotify/auth/status", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let status_response: serde_json::Value = response.json().await?;
    assert_eq!(status_response["success"], true);
    assert_eq!(status_response["authenticated"], true);

    if status_response["user_profile"].is_object() {
        assert_eq!(status_response["user_profile"]["id"], "spotify_test_user");
        assert_eq!(
            status_response["user_profile"]["display_name"],
            "Test Spotify User"
        );
        assert_eq!(status_response["user_profile"]["premium"], true);
    }

    // Verify the profile endpoint was called
    profile_mock.assert_async().await;

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_auth_disconnect() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "disconnect_user").await?;

    // Insert mock credentials into database
    let user_record = sqlx::query!("SELECT id FROM users WHERE username = 'disconnect_user'")
        .fetch_one(&pool)
        .await?;

    sqlx::query!(
        "INSERT INTO user_credentials (user_id, service, access_token, refresh_token, expires_at, token_scope) 
         VALUES (?, 'spotify', 'mock_token_789', 'mock_refresh_789', datetime('now', '+1 hour'), 'user-read-private')",
        user_record.id
    )
    .execute(&pool)
    .await?;

    // Test disconnecting Spotify account
    let response = client
        .post(format!("{}/api/spotify/auth/disconnect", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let disconnect_response: serde_json::Value = response.json().await?;
    assert_eq!(disconnect_response["success"], true);
    assert!(disconnect_response["message"]
        .as_str()
        .unwrap()
        .contains("Successfully disconnected"));

    // Verify credentials were removed from database
    let count = sqlx::query!(
        "SELECT COUNT(*) as count FROM user_credentials WHERE user_id = ? AND service = 'spotify'",
        user_record.id
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(count.count, 0);

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_test_connection() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Start a mock Spotify server
    let spotify_server = MockServer::start_async().await;

    // Mock successful connection test
    let test_mock = spotify_server
        .mock_async(|when, then| {
            when.method(GET)
                .path("/v1/me")
                .header("authorization", "Bearer test_connection_token");
            then.status(200).json_body(json!({
                "id": "test_connection_user"
            }));
        })
        .await;

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "connection_test_user").await?;

    // Insert mock credentials into database
    let user_record = sqlx::query!("SELECT id FROM users WHERE username = 'connection_test_user'")
        .fetch_one(&pool)
        .await?;

    sqlx::query!(
        "INSERT INTO user_credentials (user_id, service, access_token, refresh_token, expires_at, token_scope) 
         VALUES (?, 'spotify', 'test_connection_token', 'test_refresh_token', datetime('now', '+1 hour'), 'user-read-private')",
        user_record.id
    )
    .execute(&pool)
    .await?;

    // Override Spotify API base URL to use mock server
    std::env::set_var("SPOTIFY_API_BASE_URL", spotify_server.base_url());

    // Test connection
    let response = client
        .get(format!("{}/api/spotify/test", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let test_response: serde_json::Value = response.json().await?;
    assert_eq!(test_response["success"], true);
    assert!(test_response["message"]
        .as_str()
        .unwrap()
        .contains("working"));

    // Verify the test endpoint was called
    test_mock.assert_async().await;

    Ok(())
}

#[test(tokio::test)]
async fn test_token_refresh_flow() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Start a mock Spotify server
    let spotify_server = MockServer::start_async().await;

    // Mock token refresh endpoint
    let refresh_mock = spotify_server
        .mock_async(|when, then| {
            when.method(POST)
                .path("/api/token")
                .body_contains("refresh_token=expired_refresh_token");
            then.status(200).json_body(json!({
                "access_token": "new_access_token",
                "token_type": "Bearer",
                "expires_in": 3600,
                "refresh_token": "new_refresh_token",
                "scope": "user-read-private"
            }));
        })
        .await;

    // Mock profile endpoint that initially fails with expired token, then succeeds
    let profile_fail_mock = spotify_server
        .mock_async(|when, then| {
            when.method(GET)
                .path("/v1/me")
                .header("authorization", "Bearer expired_token");
            then.status(401).json_body(json!({
                "error": {
                    "status": 401,
                    "message": "The access token expired"
                }
            }));
        })
        .await;

    let profile_success_mock = spotify_server
        .mock_async(|when, then| {
            when.method(GET)
                .path("/v1/me")
                .header("authorization", "Bearer new_access_token");
            then.status(200).json_body(json!({
                "id": "refresh_test_user",
                "display_name": "Refresh Test User"
            }));
        })
        .await;

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "refresh_user").await?;

    // Insert expired credentials into database
    let user_record = sqlx::query!("SELECT id FROM users WHERE username = 'refresh_user'")
        .fetch_one(&pool)
        .await?;

    sqlx::query!(
        "INSERT INTO user_credentials (user_id, service, access_token, refresh_token, expires_at, token_scope) 
         VALUES (?, 'spotify', 'expired_token', 'expired_refresh_token', datetime('now', '-1 hour'), 'user-read-private')",
        user_record.id
    )
    .execute(&pool)
    .await?;

    // Override Spotify API base URL to use mock server
    std::env::set_var("SPOTIFY_API_BASE_URL", spotify_server.base_url());

    // Test that token refresh happens automatically during status check
    let response = client
        .get(format!("{}/api/spotify/auth/status", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let status_response: serde_json::Value = response.json().await?;
    assert_eq!(status_response["success"], true);

    // Verify both calls were made
    profile_fail_mock.assert_async().await;
    refresh_mock.assert_async().await;
    profile_success_mock.assert_async().await;

    // Verify token was updated in database
    let updated_creds = sqlx::query!(
        "SELECT access_token, refresh_token FROM user_credentials WHERE user_id = ? AND service = 'spotify'",
        user_record.id
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(updated_creds.access_token, "new_access_token");
    assert_eq!(updated_creds.refresh_token.unwrap(), "new_refresh_token");

    Ok(())
}

#[test(tokio::test)]
async fn test_security_state_validation() -> Result<()> {
    // Start the server
    let (addr, pool, _env_vars) = setup_test_server_with_spotify_env().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Create authenticated user
    create_authenticated_user(&client, &base_url, "security_user").await?;

    // Get user ID for generating valid and invalid states
    let user_record = sqlx::query!("SELECT id FROM users WHERE username = 'security_user'")
        .fetch_one(&pool)
        .await?;
    let valid_state = format!("state_{}", user_record.id);
    let invalid_state = format!("state_{}", user_record.id + 999);

    // Test callback with invalid state (should fail)
    let response = client
        .get(format!(
            "{}/api/spotify/auth/callback?code=test_code&state={}",
            base_url, invalid_state
        ))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 302);
    let location = response
        .headers()
        .get("location")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(location.contains("error=auth_failed") || location.contains("error=no_state"));

    // Test callback with valid state format but no auth flow started
    let response = client
        .get(format!(
            "{}/api/spotify/auth/callback?code=test_code&state={}",
            base_url, valid_state
        ))
        .send()
        .await?;

    // This should also fail as no auth flow was actually started
    assert_eq!(response.status().as_u16(), 302);
    let location = response
        .headers()
        .get("location")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(location.contains("error=auth_failed"));

    Ok(())
}
