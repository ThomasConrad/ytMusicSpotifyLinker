use crate::app::songlink::SonglinkClient;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WatcherError {
    #[error("Failed to initialize watcher")]
    InitializationError,
}

pub struct Watcher {
    /// The SonglinkClient instance that will be used for playlist synchronization.
    /// This field will be used in future implementations.
    #[allow(dead_code)]
    songlink_client: SonglinkClient,
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
        
        let handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(300)); // 5 minutes default
            
            loop {
                interval.tick().await;
                
                if let Err(e) = Self::sync_watcher(watcher_id, &pool, &songlink_client).await {
                    eprintln!("Error syncing watcher {}: {:?}", watcher_id, e);
                }
            }
        });
        
        let mut watchers = running_watchers.lock().await;
        watchers.insert(watcher_id, handle);
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
        songlink_client: &SonglinkClient,
    ) -> Result<()> {
        let watcher_repo = WatcherRepository::new(pool.clone());
        let sync_repo = SyncRepository::new(pool.clone());
        
        // Create sync operation record
        let sync_op = sync_repo.create_sync_operation(watcher_id, "auto_sync").await?;
        
        // TODO: Implement actual playlist fetching and comparison
        // For now, just mark as completed
        sync_repo.update_sync_operation(
            sync_op.id,
            "completed", 
            0, 0, 0, 
            None
        ).await?;
        
        // Update last sync time
        watcher_repo.update_last_sync(watcher_id).await?;
        
        Ok(())
    }
    
    pub async fn sync_watcher_now(&self, watcher_id: i64) -> Result<(), WatcherError> {
        Self::sync_watcher(watcher_id, &self.db_pool, &self.songlink_client)
            .await
            .map_err(|e| WatcherError::SyncError(e.to_string()))
    }
    
    pub async fn preview_sync(&self, watcher_id: i64) -> Result<crate::users::SyncPreviewResponse, WatcherError> {
        // TODO: Implement actual preview logic
        Ok(crate::users::SyncPreviewResponse {
            songs_to_add: vec![],
            songs_to_remove: vec![],
            songs_failed: vec![],
        })
    }
}
