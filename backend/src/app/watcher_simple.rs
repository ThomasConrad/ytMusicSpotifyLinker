use crate::app::songlink::SonglinkClient;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WatcherError {
    #[error("Failed to initialize watcher")]
    InitializationError,
}

pub struct Watcher {
    /// The SonglinkClient instance that will be used for playlist synchronization.
    /// This field will be used in future implementations.
    #[allow(dead_code)]
    songlink_client: SonglinkClient,
}

impl Watcher {
    pub async fn new(_db_pool: sqlx::SqlitePool) -> Result<Self, WatcherError> {
        Ok(Self {
            songlink_client: SonglinkClient::new(None),
        })
    }
}