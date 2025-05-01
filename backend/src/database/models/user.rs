use super::traits::{CreatableModel, DatabaseModel, ModelError, UpdatableModel};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Clone, Serialize, Deserialize)]
pub struct User {
    id: i64,
    pub username: String,
    password: String,
}

// Implement Debug manually to avoid logging the password hash
impl fmt::Debug for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("User")
            .field("id", &self.id)
            .field("username", &self.username)
            .field("password", &"[redacted]")
            .finish()
    }
}

impl DatabaseModel for User {
    type Id = i64;

    fn id(&self) -> &Self::Id {
        &self.id
    }
}

impl CreatableModel for User {
    fn new(id: Self::Id) -> Self {
        Self {
            id,
            username: String::new(),
            password: String::new(),
        }
    }
}

impl UpdatableModel for User {
    fn update(&mut self, other: &Self) {
        self.username = other.username.clone();
        self.password = other.password.clone();
    }
}

impl User {
    /// Create a new user with the given credentials
    pub fn with_credentials(id: i64, username: String, password: String) -> Self {
        Self {
            id,
            username,
            password,
        }
    }

    /// Get the user's username
    pub fn username(&self) -> &str {
        &self.username
    }

    /// Get the user's password hash
    pub fn password_hash(&self) -> &str {
        &self.password
    }

    /// Verify if the given password matches the stored hash
    pub fn verify_password(&self, password: &str) -> Result<bool, ModelError> {
        Ok(password_auth::verify_password(password, &self.password).is_ok())
    }
} 