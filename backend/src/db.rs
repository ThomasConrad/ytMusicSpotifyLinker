use anyhow::Result;
use async_trait::async_trait;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use thiserror::Error;
use time::OffsetDateTime;
use tower_sessions::{
    session::{Id, Record},
    session_store::SessionStore,
};

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Sled error: {0}")]
    SledError(#[from] sled::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] bincode::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Item not found")]
    NotFound,

    #[error("Invalid username or password")]
    InvalidCredentials,
}

// Make our error type compatible with tower-sessions
impl From<DbError> for tower_sessions::session_store::Error {
    fn from(err: DbError) -> Self {
        tower_sessions::session_store::Error::Backend(err.to_string())
    }
}

#[derive(Clone, Debug)]
pub struct SledDb {
    db: sled::Db,
}

impl SledDb {
    /// Open a new Sled database at the specified path
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, DbError> {
        let db = sled::open(path)?;
        Ok(Self { db })
    }

    /// Get a tree (collection) from the database
    pub fn open_tree(&self, name: &str) -> Result<sled::Tree, DbError> {
        Ok(self.db.open_tree(name)?)
    }

    /// Insert a serializable value into a tree with the given key
    pub fn insert<T: Serialize>(&self, tree: &str, key: &[u8], value: &T) -> Result<(), DbError> {
        let tree = self.db.open_tree(tree)?;
        let encoded = bincode::serialize(value)?;
        tree.insert(key, encoded)?;
        Ok(())
    }

    /// Get a value from a tree by key and deserialize it
    pub fn get<T: DeserializeOwned>(&self, tree: &str, key: &[u8]) -> Result<Option<T>, DbError> {
        let tree = self.db.open_tree(tree)?;
        if let Some(bytes) = tree.get(key)? {
            let value = bincode::deserialize(&bytes)?;
            Ok(Some(value))
        } else {
            Ok(None)
        }
    }

    /// Remove a key-value pair from a tree
    pub fn remove(&self, tree: &str, key: &[u8]) -> Result<Option<sled::IVec>, DbError> {
        let tree = self.db.open_tree(tree)?;
        Ok(tree.remove(key)?)
    }

    /// Flush the database to disk
    pub fn flush(&self) -> Result<(), DbError> {
        self.db.flush()?;
        Ok(())
    }
}

/// Session store implementation for tower-sessions using sled
pub mod session_store {
    use super::*;

    const SESSIONS_TREE: &str = "sessions";

    #[derive(Debug, Serialize, Deserialize)]
    struct StoredSession {
        data: HashMap<String, Value>,
        expiry_date: Option<u64>,
    }

    impl StoredSession {
        fn is_expired(&self) -> bool {
            if let Some(expiry) = self.expiry_date {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .expect("Time went backwards")
                    .as_secs();

                expiry < now
            } else {
                false
            }
        }
    }

    #[derive(Debug, Clone)]
    pub struct SledStore {
        db: SledDb,
    }

    impl SledStore {
        pub fn new(db: SledDb) -> Self {
            Self { db }
        }

        pub async fn migrate(&self) -> Result<(), DbError> {
            // Create sessions tree if it doesn't exist
            self.db.open_tree(SESSIONS_TREE)?;
            Ok(())
        }

        pub async fn continuously_delete_expired(self, interval: Duration) -> Result<(), DbError> {
            let mut interval = tokio::time::interval(interval);
            let start = Instant::now();

            loop {
                interval.tick().await;

                if let Err(e) = self.delete_expired().await {
                    tracing::error!("Failed to delete expired sessions: {}", e);
                }

                tracing::debug!("Deleted expired sessions in {:?}", start.elapsed(),);
            }
        }

        async fn delete_expired(&self) -> Result<(), DbError> {
            let tree = self.db.open_tree(SESSIONS_TREE)?;

            let mut to_delete = Vec::new();

            for result in tree.iter() {
                let (key, value) = result?;

                let session = bincode::deserialize::<StoredSession>(&value)?;

                if session.is_expired() {
                    to_delete.push(key);
                }
            }

            for key in to_delete {
                tree.remove(key)?;
            }

            Ok(())
        }
    }

    #[async_trait]
    impl SessionStore for SledStore {
        async fn save(&self, record: &Record) -> Result<(), tower_sessions::session_store::Error> {
            // Convert the expiry_date to u64 timestamp
            let expiry_date = Some(record.expiry_date.unix_timestamp().max(0) as u64);

            let stored_session = StoredSession {
                data: record.data.clone(),
                expiry_date,
            };

            self.db.insert(
                SESSIONS_TREE,
                record.id.to_string().as_bytes(),
                &stored_session,
            )?;

            Ok(())
        }

        async fn load(
            &self,
            session_id: &Id,
        ) -> Result<Option<Record>, tower_sessions::session_store::Error> {
            let result = self
                .db
                .get::<StoredSession>(SESSIONS_TREE, session_id.to_string().as_bytes())?;

            if let Some(stored_session) = result {
                if stored_session.is_expired() {
                    self.db
                        .remove(SESSIONS_TREE, session_id.to_string().as_bytes())?;
                    return Ok(None);
                }

                // Use a default expiry_date if none is stored
                let expiry_date = if let Some(timestamp) = stored_session.expiry_date {
                    OffsetDateTime::from_unix_timestamp(timestamp as i64)
                        .expect("Invalid timestamp")
                } else {
                    // Default to 24 hours from now if no expiry set
                    OffsetDateTime::now_utc() + time::Duration::hours(24)
                };

                let record = Record {
                    id: *session_id,
                    data: stored_session.data,
                    expiry_date,
                };

                Ok(Some(record))
            } else {
                Ok(None)
            }
        }

        async fn delete(
            &self,
            session_id: &Id,
        ) -> Result<(), tower_sessions::session_store::Error> {
            self.db
                .remove(SESSIONS_TREE, session_id.to_string().as_bytes())?;
            Ok(())
        }
    }
}
