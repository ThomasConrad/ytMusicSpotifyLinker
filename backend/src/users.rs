use axum_login::{AuthUser, AuthnBackend, UserId};
use serde::Deserialize;
use tokio::task;

use crate::database::{Database, DatabaseError, User, UserRepository};

#[derive(Debug, Clone, Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
    pub next: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Database(#[from] DatabaseError),

    #[error(transparent)]
    TaskJoin(#[from] task::JoinError),
}

#[derive(Debug, Clone)]
pub struct Backend {
    db: Database,
}

impl Backend {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
    
    /// Insert the test user during initialization
    pub async fn initialize(&self) -> Result<(), Error> {
        let users = self.db.users()?;
        
        // Check if test user exists
        if users.get_by_username("ferris")?.is_none() {
            // Create test user (the original ferris account)
            users.create_user(
                "ferris".to_string(),
                "$argon2id$v=19$m=19456,t=2,p=1$VE0e3g7DalWHgDwou3nuRA$uC6TER156UQpk0lNQ5+jHM0l5poVjPA1he/Tyn9J4Zw".to_string(),
            )?;
        }
        
        Ok(())
    }
}

#[async_trait::async_trait]
impl AuthnBackend for Backend {
    type User = User;
    type Credentials = Credentials;
    type Error = Error;

    async fn authenticate(
        &self,
        creds: Self::Credentials,
    ) -> Result<Option<Self::User>, Self::Error> {
        let users = self.db.users()?;
        
        // Look up user by username
        let user = match users.get_by_username(&creds.username)? {
            Some(user) => user,
            None => return Ok(None),
        };

        // Verifying the password is blocking and potentially slow, so we'll do so via
        // `spawn_blocking`.
        task::spawn_blocking(move || {
            Ok(if user.verify_password(&creds.password)? {
                Some(user)
            } else {
                None
            })
        })
        .await?
    }

    async fn get_user(&self, user_id: &UserId<Self>) -> Result<Option<Self::User>, Self::Error> {
        let users = self.db.users()?;
        let user = users.get(user_id)?;
        Ok(user)
    }
}

// We use a type alias for convenience.
pub type AuthSession = axum_login::AuthSession<Backend>;