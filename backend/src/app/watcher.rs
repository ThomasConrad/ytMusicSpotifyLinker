use crate::app::songlink::SonglinkClient;
use crate::config::AppConfig;

pub struct Watcher {
    #[allow(dead_code)] // Will be used in future implementations
    songlink_client: SonglinkClient,
}

impl Watcher {
    pub async fn new(config: &AppConfig) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            songlink_client: SonglinkClient::new(config.songlink_api_key.clone()),
        })
    }
}
