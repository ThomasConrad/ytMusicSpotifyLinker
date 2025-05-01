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
        task::spawn_blocking(|| Ok(verify_password(password, &user.password).is_ok())).await?
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
