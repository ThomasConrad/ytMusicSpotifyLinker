use axum_login::{AuthUser, AuthnBackend, UserId};
use password_auth::verify_password;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
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
}

pub trait DatabaseOperations {
    async fn get_user_by_username(&self, username: &str) -> Result<Option<User>, Error>;
    async fn get_user_by_id(&self, id: i64) -> Result<Option<User>, Error>;
    async fn verify_password(&self, user: &User, password: &str) -> Result<bool, Error>;
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
        task::spawn_blocking(move || Ok(verify_password(&password, &user_password).is_ok())).await?
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

        Database::new(pool)
    }

    #[tokio::test]
    async fn test_get_user_by_username() {
        let db = setup_test_db().await;

        // Insert a test user
        sqlx::query("INSERT INTO users (username, password) VALUES (?, ?)")
            .bind("test_user")
            .bind("hashed_password")
            .execute(&db.pool)
            .await
            .expect("Failed to insert test user");

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

        // Insert a test user
        sqlx::query("INSERT INTO users (username, password) VALUES (?, ?)")
            .bind("test_user")
            .bind("hashed_password")
            .execute(&db.pool)
            .await
            .expect("Failed to insert test user");

        // Test getting existing user
        let user = db.get_user_by_id(1).await.unwrap();
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
        let test_user = User {
            id: 1,
            username: "test_user".to_string(),
            password: password_auth::generate_hash("correct_password"),
        };

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
