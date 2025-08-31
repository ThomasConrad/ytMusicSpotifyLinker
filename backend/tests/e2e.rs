use anyhow::Result;
use axum::Router as AxumRouter;
use httpmock::prelude::*;
use reqwest::Client;
use sqlx::sqlite::SqlitePool;
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

async fn setup_test_server() -> Result<(SocketAddr, SqlitePool)> {
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

    Ok((addr, pool))
}

#[test(tokio::test)]
async fn test_user_creation_and_login() -> Result<()> {
    // Start the server
    let (addr, _pool) = setup_test_server().await?;
    let client = Client::new();
    let base_url = format!("http://{}", addr);

    // Create a new user
    let response = client
        .post(format!("{}/api/auth/register", base_url))
        .json(&serde_json::json!({
            "username": "testuser",
            "password": "testpassword"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());

    // Try to login with the created user
    let response = client
        .post(format!("{}/api/auth/login", base_url))
        .json(&serde_json::json!({
            "username": "testuser",
            "password": "testpassword"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());

    Ok(())
}

#[test(tokio::test)]
async fn test_auth_workflow() -> Result<()> {
    // Start the server
    let (addr, _pool) = setup_test_server().await?;
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder().cookie_provider(jar).build()?;
    let base_url = format!("http://{}", addr);

    // Test registration
    let response = client
        .post(format!("{}/api/auth/register", base_url))
        .json(&serde_json::json!({
            "username": "authtest",
            "password": "securepass123"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());
    let register_body: serde_json::Value = response.json().await?;
    assert_eq!(register_body["success"], true);
    assert_eq!(register_body["user"]["username"], "authtest");

    // Test profile access after registration (auto-login)
    let response = client
        .get(format!("{}/api/auth/profile", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let profile_body: serde_json::Value = response.json().await?;
    assert_eq!(profile_body["username"], "authtest");

    // Test logout
    let response = client
        .post(format!("{}/api/auth/logout", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let logout_body: serde_json::Value = response.json().await?;
    assert_eq!(logout_body["success"], true);

    // Test that profile is now inaccessible
    let response = client
        .get(format!("{}/api/auth/profile", base_url))
        .send()
        .await?;

    assert_eq!(response.status().as_u16(), 401);

    // Test login with correct credentials
    let response = client
        .post(format!("{}/api/auth/login", base_url))
        .json(&serde_json::json!({
            "username": "authtest",
            "password": "securepass123"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());
    let login_body: serde_json::Value = response.json().await?;
    assert_eq!(login_body["success"], true);
    assert_eq!(login_body["user"]["username"], "authtest");

    // Test profile is accessible again
    let response = client
        .get(format!("{}/api/auth/profile", base_url))
        .send()
        .await?;

    assert!(response.status().is_success());
    let profile_body: serde_json::Value = response.json().await?;
    assert_eq!(profile_body["username"], "authtest");

    // Test login with incorrect credentials
    let response = client
        .post(format!("{}/api/auth/login", base_url))
        .json(&serde_json::json!({
            "username": "authtest",
            "password": "wrongpassword"
        }))
        .send()
        .await?;

    assert!(response.status().is_success()); // Auth errors return 200 with error in JSON
    let error_body: serde_json::Value = response.json().await?;
    assert_eq!(error_body["success"], false);
    assert_eq!(error_body["error_code"], "INVALID_CREDENTIALS");

    Ok(())
}

#[test(tokio::test)]
async fn test_spotify_integration() -> Result<()> {
    // Start the server
    let (addr, _pool) = setup_test_server().await?;
    let client = Client::new();
    let base_url = format!("http://{}", addr);

    // Create a mock Spotify server
    let spotify_server = MockServer::start();

    // Mock the Spotify token endpoint
    let token_mock = spotify_server.mock(|when, then| {
        when.method(POST).path("/api/token");
        then.status(200).json_body(serde_json::json!({
            "access_token": "mock_access_token",
            "token_type": "Bearer",
            "expires_in": 3600
        }));
    });

    // Mock the Spotify user profile endpoint
    let profile_mock = spotify_server.mock(|when, then| {
        when.method(GET).path("/v1/me");
        then.status(200).json_body(serde_json::json!({
            "id": "mock_user_id",
            "display_name": "Test User"
        }));
    });

    // Create a user and login
    let response = client
        .post(format!("{}/api/auth/register", base_url))
        .json(&serde_json::json!({
            "username": "spotifyuser",
            "password": "testpassword"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());

    let response = client
        .post(format!("{}/api/auth/login", base_url))
        .json(&serde_json::json!({
            "username": "spotifyuser",
            "password": "testpassword"
        }))
        .send()
        .await?;

    assert!(response.status().is_success());

    // Connect Spotify account
    let response = client
        .post(format!("{}/connect/spotify", base_url))
        .json(&serde_json::json!({
            "code": "mock_auth_code",
            "redirect_uri": format!("{}/callback", spotify_server.base_url())
        }))
        .send()
        .await?;

    assert!(response.status().is_success());

    // Verify the mocks were called
    token_mock.assert();
    profile_mock.assert();

    Ok(())
}
