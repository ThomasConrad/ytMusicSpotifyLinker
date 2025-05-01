use anyhow::Result;
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::path::Path;

const DEFAULT_DB_PATH: &str = "./db.sled";
const DEFAULT_HOST: &str = "0.0.0.0";
const DEFAULT_PORT: u16 = 3000;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    /// Path to the sled database
    #[serde(default = "default_db_path")]
    pub db_path: String,
    
    /// Host address to bind to
    #[serde(default = "default_host")]
    pub host: String,
    
    /// Port to listen on
    #[serde(default = "default_port")]
    pub port: u16,
    
    /// Songlink API key (optional)
    pub songlink_api_key: Option<String>,
    
    /// Log level (default from RUST_LOG env or fallback to info)
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

fn default_db_path() -> String {
    DEFAULT_DB_PATH.to_string()
}

fn default_host() -> String {
    DEFAULT_HOST.to_string()
}

fn default_port() -> u16 {
    DEFAULT_PORT
}

fn default_log_level() -> String {
    "axum_login=debug,tower_sessions=debug,tower_http=debug".to_string()
}

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        // Try to load .env file, but don't fail if it doesn't exist
        let _ = dotenv::dotenv();
        
        // Load from multiple sources in order, with later sources overriding earlier ones
        let config = Config::builder()
            // Start with defaults
            .set_default("db_path", DEFAULT_DB_PATH)?
            .set_default("host", DEFAULT_HOST)?
            .set_default("port", DEFAULT_PORT)?
            .set_default("log_level", default_log_level())?
            // Add in settings from the config file if it exists
            .add_source(File::with_name("config").required(false))
            // Add in settings from the environment
            // APP_DB_PATH, APP_HOST, APP_PORT, etc.
            .add_source(Environment::with_prefix("APP").separator("_"))
            // Build the config
            .build()?;
            
        // Deserialize the config into our strongly typed config
        config.try_deserialize()
    }
    
    /// Get the bind address string (host:port)
    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
    
    /// Check if database path exists, and create it if necessary
    pub fn ensure_db_path_exists(&self) -> Result<()> {
        let db_path = Path::new(&self.db_path);
        
        // Create parent directory if it doesn't exist
        if let Some(parent) = db_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        Ok(())
    }
}