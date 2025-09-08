-- Add tables for playlist synchronization functionality

-- Store OAuth credentials for external services
CREATE TABLE user_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service TEXT NOT NULL, -- 'youtube_music', 'spotify'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, service)
);

-- Store playlist watchers (sync configurations)
CREATE TABLE watchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    source_service TEXT NOT NULL, -- 'youtube_music', 'spotify'
    source_playlist_id TEXT NOT NULL,
    target_service TEXT NOT NULL, -- 'youtube_music', 'spotify'
    target_playlist_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sync_frequency INTEGER DEFAULT 300, -- seconds
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- Store playlists from external services
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL, -- 'youtube_music', 'spotify'
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    total_tracks INTEGER DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    owner_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, external_id)
);

-- Store individual songs/tracks
CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL, -- 'youtube_music', 'spotify'
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    duration_ms INTEGER,
    songlink_data TEXT, -- JSON from Songlink API
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, external_id)
);

-- Junction table for playlist-song relationships
CREATE TABLE playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
    UNIQUE(playlist_id, song_id, position)
);

-- Store sync operations and their results
CREATE TABLE sync_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watcher_id INTEGER NOT NULL,
    operation_type TEXT NOT NULL, -- 'full_sync', 'incremental', 'preview'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    songs_added INTEGER DEFAULT 0 NOT NULL,
    songs_removed INTEGER DEFAULT 0 NOT NULL,
    songs_failed INTEGER DEFAULT 0 NOT NULL,
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (watcher_id) REFERENCES watchers (id) ON DELETE CASCADE
);

-- Store individual song sync results
CREATE TABLE sync_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_operation_id INTEGER NOT NULL,
    source_song_id INTEGER NOT NULL,
    target_song_id INTEGER,
    status TEXT NOT NULL, -- 'matched', 'added', 'failed', 'not_found'
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sync_operation_id) REFERENCES sync_operations (id) ON DELETE CASCADE,
    FOREIGN KEY (source_song_id) REFERENCES songs (id),
    FOREIGN KEY (target_song_id) REFERENCES songs (id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_credentials_user_service ON user_credentials(user_id, service);
CREATE INDEX idx_watchers_user_id ON watchers(user_id);
CREATE INDEX idx_watchers_active ON watchers(is_active);
CREATE INDEX idx_playlists_service_external ON playlists(service, external_id);
CREATE INDEX idx_songs_service_external ON songs(service, external_id);
CREATE INDEX idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX idx_sync_operations_watcher ON sync_operations(watcher_id);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_results_operation ON sync_results(sync_operation_id);
