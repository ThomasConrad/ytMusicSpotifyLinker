use crate::app::songlink::SonglinkClient;
use crate::app::spotify::SpotifySyncService;
use crate::users::repository::{WatcherRepository, SyncRepository};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::time::{interval, Duration};
use anyhow::Result;

#[derive(Debug, Clone)]
struct SyncResult {
    songs_added: i32,
    songs_removed: i32,
    songs_failed: i32,
}

#[derive(Error, Debug)]
pub enum WatcherError {
    #[error("Failed to initialize watcher")]
    InitializationError,
    #[error("Sync error: {0}")]
    SyncError(String),
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Service error: {0}")]
    ServiceError(String),
    #[error("Repository error: {0}")]
    RepositoryError(#[from] anyhow::Error),
}

pub struct Watcher {
    /// The SonglinkClient instance that will be used for playlist synchronization.
    songlink_client: SonglinkClient,
    /// Database connection pool
    db_pool: SqlitePool,
    /// Currently running watcher tasks
    running_watchers: Arc<tokio::sync::Mutex<HashMap<i64, tokio::task::JoinHandle<()>>>>,
}

impl Watcher {
    pub async fn new(db_pool: SqlitePool) -> Result<Self, WatcherError> {
        let watcher = Self {
            songlink_client: SonglinkClient::new(None),
            db_pool,
            running_watchers: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
        };
        
        // Start monitoring active watchers
        watcher.start_monitoring().await?;
        
        Ok(watcher)
    }
    
    async fn start_monitoring(&self) -> Result<(), WatcherError> {
        let repo = WatcherRepository::new(self.db_pool.clone());
        let active_watchers = repo.get_active_watchers().await?;
        
        for watcher in active_watchers {
            self.start_watcher_task(watcher.id).await;
        }
        
        Ok(())
    }
    
    pub async fn start_watcher_task(&self, watcher_id: i64) {
        let pool = self.db_pool.clone();
        let songlink_client = self.songlink_client.clone();
        let running_watchers = self.running_watchers.clone();
        
        // Get the watcher's sync frequency
        let watcher_repo = WatcherRepository::new(pool.clone());
        let sync_frequency = match watcher_repo.get_watcher_by_id(watcher_id).await {
            Ok(Some(watcher)) => {
                // Ensure minimum 5 minutes (300 seconds) as per requirements
                std::cmp::max(watcher.sync_frequency as u64, 300)
            }
            _ => {
                tracing::warn!("Could not get watcher {}, using default frequency", watcher_id);
                300 // 5 minutes default
            }
        };
        
        let handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(sync_frequency));
            
            loop {
                interval.tick().await;
                
                if let Err(e) = Self::sync_watcher(watcher_id, &pool, &songlink_client).await {
                    tracing::error!("Error syncing watcher {}: {:?}", watcher_id, e);
                }
            }
        });
        
        let mut watchers = running_watchers.lock().await;
        watchers.insert(watcher_id, handle);
        
        tracing::info!("Started watcher task {} with {}s interval", watcher_id, sync_frequency);
    }
    
    pub async fn stop_watcher_task(&self, watcher_id: i64) {
        let mut watchers = self.running_watchers.lock().await;
        if let Some(handle) = watchers.remove(&watcher_id) {
            handle.abort();
        }
    }
    
    async fn sync_watcher(
        watcher_id: i64,
        pool: &SqlitePool,
        _songlink_client: &SonglinkClient,
    ) -> Result<()> {
        let watcher_repo = WatcherRepository::new(pool.clone());
        let sync_repo = SyncRepository::new(pool.clone());
        
        // Get watcher configuration
        let watcher = match watcher_repo.get_watcher_by_id(watcher_id).await? {
            Some(w) => w,
            None => {
                tracing::warn!("Watcher {} not found", watcher_id);
                return Ok(());
            }
        };
        
        // Check if watcher is still active
        if !watcher.is_active {
            tracing::info!("Watcher {} is inactive, skipping sync", watcher_id);
            return Ok(());
        }
        
        // Create sync operation record
        let sync_op = sync_repo.create_sync_operation(watcher_id, "auto_sync").await?;
        
        // Perform sync based on source service
        let result = match watcher.source_service.as_str() {
            "spotify" => Self::sync_spotify_watcher(watcher_id, &watcher, pool).await,
            _ => {
                let error_msg = format!("Unsupported source service: {}", watcher.source_service);
                tracing::error!("{}", error_msg);
                Err(anyhow::anyhow!(error_msg))
            }
        };
        
        // Update sync operation based on result
        match result {
            Ok(sync_result) => {
                sync_repo.update_sync_operation(
                    sync_op.id,
                    "completed",
                    sync_result.songs_added,
                    sync_result.songs_removed,
                    sync_result.songs_failed,
                    None,
                ).await?;
                
                // Update last sync time
                watcher_repo.update_last_sync(watcher_id).await?;
                
                tracing::info!(
                    "Sync completed for watcher {}: +{} -{} failed:{}", 
                    watcher_id, 
                    sync_result.songs_added, 
                    sync_result.songs_removed, 
                    sync_result.songs_failed
                );
            }
            Err(e) => {
                let error_msg = e.to_string();
                sync_repo.update_sync_operation(
                    sync_op.id,
                    "failed",
                    0,
                    0,
                    0,
                    Some(&error_msg),
                ).await?;
                
                tracing::error!("Sync failed for watcher {}: {}", watcher_id, error_msg);
                
                // TODO: Consider pausing watcher after repeated failures
            }
        }
        
        Ok(())
    }
    
    async fn sync_spotify_watcher(
        watcher_id: i64,
        _watcher: &crate::users::models::Watcher,
        pool: &SqlitePool,
    ) -> Result<SyncResult> {
        // Get environment variables for Spotify client
        let client_id = std::env::var("SPOTIFY_CLIENT_ID")
            .map_err(|_| anyhow::anyhow!("SPOTIFY_CLIENT_ID not set"))?;
        let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
            .map_err(|_| anyhow::anyhow!("SPOTIFY_REDIRECT_URI not set"))?;
        
        // Create Spotify sync service
        let sync_service = SpotifySyncService::new(client_id, redirect_uri, pool.clone());
        
        // Execute the sync operation
        let operation_result = sync_service.sync_playlist_to_target(watcher_id).await
            .map_err(|e| anyhow::anyhow!("Spotify sync failed: {}", e))?;
        
        // Convert the operation result to our internal format
        Ok(SyncResult {
            songs_added: operation_result.songs_added,
            songs_removed: operation_result.songs_removed,
            songs_failed: operation_result.songs_failed,
        })
    }
    
    pub async fn sync_watcher_now(&self, watcher_id: i64) -> Result<(), WatcherError> {
        Self::sync_watcher(watcher_id, &self.db_pool, &self.songlink_client)
            .await
            .map_err(|e| WatcherError::SyncError(e.to_string()))
    }
    
    pub async fn preview_sync(&self, watcher_id: i64) -> Result<crate::users::models::SyncPreviewResponse, WatcherError> {
        let watcher_repo = WatcherRepository::new(self.db_pool.clone());
        
        // Get watcher configuration
        let watcher = match watcher_repo.get_watcher_by_id(watcher_id).await? {
            Some(w) => w,
            None => {
                return Err(WatcherError::ServiceError("Watcher not found".to_string()));
            }
        };
        
        // Preview sync based on source service
        match watcher.source_service.as_str() {
            "spotify" => self.preview_spotify_sync(&watcher).await,
            _ => {
                Err(WatcherError::ServiceError(
                    format!("Unsupported source service: {}", watcher.source_service)
                ))
            }
        }
    }
    
    async fn preview_spotify_sync(&self, watcher: &crate::users::models::Watcher) -> Result<crate::users::models::SyncPreviewResponse, WatcherError> {
        // Get environment variables for Spotify client
        let client_id = std::env::var("SPOTIFY_CLIENT_ID")
            .map_err(|_| WatcherError::ServiceError("SPOTIFY_CLIENT_ID not set".to_string()))?;
        let redirect_uri = std::env::var("SPOTIFY_REDIRECT_URI")
            .map_err(|_| WatcherError::ServiceError("SPOTIFY_REDIRECT_URI not set".to_string()))?;
        
        // Create Spotify sync service
        let sync_service = SpotifySyncService::new(client_id, redirect_uri, self.db_pool.clone());
        
        // Execute the preview
        sync_service.preview_sync(
            watcher.user_id,
            &watcher.source_playlist_id,
            &watcher.target_service,
            watcher.target_playlist_id.as_deref(),
        ).await
        .map_err(|e| WatcherError::ServiceError(format!("Spotify preview failed: {}", e)))
    }
}
