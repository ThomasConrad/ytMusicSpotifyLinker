/// Spotify client wrapper around rspotify library
#[derive(Debug, Clone)]
pub struct SpotifyClient {
    // Implementation will be added in Phase 2
}

impl SpotifyClient {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for SpotifyClient {
    fn default() -> Self {
        Self::new()
    }
}