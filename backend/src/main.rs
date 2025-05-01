//! Run with
//!
//! ```not_rust
//! cargo run -p example-sqlite
//! ```
use sqlx::SqlitePool;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use playlist_linker::{Router, Watcher};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db_path = "sqlite://./db.sqlite";
    let db = SqlitePool::connect(db_path).await?;
    sqlx::migrate!().run(&db).await?;

    tracing_subscriber::registry()
        .with(EnvFilter::new(std::env::var("RUST_LOG").unwrap_or_else(
            |_| "axum_login=debug,tower_sessions=debug,sqlx=warn,tower_http=debug".into(),
        )))
        .with(tracing_subscriber::fmt::layer())
        .try_init()?;

    let app = Watcher::new().await?;
    Router::new(db.clone(), app).await?.serve().await?;
    Ok(())
}
