mod models;
mod sled;
mod traits;

use anyhow::Result;
use std::path::Path;
use thiserror::Error;

pub use models::User;
pub use sled::{SledRepository, UserRepository};
pub use traits::{CreatableModel, DatabaseModel, ModelError, Repository, UpdatableModel};

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Sled error: {0}")]
    SledError(#[from] sled::Error),

    #[error("Model error: {0}")]
    ModelError(#[from] ModelError),
}

/// A wrapper around the Sled database that provides access to repositories
pub struct Database {
    db: sled::Db,
}

impl Database {
    /// Open a new database at the specified path
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, DatabaseError> {
        let db = sled::open(path)?;
        Ok(Self { db })
    }

    /// Get a user repository
    pub fn users(&self) -> Result<UserRepository, DatabaseError> {
        Ok(UserRepository::new(self.db.clone())?)
    }

    /// Get a generic repository for a model type
    pub fn repository<T: DatabaseModel>(&self, tree_name: &str) -> Result<SledRepository<T>, DatabaseError> {
        Ok(SledRepository::new(self.db.clone(), tree_name)?)
    }
}

// Make our error type compatible with tower-sessions
impl From<DatabaseError> for tower_sessions::session_store::Error {
    fn from(err: DatabaseError) -> Self {
        tower_sessions::session_store::Error::Backend(err.to_string())
    }
}

#[cfg(test)]
mod tests; 