# YT Music Spotify Linker Backend

A backend service to synchronize playlists between YouTube Music and Spotify.

## Features

- REST API for playlist management and synchronization
- Session-based authentication
- Sled database for all-Rust storage
- Integration with Songlink API for cross-platform music linking

## Getting Started

### Prerequisites

- Rust (latest stable version recommended)
- Songlink API key (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/ytMusicSpotifyLinker.git
   cd ytMusicSpotifyLinker/backend
   ```

2. Copy the example environment file and modify as needed:
   ```
   cp .env.example .env
   ```

3. Build and run the application:
   ```
   cargo run
   ```

## Configuration

The application can be configured through environment variables or a `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_DB_PATH` | Path to the Sled database | `./db.sled` |
| `APP_HOST` | Host to bind to | `0.0.0.0` |
| `APP_PORT` | Port to listen on | `3000` |
| `APP_SONGLINK_API_KEY` | Songlink API key (optional) | `None` |
| `APP_LOG_LEVEL` | Log level configuration | `axum_login=debug,tower_sessions=debug,tower_http=debug` |

## API Endpoints

- `GET /watchers` - List all watchers
- `POST /watchers` - Create a new watcher
- `GET /watchers/{name}/ytmusic` - Get YouTube Music configuration
- `POST /watchers/{name}/ytmusic` - Set YouTube Music configuration
- `GET /watchers/{name}/ytmusic/songs` - List YouTube Music songs
- `GET /watchers/{name}/spotify` - Get Spotify configuration
- `POST /watchers/{name}/spotify` - Set Spotify configuration
- `GET /watchers/{name}/spotify/songs` - List Spotify songs
- `POST /watchers/{name}/share` - Share a watcher with another user
- `GET /watchers/{name}/start` - Start a watcher
- `GET /watchers/{name}/stop` - Stop a watcher
- `GET /watchers/{name}/preview` - Preview synchronization changes

## Authentication

The application uses session-based authentication:

- `GET /login` - Show login form
- `POST /login` - Authenticate user
- `GET /logout` - Log out user