// src/songlink_api.rs
#![allow(dead_code)]
use std::collections::HashMap;

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Deserializer};
use url::Url;

/// A wrapper around `Url` that trims extraneous angle brackets before parsing.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UrlWrapper(pub Url);

impl<'de> Deserialize<'de> for UrlWrapper {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        // Remove any leading/trailing angle brackets.
        let trimmed = s.trim_matches(|c| c == '<' || c == '>');
        let url = Url::parse(trimmed).map_err(serde::de::Error::custom)?;
        Ok(UrlWrapper(url))
    }
}

#[derive(Clone)]
pub struct SonglinkClient {
    client: Client,
    base_url: String,
    // Optionally, you can store an API key if provided.
    api_key: Option<String>,
}

impl SonglinkClient {
    /// Create a new SonglinkClient. `api_key` is optional.
    pub fn new(api_key: Option<String>) -> Self {
        SonglinkClient {
            client: Client::new(),
            base_url: "https://api.song.link/v1-alpha.1".to_string(),
            api_key,
        }
    }

    /// Fetch links for a given song URL.
    ///
    /// # Arguments
    ///
    /// * `song_url` - A URL of a song or album from a supported platform.
    /// * `user_country` - Optional two-letter country code, defaults to "US" if None.
    /// * `song_if_single` - Optional flag to enable improved matching for singles.
    ///
    /// # Example
    ///
    /// ```rust
    /// let client = SonglinkClient::new(None);
    /// let response = client.fetch_links("spotify:track:0Jcij1eWd5bDMU5iPbxe2i", Some("US"), Some(true)).await?;
    /// println!("{:#?}", response);
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    pub async fn fetch_links(
        &self,
        song_url: &str,
        user_country: Option<&str>,
        song_if_single: Option<bool>,
    ) -> Result<LinksResponse> {
        let url = format!("{}/links", self.base_url);

        // Build the request with query parameters.
        let mut req = self.client.get(&url).query(&[("url", song_url)]);

        // Use provided user country or default to "US"
        let country = user_country.unwrap_or("US");
        req = req.query(&[("userCountry", country)]);

        // Optionally set songIfSingle flag.
        if let Some(flag) = song_if_single {
            req = req.query(&[("songIfSingle", flag.to_string().as_str())]);
        }

        // Optionally add API key.
        if let Some(ref key) = self.api_key {
            req = req.query(&[("key", key)]);
        }

        // Send the request and handle errors.
        let resp = req
            .send()
            .await
            .context("Failed to send request to Songlink API")?;

        // Check for HTTP errors.
        let resp = resp
            .error_for_status()
            .context("Songlink API returned an error")?;

        // Deserialize the response.
        let links_response = resp
            .json::<LinksResponse>()
            .await
            .context("Failed to deserialize Songlink API response")?;

        Ok(links_response)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinksResponse {
    /// The unique ID for the input entity that was supplied in the request.
    /// The data for this entity, such as title, artistName, etc. will be found in
    /// an object at `entitiesByUniqueId[entityUniqueId]`
    pub entity_unique_id: String,

    /// The userCountry query param that was supplied in the request.
    pub user_country: String,

    /// A URL that will render the Songlink page for this entity
    pub page_url: UrlWrapper,

    /// A collection of objects. Each key is a platform and each value is the
    /// linking information for that platform.
    pub links_by_platform: HashMap<Platform, Link>,

    /// A collection of objects. Each key is a unique identifier for a streaming
    /// entity and each value is the entity's data.
    pub entities_by_unique_id: HashMap<String, Entity>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    /// The unique ID for this entity. Use it to look up data about this entity
    /// at `entitiesByUniqueId[entityUniqueId]`
    pub entity_unique_id: String,
    /// The URL for this match
    pub url: UrlWrapper,
    /// The native app URI that can be used on mobile devices
    #[serde(skip_serializing_if = "Option::is_none")]
    pub native_app_uri_mobile: Option<UrlWrapper>,
    /// The native app URI that can be used on desktop devices
    #[serde(skip_serializing_if = "Option::is_none")]
    pub native_app_uri_desktop: Option<UrlWrapper>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entity {
    /// This is the unique identifier on the streaming platform/API provider
    pub id: String,
    /// The type of the streaming entity: song or album.
    #[serde(rename = "type")]
    pub entity_type: EntityType,
    /// Optional title of the entity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Optional artist name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artist_name: Option<String>,
    /// Optional thumbnail URL.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_url: Option<UrlWrapper>,
    /// Optional thumbnail width.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_width: Option<u32>,
    /// Optional thumbnail height.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_height: Option<u32>,
    /// The API provider that powered this match.
    pub api_provider: APIProvider,
    /// An array of platforms that are "powered" by this entity.
    pub platforms: Vec<Platform>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EntityType {
    #[serde(rename = "song")]
    Song,
    #[serde(rename = "album")]
    Album,
}

#[derive(Debug, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum Platform {
    Spotify,
    Itunes,
    AppleMusic,
    Youtube,
    YoutubeMusic,
    Google,
    GoogleStore,
    Pandora,
    Deezer,
    Tidal,
    AmazonStore,
    AmazonMusic,
    Soundcloud,
    Napster,
    Yandex,
    Spinrilla,
    Audius,
    Audiomack,
    Anghami,
    Boomplay,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum APIProvider {
    Spotify,
    Itunes,
    Youtube,
    Google,
    Pandora,
    Deezer,
    Tidal,
    Amazon,
    Soundcloud,
    Napster,
    Yandex,
    Spinrilla,
    Audius,
    Audiomack,
    Anghami,
    Boomplay,
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::{Method::GET, MockServer};
    use tokio;

    #[tokio::test]
    async fn test_fetch_links_success() {
        // Start a local HTTP mock server.
        let server = MockServer::start_async().await;

        // Create a dummy response that resembles the API response.
        let dummy_response: serde_json::Value =
            serde_json::from_str(include_str!("example_response.json"))
                .expect("Invalid JSON in example_response.json");

        // Create a mock for the /links endpoint.
        let mock = server
            .mock_async(|when, then| {
                when.method(GET)
                    .path("/links")
                    .query_param("url", "test_song_url")
                    .query_param("userCountry", "US");
                then.status(200)
                    .header("content-type", "application/json")
                    .json_body_obj(&dummy_response);
            })
            .await;

        // Instantiate the client with the mock server URL.
        let client = SonglinkClient {
            client: Client::new(),
            base_url: server.url(""),
            api_key: None,
        };

        // Call fetch_links with the dummy song URL.
        let result = client
            .fetch_links("test_song_url", Some("US"), Some(true))
            .await;

        // Ensure our mock was called.
        mock.assert_async().await;

        // Validate the response.
        let response = result.expect("Failed to get response");
        assert_eq!(response.entity_unique_id, "ITUNES_SONG::1443109064");
        assert_eq!(response.user_country, "US");
        assert_eq!(
            response.page_url.0.as_str(),
            "https://song.link/us/i/1443109064"
        );
    }

    #[tokio::test]
    async fn test_fetch_links_http_error() {
        let server = MockServer::start_async().await;

        // Create a mock that returns a 400 error.
        let mock = server
            .mock_async(|when, then| {
                when.method(GET)
                    .path("/links")
                    .query_param("url", "bad_url");
                then.status(400);
            })
            .await;

        let client = SonglinkClient {
            client: Client::new(),
            base_url: server.url(""),
            api_key: None,
        };

        // Call fetch_links with a URL that triggers an error.
        let result = client.fetch_links("bad_url", None, None).await;

        // Ensure our mock was called.
        mock.assert_async().await;

        // The result should be an error.
        assert!(result.is_err());
    }

    #[tokio::test]
    #[ignore]
    async fn test_fetch_links_live_success() {
        // This is a known Spotify track URI.
        let test_song_url = "spotify:track:0Jcij1eWd5bDMU5iPbxe2i";
        let client = SonglinkClient::new(None);
        let result = client
            .fetch_links(test_song_url, Some("US"), Some(true))
            .await;
        assert!(
            result.is_ok(),
            "Expected successful response from Odesli API"
        );

        let response = result.unwrap();
        // Check some expected fields. Adjust expectations based on real API responses.
        assert!(
            !response.entity_unique_id.is_empty(),
            "entityUniqueId should not be empty"
        );
        assert_eq!(response.user_country, "US");
        assert!(
            !response.page_url.0.as_str().is_empty(),
            "pageUrl should not be empty"
        );
        // Further assertions can be added if you want to check specific platforms.
    }

    #[tokio::test]
    #[ignore]
    async fn test_fetch_links_live_invalid_url() {
        // Pass an invalid song URL to simulate an error.
        let client = SonglinkClient::new(None);
        let result = client
            .fetch_links("invalid_song_url", Some("US"), None)
            .await;
        assert!(
            result.is_err(),
            "Expected error response from Odesli API with invalid URL"
        );
    }
}
