use axum_login::{AuthUser, AuthnBackend, UserId};
use password_auth::verify_password;
use serde::{Deserialize, Serialize};
use tokio::task;

use crate::db::{DbError, SledDb};

#[derive(Clone, Serialize, Deserialize)]
pub struct User {
    id: i64,
    pub username: String,
    password: String,
}

// Here we've implemented `Debug` manually to avoid accidentally logging the
// password hash.
impl std::fmt::Debug for User {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("User")
            .field("id", &self.id)
            .field("username", &self.username)
            .field("password", &"[redacted]")
            .finish()
    }
}

impl AuthUser for User {
    type Id = i64;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes() // We use the password hash as the auth
                               // hash--what this means
                               // is when the user changes their password the
                               // auth session becomes invalid.
    }
}

// This allows us to extract the authentication fields from forms. We use this
// to authenticate requests with the backend.
#[derive(Debug, Clone, Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
    pub next: Option<String>,
}

const USERS_TREE: &str = "users";
const USER_ID_INDEX: &str = "users_id_index";
const USER_USERNAME_INDEX: &str = "users_username_index";

#[derive(Debug, Clone)]
pub struct Backend {
    db: SledDb,
}

impl Backend {
    pub fn new(db: SledDb) -> Self {
        Self { db }
    }
    
    /// Insert the test user during initialization
    pub async fn initialize(&self) -> Result<(), DbError> {
        // Create trees
        self.db.open_tree(USERS_TREE)?;
        self.db.open_tree(USER_ID_INDEX)?;
        self.db.open_tree(USER_USERNAME_INDEX)?;
        
        // Check if test user exists
        let user_id_bytes = 1i64.to_be_bytes();
        if self.db.get::<User>(USERS_TREE, &user_id_bytes)?.is_none() {
            // Create test user (the original ferris account)
            let test_user = User {
                id: 1,
                username: "ferris".to_string(),
                password: "$argon2id$v=19$m=19456,t=2,p=1$VE0e3g7DalWHgDwou3nuRA$uC6TER156UQpk0lNQ5+jHM0l5poVjPA1he/Tyn9J4Zw".to_string(),
            };
            
            // Insert user
            self.db.insert(USERS_TREE, &user_id_bytes, &test_user)?;
            
            // Create indexes
            self.db.insert(USER_ID_INDEX, &user_id_bytes, &user_id_bytes)?;
            self.db.insert(USER_USERNAME_INDEX, test_user.username.as_bytes(), &user_id_bytes)?;
        }
        
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Database(#[from] DbError),

    #[error(transparent)]
    TaskJoin(#[from] task::JoinError),
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
        // Look up user by username
        let user_id_bytes = match self.db.get::<Vec<u8>>(USER_USERNAME_INDEX, creds.username.as_bytes())? {
            Some(id_bytes) => id_bytes,
            None => return Ok(None),
        };
        
        // Get user from the ID
        let user = match self.db.get::<User>(USERS_TREE, &user_id_bytes)? {
            Some(user) => user,
            None => return Ok(None),
        };

        // Verifying the password is blocking and potentially slow, so we'll do so via
        // `spawn_blocking`.
        task::spawn_blocking(move || {
            // We're using password-based authentication--this works by comparing our form
            // input with an argon2 password hash.
            Ok(if verify_password(creds.password, &user.password).is_ok() {
                Some(user)
            } else {
                None
            })
        })
        .await?
    }

    async fn get_user(&self, user_id: &UserId<Self>) -> Result<Option<Self::User>, Self::Error> {
        let user_id_bytes = user_id.to_be_bytes();
        let user = self.db.get::<User>(USERS_TREE, &user_id_bytes)?;
        Ok(user)
    }
}

// We use a type alias for convenience.
//
// Note that we've supplied our concrete backend here.
pub type AuthSession = axum_login::AuthSession<Backend>;