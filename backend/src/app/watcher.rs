use crate::app::songlink::SonglinkClient;

pub struct Watcher {
    #[allow(dead_code)] // Will be used in future implementations
    songlink_client: SonglinkClient,
}

impl Watcher {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            songlink_client: SonglinkClient::new(None),
        })
    }
}
