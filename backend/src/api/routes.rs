use axum::{routing::get, Router};
use axum_login::login_required;
use sqlx::SqlitePool;

use crate::users::Backend;
use super::{auth, protected, spotify, users, watchers};

/// Main API router that consolidates all service-specific routers
pub fn router(db: SqlitePool) -> Router {
    // Create the consolidated API router
    let api_router = Router::new()
        // Authentication routes (no login required)
        .nest("/auth", auth::router(db.clone()))
        // Protected routes (login required)
        .nest("/users", users::router().with_state(db.clone()).route_layer(login_required!(Backend, login_url = "/login")))
        .nest("/spotify", spotify::router().with_state(db.clone()).route_layer(login_required!(Backend, login_url = "/login")))
        .nest("/watchers", watchers::router().with_state(db.clone()).route_layer(login_required!(Backend, login_url = "/login")))
        .nest("/protected", protected::router().with_state(db.clone()).route_layer(login_required!(Backend, login_url = "/login")))
        // Health check endpoint
        .route("/health", get(health_check));

    // Nest the entire API under /api
    Router::new().nest("/api", api_router)
}

/// Simple health check endpoint
async fn health_check() -> &'static str {
    "OK"
}