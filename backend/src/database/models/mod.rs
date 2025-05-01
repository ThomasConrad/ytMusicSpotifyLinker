use serde::{Deserialize, Serialize};
use std::fmt::Debug;

/// A trait for database models that can be stored and retrieved
pub trait DatabaseModel: Serialize + for<'de> Deserialize<'de> + Debug + Clone {
    /// The type of the model's primary key
    type Id: Serialize + for<'de> Deserialize<'de> + Debug + Clone + Send + Sync;
    
    /// Get the model's primary key
    fn id(&self) -> &Self::Id;
}

/// A trait for models that can be created
pub trait CreatableModel: DatabaseModel {
    /// Create a new instance of the model
    fn new(id: Self::Id) -> Self;
}

/// A trait for models that can be updated
pub trait UpdatableModel: DatabaseModel {
    /// Update the model with new data
    fn update(&mut self, other: &Self);
}

/// Common error types for database operations
#[derive(Debug, thiserror::Error)]
pub enum ModelError {
    #[error("Database error: {0}")]
    Database(#[from] sled::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] bincode::Error),
    
    #[error("Item not found")]
    NotFound,
    
    #[error("Invalid data: {0}")]
    InvalidData(String),
}

// Re-export commonly used types
pub use serde::{Deserialize, Serialize};
pub use sled;

mod user;

pub use user::User; 