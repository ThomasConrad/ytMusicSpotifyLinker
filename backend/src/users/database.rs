use argon2::password_hash::SaltString;
use argon2::{Algorithm, Argon2, Params, PasswordHash, PasswordHasher, PasswordVerifier, Version};
use axum_login::{AuthUser, AuthnBackend, UserId};
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::env;
use tokio::task;

#[derive(Clone, Serialize, Deserialize, FromRow)]
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
        self.password.as_bytes()
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
    pub next: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error(transparent)]
    TaskJoin(#[from] task::JoinError),

    #[error("Missing password salt in environment")]
    MissingSalt,

    #[error("Invalid password salt")]
    InvalidSalt,

    #[error("Invalid password hash")]
    InvalidPassword,

    #[error("Failed to hash password")]
    HashError,
}

pub trait DatabaseOperations {
    async fn get_user_by_username(&self, username: &str) -> Result<Option<User>, Error>;
    async fn get_user_by_id(&self, id: i64) -> Result<Option<User>, Error>;
    async fn verify_password(&self, user: &User, password: &str) -> Result<bool, Error>;
    async fn create_user(&self, username: &str, password: &str) -> Result<User, Error>;
}

#[derive(Debug, Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl DatabaseOperations for Database {
    async fn get_user_by_username(&self, username: &str) -> Result<Option<User>, Error> {
        let user = sqlx::query_as("select * from users where username = ?")
            .bind(username)
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }

    async fn get_user_by_id(&self, id: i64) -> Result<Option<User>, Error> {
        let user = sqlx::query_as("select * from users where id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }

    async fn verify_password(&self, user: &User, password: &str) -> Result<bool, Error> {
        let password = password.to_string();
        let user_password = user.password.clone();

        task::spawn_blocking(move || {
            let parsed_hash =
                PasswordHash::new(&user_password).map_err(|_| Error::InvalidPassword)?;

            Ok(Argon2::default()
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok())
        })
        .await?
    }

    async fn create_user(&self, username: &str, password: &str) -> Result<User, Error> {
        // Generate a unique random salt for this user
        let salt = SaltString::generate(&mut thread_rng());

        // Clone the password to move into the task
        let password = password.to_string();

        let password_hash = task::spawn_blocking(move || {
            let argon2 = Argon2::new(
                Algorithm::Argon2id,
                Version::V0x13,
                Params::new(15000, 2, 1, None).unwrap(),
            );

            argon2
                .hash_password(password.as_bytes(), &salt)
                .map_err(|_| Error::HashError)
                .map(|hash| hash.to_string())
        })
        .await??;

        let user =
            sqlx::query_as("INSERT INTO users (username, password) VALUES (?, ?) RETURNING *")
                .bind(username)
                .bind(password_hash)
                .fetch_one(&self.pool)
                .await?;

        Ok(user)
    }
}

#[derive(Debug, Clone)]
pub struct Backend {
    db: Database,
}

impl Backend {
    pub fn new(db: Database) -> Self {
        Self { db }
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
        let user = self.db.get_user_by_username(&creds.username).await?;

        if let Some(user) = user {
            if self.db.verify_password(&user, &creds.password).await? {
                return Ok(Some(user));
            }
        }

        Ok(None)
    }

    async fn get_user(&self, user_id: &UserId<Self>) -> Result<Option<Self::User>, Self::Error> {
        self.db.get_user_by_id(*user_id).await
    }
}

pub type AuthSession = axum_login::AuthSession<Backend>;

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use std::env;

    async fn setup_test_db() -> Database {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Create the users table
        sqlx::query(
            r#"
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create users table");

        // Set a test salt for the environment
        env::set_var("PASSWORD_SALT", "test_salt");

        Database::new(pool)
    }

    #[tokio::test]
    async fn test_get_user_by_username() {
        let db = setup_test_db().await;

        // Create a test user with a known password
        let test_user = db.create_user("test_user", "test_password").await.unwrap();

        // Test getting existing user
        let user = db.get_user_by_username("test_user").await.unwrap();
        assert!(user.is_some());
        assert_eq!(user.unwrap().username, "test_user");

        // Test getting non-existent user
        let user = db.get_user_by_username("non_existent").await.unwrap();
        assert!(user.is_none());
    }

    #[tokio::test]
    async fn test_get_user_by_id() {
        let db = setup_test_db().await;

        // Create a test user
        let test_user = db.create_user("test_user", "test_password").await.unwrap();

        // Test getting existing user
        let user = db.get_user_by_id(test_user.id).await.unwrap();
        assert!(user.is_some());
        assert_eq!(user.unwrap().username, "test_user");

        // Test getting non-existent user
        let user = db.get_user_by_id(999).await.unwrap();
        assert!(user.is_none());
    }

    #[tokio::test]
    async fn test_verify_password() {
        let db = setup_test_db().await;

        // Create a test user with a known password
        let test_user = db
            .create_user("test_user", "correct_password")
            .await
            .unwrap();

        // Test correct password
        let result = db
            .verify_password(&test_user, "correct_password")
            .await
            .unwrap();
        assert!(result);

        // Test incorrect password
        let result = db
            .verify_password(&test_user, "wrong_password")
            .await
            .unwrap();
        assert!(!result);
    }
}
