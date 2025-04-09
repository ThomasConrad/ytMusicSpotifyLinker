//! YT Music Spotify Linker Backend
//!
//! ```not_rust
//! cargo run
//! ```
use anyhow::Context;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::api::Router;
use crate::app::Watcher;
use crate::config::AppConfig;
use crate::db::SledDb;

mod api;
mod app;
mod config;
mod db;
mod users;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration from .env file and environment variables
    let config = AppConfig::load().context("Failed to load configuration")?;
    
    // Make sure the database directory exists
    config.ensure_db_path_exists().context("Failed to create database directory")?;
    
    // Initialize the database
    let db = SledDb::open(&config.db_path).context("Failed to open Sled database")?;

    // Initialize logging
    tracing_subscriber::registry()
        .with(EnvFilter::new(std::env::var("RUST_LOG").unwrap_or_else(
            |_| config.log_level.clone(),
        )))
        .with(tracing_subscriber::fmt::layer())
        .try_init()?;
    
    // Initialize the application
    let app = Watcher::new(&config).await?;
    
    // Start the server
    info!("Starting server on {}", config.bind_address());
    Router::new(db, app, config).await?.serve().await
}
