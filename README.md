# YouTube Music Spotify Linker

A full-stack application that synchronizes playlists between YouTube Music and Spotify using the Songlink API for cross-platform song matching.

## Architecture

- **Backend**: Rust with Axum web framework, SQLite database, session-based authentication
- **Frontend**: SolidJS with TypeScript, Tailwind CSS, and dark mode support
- **Song Matching**: Songlink/Odesli API integration for cross-platform song discovery

## Functionality Checklist

### ✅ Completed Features

#### Authentication & User Management
- [x] User registration and login system
- [x] Password hashing with Argon2
- [x] Session-based authentication
- [x] Protected API endpoints
- [x] User database schema

#### Database Infrastructure
- [x] SQLite database setup with migrations
- [x] User accounts table
- [x] Extended schema for playlist sync:
  - [x] `user_credentials` - OAuth tokens for external services
  - [x] `watchers` - Playlist sync configurations
  - [x] `playlists` - Cached playlist metadata
  - [x] `songs` - Song/track information with Songlink data
  - [x] `playlist_songs` - Playlist-song relationships
  - [x] `sync_operations` - Sync history and status
  - [x] `sync_results` - Individual song sync results

#### Song Matching Infrastructure
- [x] Complete Songlink API client implementation
- [x] Cross-platform song matching (YouTube Music, Spotify, Apple Music, etc.)
- [x] Comprehensive response parsing
- [x] Unit and integration tests for Songlink client
- [x] Example API response handling

#### Frontend Structure
- [x] SolidJS application with TypeScript
- [x] Responsive design with Tailwind CSS
- [x] Dark mode toggle functionality
- [x] Navigation and routing (Home, Login, Dashboard, About)
- [x] Theme context and animations

#### API Endpoints (Basic Implementation)
- [x] `GET /watchers` - List user's watchers
- [x] `POST /watchers` - Create new watcher
- [x] `GET/POST /watchers/{name}/ytmusic` - YouTube Music integration
- [x] `GET/POST /watchers/{name}/spotify` - Spotify integration
- [x] `GET /watchers/{name}/start` - Start watcher
- [x] `GET /watchers/{name}/stop` - Stop watcher
- [x] `GET /watchers/{name}/preview` - Preview sync changes

### 🚧 Partially Implemented

#### Watcher System
- [x] Basic watcher data models and repository
- [x] Database operations for watcher CRUD
- [ ] Background monitoring and sync execution
- [ ] Automatic playlist change detection
- [ ] Sync scheduling and frequency management

### ❌ Missing Core Features

#### OAuth Integration
- [ ] YouTube Music OAuth 2.0 flow
- [ ] Spotify OAuth 2.0 flow
- [ ] Token refresh handling
- [ ] Service connection management

#### Playlist Operations
- [ ] Fetch playlists from YouTube Music API
- [ ] Fetch playlists from Spotify API
- [ ] Create playlists on target services
- [ ] Add/remove songs from playlists
- [ ] Handle playlist permissions and privacy

#### Sync Logic
- [ ] Compare source and target playlists
- [ ] Song matching workflow using Songlink
- [ ] Handle failed matches and alternatives
- [ ] Incremental vs full sync modes
- [ ] Conflict resolution strategies

#### Frontend-Backend Integration
- [ ] Fix auth mismatch (frontend expects JWT, backend uses sessions)
- [ ] API client for frontend
- [ ] Dashboard playlist management UI
- [ ] Real-time sync status updates
- [ ] Error handling and user feedback

#### Advanced Features
- [ ] Bulk playlist operations
- [ ] Playlist sharing between users
- [ ] Custom sync rules and filters
- [ ] Sync history and analytics
- [ ] Notification system for sync results

## Development Status

### Current State
The application has a solid foundation with:
- Complete authentication system
- Comprehensive database schema
- Working Songlink integration
- Basic API structure
- Modern frontend framework setup

### Next Steps (Priority Order)
1. **OAuth Integration** - Connect to YouTube Music and Spotify APIs
2. **Playlist Fetching** - Implement API calls to retrieve playlists
3. **Frontend-Backend Auth Fix** - Standardize authentication method
4. **Core Sync Logic** - Implement playlist comparison and synchronization
5. **Background Processing** - Add automatic sync monitoring
6. **UI Enhancement** - Build dashboard for playlist management

## Getting Started

### Prerequisites
- Rust (latest stable)
- Node.js 18+
- SQLite

### Backend Development
```bash
cd backend
cargo run  # Starts server on port 3000
cargo test # Run tests
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev  # Starts dev server on port 5173
npm run lint
npm run format
```

### Database
- Database file: `backend/db.sqlite`
- Migrations applied automatically on startup
- Default test user: `ferris` / `hunter42`

## API Documentation

### Authentication
- Session-based authentication
- `/login` - User login (form-based)
- `/logout` - User logout
- `/register` - User registration (JSON)

### Protected Endpoints
All watcher endpoints require authentication:
- `GET /watchers` - List watchers
- `POST /watchers` - Create watcher
- `GET /watchers/{name}/start` - Start sync
- `GET /watchers/{name}/stop` - Stop sync
- `GET /watchers/{name}/preview` - Preview changes

## Contributing

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update this checklist when implementing features
4. Ensure both frontend and backend tests pass

## License

[Add license information]