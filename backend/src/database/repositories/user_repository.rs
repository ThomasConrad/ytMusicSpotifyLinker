use super::{Repository, SledRepository};
use crate::database::models::{ModelError, User};
use serde::{de::DeserializeOwned, Serialize};
use sled::Db;

const USERS_TREE: &str = "users";
const USERNAME_INDEX_TREE: &str = "users_username_index";

/// A repository for managing users with additional user-specific functionality
pub struct UserRepository {
    base_repo: SledRepository<User>,
    username_index: SledRepository<Vec<u8>>,
}

impl UserRepository {
    /// Create a new user repository
    pub fn new(db: Db) -> Result<Self, ModelError> {
        Ok(Self {
            base_repo: SledRepository::new(db.clone(), USERS_TREE)?,
            username_index: SledRepository::new(db, USERNAME_INDEX_TREE)?,
        })
    }

    /// Get a user by their username
    pub fn get_by_username(&self, username: &str) -> Result<Option<User>, ModelError> {
        if let Some(id_bytes) = self.username_index.get(&username.as_bytes().to_vec())? {
            let id = bincode::deserialize(&id_bytes)?;
            self.base_repo.get(&id)
        } else {
            Ok(None)
        }
    }

    /// Create a new user with the given credentials
    pub fn create_user(&self, username: String, password: String) -> Result<User, ModelError> {
        // Check if username already exists
        if self.get_by_username(&username)?.is_some() {
            return Err(ModelError::InvalidData("Username already exists".to_string()));
        }

        // Generate a new ID (this is a simple implementation - in production, you'd want a better ID generation strategy)
        let id = self.base_repo.list()?.len() as i64 + 1;
        
        // Create the user
        let user = User::with_credentials(id, username.clone(), password);
        
        // Store the user
        self.base_repo.insert(&user)?;
        
        // Create username index
        self.username_index.insert(&username.as_bytes().to_vec(), &id.to_be_bytes().to_vec())?;
        
        Ok(user)
    }
}

impl Repository<User> for UserRepository {
    fn get(&self, id: &i64) -> Result<Option<User>, ModelError> {
        self.base_repo.get(id)
    }

    fn insert(&self, model: &User) -> Result<(), ModelError> {
        // Update username index
        self.username_index.insert(
            &model.username().as_bytes().to_vec(),
            &model.id().to_be_bytes().to_vec(),
        )?;
        
        self.base_repo.insert(model)
    }

    fn update(&self, model: &User) -> Result<(), ModelError> {
        // Update username index
        self.username_index.insert(
            &model.username().as_bytes().to_vec(),
            &model.id().to_be_bytes().to_vec(),
        )?;
        
        self.base_repo.update(model)
    }

    fn delete(&self, id: &i64) -> Result<(), ModelError> {
        if let Some(user) = self.base_repo.get(id)? {
            // Remove username index
            self.username_index.delete(&user.username().as_bytes().to_vec())?;
        }
        
        self.base_repo.delete(id)
    }

    fn list(&self) -> Result<Vec<User>, ModelError> {
        self.base_repo.list()
    }
} 