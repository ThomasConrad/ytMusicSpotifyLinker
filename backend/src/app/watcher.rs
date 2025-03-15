use crate::app::songlink::{LinksResponse, SonglinkClient};

pub struct Watcher {
    songlink_client: SonglinkClient,
}

impl Watcher {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            songlink_client: SonglinkClient::new(None),
        })
    }
}
