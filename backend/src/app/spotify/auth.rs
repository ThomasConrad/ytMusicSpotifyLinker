/// Spotify authentication service for OAuth 2.0 PKCE flow
#[derive(Debug, Clone)]
pub struct SpotifyAuthService {
    // Implementation will be added in Phase 2
}

impl SpotifyAuthService {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for SpotifyAuthService {
    fn default() -> Self {
        Self::new()
    }
}