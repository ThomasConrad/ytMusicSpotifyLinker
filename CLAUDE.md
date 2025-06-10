# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a full-stack application for linking YouTube Music and Spotify playlists:

- **Backend**: Rust application using Axum web framework with SQLite database
  - Entry point: `backend/src/main.rs` 
  - Core modules: `Router` (API/auth) and `Watcher` (playlist sync)
  - Authentication system using axum-login with session management
  - Database migrations handled by SQLx
  - SonglinkClient for playlist synchronization (future implementation)

- **Frontend**: SolidJS application with TypeScript and Tailwind CSS
  - Built with Vite, uses SolidJS Router
  - Theme system with dark mode support
  - Pages: Home, Login, Dashboard, About

## Common Commands

### Backend (Rust)
```bash
# Run backend server (from project root)
cargo run

# Run tests
cargo test

# Run specific test
cargo test test_name

# Run e2e tests
cargo test --test e2e

# Check code
cargo check

# Format code
cargo fmt
```

### Frontend (JavaScript/TypeScript)
```bash
# Change to frontend directory first
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

### Database
- SQLite database located at `backend/db.sqlite`
- Migrations in `backend/migrations/`
- Database automatically migrated on startup

## Development Notes

- Backend runs on port 3000
- Frontend dev server typically runs on port 5173 (Vite default)
- Session store uses SQLite with 1-day expiry on inactivity
- Authentication templates in `backend/templates/`