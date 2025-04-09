//! Run with
//!
//! ```not_rust
//! cargo run
//! ```
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::api::Router;
use crate::app::Watcher;
use crate::db::SledDb;

mod api;
mod app;
mod db;
mod users;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db_path = "./db.sled";
    let db = SledDb::open(db_path)?;

    tracing_subscriber::registry()
        .with(EnvFilter::new(std::env::var("RUST_LOG").unwrap_or_else(
            |_| "axum_login=debug,tower_sessions=debug,tower_http=debug".into(),
        )))
        .with(tracing_subscriber::fmt::layer())
        .try_init()?;

    let app = Watcher::new().await?;
    Router::new(db, app).await?.serve().await
}
