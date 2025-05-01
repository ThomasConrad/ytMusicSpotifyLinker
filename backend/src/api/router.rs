use anyhow::Result;
use axum_login::{
    login_required,
    tower_sessions::{ExpiredDeletion, Expiry, SessionManagerLayer},
    AuthManagerLayerBuilder,
};
use axum_messages::MessagesManagerLayer;
use sqlx::SqlitePool;
use thiserror::Error;
use time::Duration;
use tokio::{
    signal,
    task::{AbortHandle, JoinError},
};
use tower_sessions::{cookie::Key, session_store::Error as SessionStoreError};
use tower_sessions_sqlx_store::SqliteStore;

use crate::{
    api::{auth, protected},
    app::{Watcher, WatcherError},
    users::database,
    users::Backend,
};

#[derive(Error, Debug)]
pub enum RouterError {
    #[error("Failed to initialize router")]
    InitializationError,
    #[error("Failed to start server")]
    ServerError(#[from] std::io::Error),
    #[error("Database error")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Session error")]
    SessionError(#[from] SessionStoreError),
    #[error("Watcher error")]
    WatcherError(#[from] WatcherError),
    #[error("Task join error")]
    JoinError(#[from] JoinError),
}

pub struct Router {
    db: SqlitePool,
    /// The Watcher instance that will be used for playlist synchronization.
    /// This field will be used in future implementations.
    #[allow(dead_code)]
    app: Watcher,
}

impl Router {
    pub async fn new(pool: SqlitePool, app: Watcher) -> Result<Self, RouterError> {
        Ok(Self { db: pool, app })
    }

    pub fn into_axum_router(&self) -> axum::Router {
        protected::router()
            .route_layer(login_required!(Backend, login_url = "/login"))
            .merge(auth::router())
    }

    pub async fn serve(mut self) -> Result<(), RouterError> {
        let app = self.into_axum_router();

        // Session layer.
        //
        // This uses `tower-sessions` to establish a layer that will provide the session
        // as a request extension.
        let session_store = SqliteStore::new(self.db.clone());
        session_store.migrate().await?;

        let deletion_task = tokio::task::spawn(
            session_store
                .clone()
                .continuously_delete_expired(tokio::time::Duration::from_secs(60)),
        );

        // Generate a cryptographic key to sign the session cookie.
        let key = Key::generate();

        let session_layer = SessionManagerLayer::new(session_store)
            .with_secure(false)
            .with_expiry(Expiry::OnInactivity(Duration::days(1)))
            .with_signed(key);

        // Auth service.
        //
        // This combines the session layer with our backend to establish the auth
        // service which will provide the auth session as a request extension.
        let db = database::Database::new(self.db);
        let backend = Backend::new(db);
        let auth_layer = AuthManagerLayerBuilder::new(backend, session_layer).build();

        let app = app.layer(MessagesManagerLayer).layer(auth_layer);

        let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;

        // Ensure we use a shutdown signal to abort the deletion task.
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal(deletion_task.abort_handle()))
            .await?;

        deletion_task.await??;

        Ok(())
    }
}

impl From<Router> for axum::Router {
    fn from(router: Router) -> Self {
        router.into_axum_router()
    }
}

async fn shutdown_signal(deletion_task_abort_handle: AbortHandle) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { deletion_task_abort_handle.abort() },
        _ = terminate => { deletion_task_abort_handle.abort() },
    }
}
