use axum_login::AuthnBackend;
use sqlx::SqlitePool;
use thiserror::Error;

use crate::users::{
    database::{Backend, Credentials, Database, DatabaseOperations, Error as DbError},
    models::{CreateWatcherRequest, SyncOperation, User, UserCredential, Watcher},
    repository::{SyncRepository, WatcherRepository},
};

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("Watcher not found")]
    WatcherNotFound,
    #[error("Watcher name already exists")]
    WatcherNameExists,
    #[error("Service connection not found")]
    ServiceConnectionNotFound,
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Database error: {0}")]
    DbError(#[from] DbError),
    #[error("Repository error: {0}")]
    RepositoryError(#[from] anyhow::Error),
    #[error("Authentication error: {0}")]
    AuthError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
}

pub struct AuthService {
    backend: Backend,
    db: Database,
}

impl AuthService {
    pub fn new(pool: SqlitePool) -> Self {
        let db = Database::new(pool);
        let backend = Backend::new(db.clone());

        Self { backend, db }
    }

    pub async fn register_user(
        &self,
        username: String,
        password: String,
    ) -> Result<User, ServiceError> {
        // Validate input
        if username.trim().is_empty() {
            return Err(ServiceError::ValidationError(
                "Username cannot be empty".to_string(),
            ));
        }

        if password.len() < 8 {
            return Err(ServiceError::ValidationError(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        // Check if user already exists
        if let Ok(Some(_)) = self.db.get_user_by_username(&username).await {
            return Err(ServiceError::UserAlreadyExists);
        }

        // Create new user
        let credentials = Credentials {
            username: username.clone(),
            password: password.clone(),
            next: None,
        };

        match self.backend.authenticate(credentials).await {
            Ok(Some(user)) => {
                // Convert database User to models User
                Ok(User {
                    id: user.id,
                    username: user.username,
                    password, // We need to include password field for models::User
                })
            }
            Ok(None) => Err(ServiceError::AuthError("Failed to create user".to_string())),
            Err(e) => Err(ServiceError::DbError(e)),
        }
    }

    pub async fn login_user(
        &self,
        username: String,
        password: String,
    ) -> Result<User, ServiceError> {
        if username.trim().is_empty() || password.is_empty() {
            return Err(ServiceError::ValidationError(
                "Username and password are required".to_string(),
            ));
        }

        let credentials = Credentials {
            username: username.clone(),
            password: password.clone(),
            next: None,
        };

        match self.backend.authenticate(credentials).await {
            Ok(Some(user)) => {
                // Convert database User to models User
                Ok(User {
                    id: user.id,
                    username: user.username,
                    password, // We need to include password field for models::User
                })
            }
            Ok(None) => Err(ServiceError::InvalidCredentials),
            Err(e) => Err(ServiceError::DbError(e)),
        }
    }

    pub async fn get_user_by_id(&self, user_id: i64) -> Result<Option<User>, ServiceError> {
        match self.db.get_user_by_id(user_id).await? {
            Some(db_user) => Ok(Some(User {
                id: db_user.id,
                username: db_user.username,
                password: "[redacted]".to_string(), // Don't expose actual password
            })),
            None => Ok(None),
        }
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<User>, ServiceError> {
        match self.db.get_user_by_username(username).await? {
            Some(db_user) => Ok(Some(User {
                id: db_user.id,
                username: db_user.username,
                password: "[redacted]".to_string(), // Don't expose actual password
            })),
            None => Ok(None),
        }
    }
}

pub struct UserService {
    pool: SqlitePool,
    watcher_repo: WatcherRepository,
    #[allow(dead_code)]
    sync_repo: SyncRepository,
}

impl UserService {
    pub fn new(pool: SqlitePool) -> Self {
        let watcher_repo = WatcherRepository::new(pool.clone());
        let sync_repo = SyncRepository::new(pool.clone());

        Self {
            pool,
            watcher_repo,
            sync_repo,
        }
    }

    pub async fn update_profile(
        &self,
        user_id: i64,
        new_username: String,
    ) -> Result<(), ServiceError> {
        if new_username.trim().is_empty() {
            return Err(ServiceError::ValidationError(
                "Username cannot be empty".to_string(),
            ));
        }

        // Check if new username is already taken by another user
        if let Some(existing_user) = self.get_user_by_username(&new_username).await? {
            if existing_user.id != user_id {
                return Err(ServiceError::UserAlreadyExists);
            }
        }

        sqlx::query!(
            "UPDATE users SET username = ? WHERE id = ?",
            new_username,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<User>, ServiceError> {
        let row = sqlx::query!(
            "SELECT id, username FROM users WHERE username = ?",
            username
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(User {
                id: row.id,
                username: row.username,
                password: "[redacted]".to_string(), // Don't expose actual password
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_user_service_connections(
        &self,
        user_id: i64,
    ) -> Result<Vec<UserCredential>, ServiceError> {
        let rows = sqlx::query_as!(
            UserCredential,
            "SELECT * FROM user_credentials WHERE user_id = ?",
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn delete_service_connection(
        &self,
        user_id: i64,
        service: &str,
    ) -> Result<(), ServiceError> {
        // Validate service name
        if !["youtube_music", "spotify"].contains(&service) {
            return Err(ServiceError::ValidationError(format!(
                "Unsupported service: {}",
                service
            )));
        }

        let result = sqlx::query!(
            "DELETE FROM user_credentials WHERE user_id = ? AND service = ?",
            user_id,
            service
        )
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(ServiceError::ServiceConnectionNotFound);
        }

        Ok(())
    }

    pub async fn create_watcher(
        &self,
        user_id: i64,
        request: CreateWatcherRequest,
    ) -> Result<Watcher, ServiceError> {
        // Validate request
        if request.name.trim().is_empty() {
            return Err(ServiceError::ValidationError(
                "Watcher name cannot be empty".to_string(),
            ));
        }

        if request.source_service == request.target_service {
            return Err(ServiceError::ValidationError(
                "Source and target services cannot be the same".to_string(),
            ));
        }

        // Check if watcher name already exists for this user
        if (self
            .watcher_repo
            .get_watcher_by_name(user_id, &request.name)
            .await?).is_some()
        {
            return Err(ServiceError::WatcherNameExists);
        }

        let watcher = self.watcher_repo.create_watcher(user_id, request).await?;
        Ok(watcher)
    }

    pub async fn get_user_watchers(&self, user_id: i64) -> Result<Vec<Watcher>, ServiceError> {
        Ok(self.watcher_repo.get_watchers_by_user(user_id).await?)
    }

    pub async fn get_watcher_by_id_and_user(
        &self,
        watcher_id: i64,
        user_id: i64,
    ) -> Result<Option<Watcher>, ServiceError> {
        // Get all user watchers and find the one with matching ID
        let watchers = self.get_user_watchers(user_id).await?;
        Ok(watchers.into_iter().find(|w| w.id == watcher_id))
    }

    pub async fn update_watcher_status(
        &self,
        watcher_id: i64,
        user_id: i64,
        is_active: bool,
    ) -> Result<(), ServiceError> {
        // Verify the watcher belongs to the user
        if self
            .get_watcher_by_id_and_user(watcher_id, user_id)
            .await?
            .is_none()
        {
            return Err(ServiceError::WatcherNotFound);
        }

        self.watcher_repo
            .update_watcher_status(watcher_id, is_active)
            .await?;
        Ok(())
    }

    pub async fn get_watcher_sync_history(
        &self,
        watcher_id: i64,
        user_id: i64,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<SyncOperation>, ServiceError> {
        // Verify the watcher belongs to the user
        if self
            .get_watcher_by_id_and_user(watcher_id, user_id)
            .await?
            .is_none()
        {
            return Err(ServiceError::WatcherNotFound);
        }

        let limit = limit.unwrap_or(50).min(200); // Cap at 200
        let offset = offset.unwrap_or(0).max(0);

        let sync_operations = sqlx::query_as!(
            SyncOperation,
            r#"
            SELECT id, watcher_id, operation_type, status, songs_added, songs_removed, 
                   songs_failed, error_message, started_at, completed_at
            FROM sync_operations 
            WHERE watcher_id = ? 
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
            "#,
            watcher_id,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(sync_operations)
    }

    pub async fn get_dashboard_stats(&self, user_id: i64) -> Result<DashboardStats, ServiceError> {
        // Get total watchers
        let watchers = self.get_user_watchers(user_id).await?;
        let total_watchers = watchers.len() as i32;
        let active_watchers = watchers.iter().filter(|w| w.is_active).count() as i32;

        // Get recent sync operations count
        let recent_syncs_row = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM sync_operations so
            JOIN watchers w ON so.watcher_id = w.id
            WHERE w.user_id = ? AND so.started_at >= datetime('now', '-24 hours')
            "#,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        let recent_syncs = recent_syncs_row.count as i32;

        // Get service connections
        let connections = self.get_user_service_connections(user_id).await?;
        let connected_services = connections.len() as i32;

        Ok(DashboardStats {
            total_watchers,
            active_watchers,
            recent_syncs,
            connected_services,
        })
    }
}

#[derive(Debug)]
pub struct DashboardStats {
    pub total_watchers: i32,
    pub active_watchers: i32,
    pub recent_syncs: i32,
    pub connected_services: i32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
    use time::OffsetDateTime;

    async fn setup_test_db() -> Pool<Sqlite> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(":memory:")
            .await
            .expect("Failed to create test database");

        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create users table");

        sqlx::query(
            r#"
            CREATE TABLE user_credentials (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                service TEXT NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at DATETIME,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, service)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create user_credentials table");

        sqlx::query(
            r#"
            CREATE TABLE watchers (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                source_service TEXT NOT NULL,
                source_playlist_id TEXT NOT NULL,
                target_service TEXT NOT NULL,
                target_playlist_id TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                sync_frequency INTEGER NOT NULL DEFAULT 300,
                last_sync_at DATETIME,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, name)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create watchers table");

        sqlx::query(
            r#"
            CREATE TABLE sync_operations (
                id INTEGER PRIMARY KEY,
                watcher_id INTEGER NOT NULL,
                operation_type TEXT NOT NULL,
                status TEXT NOT NULL,
                songs_added INTEGER DEFAULT 0,
                songs_removed INTEGER DEFAULT 0,
                songs_failed INTEGER DEFAULT 0,
                error_message TEXT,
                started_at DATETIME NOT NULL,
                completed_at DATETIME,
                FOREIGN KEY (watcher_id) REFERENCES watchers (id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create sync_operations table");

        pool
    }

    #[tokio::test]
    async fn test_user_service_update_profile() {
        let pool = setup_test_db().await;
        let service = UserService::new(pool.clone());

        // Insert test user
        sqlx::query!("INSERT INTO users (id, username) VALUES (1, 'testuser')")
            .execute(&pool)
            .await
            .unwrap();

        // Test successful update
        let result = service.update_profile(1, "newusername".to_string()).await;
        assert!(result.is_ok());

        // Verify update
        let user = service
            .get_user_by_username("newusername")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(user.username, "newusername");
    }

    #[tokio::test]
    async fn test_user_service_validation_errors() {
        let pool = setup_test_db().await;
        let service = UserService::new(pool);

        // Test empty username
        let result = service.update_profile(1, "".to_string()).await;
        assert!(matches!(result, Err(ServiceError::ValidationError(_))));
    }

    #[tokio::test]
    async fn test_dashboard_stats() {
        let pool = setup_test_db().await;
        let service = UserService::new(pool.clone());

        // Insert test user
        sqlx::query!("INSERT INTO users (id, username) VALUES (1, 'testuser')")
            .execute(&pool)
            .await
            .unwrap();

        // Insert test data
        let now = OffsetDateTime::now_utc();
        sqlx::query!(
            "INSERT INTO watchers (user_id, name, source_service, source_playlist_id, target_service, target_playlist_id, created_at, updated_at) 
             VALUES (1, 'test_watcher', 'youtube_music', 'yt_123', 'spotify', 'sp_123', ?, ?)",
             now, now
        )
        .execute(&pool)
        .await
        .unwrap();

        let stats = service.get_dashboard_stats(1).await.unwrap();
        assert_eq!(stats.total_watchers, 1);
        assert_eq!(stats.active_watchers, 1);
    }
}
