use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::Deserialize;

use crate::users::AuthSession;

pub fn router() -> Router<()> {
    Router::new()
        // /watchers endpoints
        .route(
            "/watchers",
            get(get::list_watchers).post(post::create_watcher),
        )
        // /watchers/{watchername}/ytmusic endpoints
        .route(
            "/watchers/{watchername}/ytmusic",
            get(get::get_ytmusic).post(post::post_ytmusic),
        )
        // /watchers/{watchername}/ytmusic/songs endpoint
        .route(
            "/watchers/{watchername}/ytmusic/songs",
            get(get::get_ytmusic_songs),
        )
        // /watchers/{watchername}/spotify endpoints
        .route(
            "/watchers/{watchername}/spotify",
            get(get::get_spotify).post(post::post_spotify),
        )
        // /watchers/{watchername}/spotify/songs endpoint
        .route(
            "/watchers/{watchername}/spotify/songs",
            get(get::get_spotify_songs),
        )
        // /watchers/{watchername}/share endpoint
        .route("/watchers/{watchername}/share", post(post::share_watcher))
        // /watchers/{watchername}/start endpoint
        .route("/watchers/{watchername}/start", get(get::start_watcher))
        // /watchers/{watchername}/stop endpoint
        .route("/watchers/{watchername}/stop", get(get::stop_watcher))
        // /watchers/{watchername}/preview endpoint
        .route("/watchers/{watchername}/preview", get(get::preview_watcher))
}

mod get {
    use super::*;

    pub async fn list_watchers(auth_session: AuthSession) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok("List of watchers")
    }

    pub async fn get_ytmusic(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Getting YouTube Music for watcher: {}",
            watchername
        ))
    }

    pub async fn get_ytmusic_songs(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Getting YouTube Music songs for watcher: {}",
            watchername
        ))
    }

    pub async fn get_spotify(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!("Getting Spotify for watcher: {}", watchername))
    }

    pub async fn get_spotify_songs(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Getting Spotify songs for watcher: {}",
            watchername
        ))
    }

    pub async fn start_watcher(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!("Started watcher: {}", watchername))
    }

    pub async fn stop_watcher(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!("Stopped watcher: {}", watchername))
    }

    pub async fn preview_watcher(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!("Previewing watcher: {}", watchername))
    }
}

mod post {
    use super::*;

    pub async fn create_watcher(
        auth_session: AuthSession,
        body: String,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!("Created watcher with name: {}", body))
    }

    pub async fn post_ytmusic(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
        body: String,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Posted to YouTube Music for watcher: {} with data: {}",
            watchername, body
        ))
    }

    #[derive(Deserialize)]
    pub struct SpotifyData {
        pub playlist: String,
    }

    pub async fn post_spotify(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
        Json(data): Json<SpotifyData>,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Posted to Spotify for watcher: {} with playlist: {}",
            watchername, data.playlist
        ))
    }

    pub async fn share_watcher(
        auth_session: AuthSession,
        Path(watchername): Path<String>,
        body: String,
    ) -> Result<impl IntoResponse, StatusCode> {
        auth_required(auth_session)?;
        Ok(format!(
            "Shared watcher: {} with user: {}",
            watchername, body
        ))
    }
}

// Shared helper function for authentication
fn auth_required(auth_session: AuthSession) -> Result<(), StatusCode> {
    match auth_session.user {
        Some(_) => Ok(()),
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
