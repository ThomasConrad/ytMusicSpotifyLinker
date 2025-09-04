// Spotify integration types matching backend API responses

// Spotify User Profile
export interface SpotifyUserProfile {
  id: string;
  display_name?: string;
  email?: string;
  followers: number;
  premium: boolean;
}

// Spotify Authentication
export interface SpotifyAuthUrlResponse {
  success: boolean;
  auth_url?: string;
  error?: string;
}

export interface SpotifyAuthStatusResponse {
  success: boolean;
  authenticated: boolean;
  user_profile?: SpotifyUserProfile;
  error?: string;
}

// Spotify Playlists
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  track_count: number;
  is_public: boolean;
  owner_id: string;
  owner_display_name?: string;
  image_url?: string;
  external_url: string;
}

export interface SpotifyPlaylistsResponse {
  success: boolean;
  playlists: SpotifyPlaylist[];
  error?: string;
}

export interface SpotifyPlaylistDetailResponse {
  success: boolean;
  playlist?: SpotifyPlaylist;
  error?: string;
}

// Spotify Tracks
export interface SpotifyTrack {
  id?: string;
  name: string;
  artists: string[];
  album?: string;
  duration_ms?: number;
  external_url?: string;
  is_playable: boolean;
  added_at?: string;
}

export interface SpotifyPlaylistTracksResponse {
  success: boolean;
  tracks: SpotifyTrack[];
  total: number;
  error?: string;
}

// Playlist Creation
export interface CreateSpotifyPlaylistRequest {
  name: string;
  description?: string;
  public?: boolean;
}

// Sync Operations
export interface SpotifySyncPreviewRequest {
  source_playlist_id: string;
  target_service: string;
  target_playlist_id?: string;
}

export interface SpotifySyncExecuteRequest {
  watcher_id: number;
}

export interface SpotifySyncPreviewResponse {
  success: boolean;
  preview?: {
    songs_to_add: SpotifySongPreview[];
    songs_to_remove: SpotifySongPreview[];
    songs_failed: SpotifySongFailure[];
  };
  error?: string;
}

export interface SpotifySyncOperationResponse {
  success: boolean;
  operation?: {
    id: number;
    operation_type: string;
    status: string;
    songs_added: number;
    songs_removed: number;
    songs_failed: number;
    error_message?: string;
    started_at: string;
    completed_at?: string;
  };
  error?: string;
}

export interface SpotifySyncStatusResponse {
  success: boolean;
  status?: string;
  operation?: SpotifySyncOperationResponse['operation'];
  error?: string;
}

// Helper types for sync operations
export interface SpotifySongPreview {
  id: number;
  service: string;
  external_id: string;
  title: string;
  artist?: string;
  album?: string;
  duration_ms?: number;
}

export interface SpotifySongFailure {
  title: string;
  artist?: string;
  error: string;
}

// Generic API responses
export interface SpotifyApiSuccessResponse {
  success: boolean;
  message: string;
}

export interface SpotifyApiErrorResponse {
  success: boolean;
  error: string;
}

// Connection status
export interface SpotifyConnectionStatus {
  service: 'spotify';
  connected: boolean;
  user_profile?: SpotifyUserProfile;
  username?: string;
  connectedAt?: string;
  lastRefresh?: string;
}

// UI State types
export interface SpotifyUIState {
  isAuthenticating: boolean;
  isLoadingPlaylists: boolean;
  isCreatingPlaylist: boolean;
  isSyncing: boolean;
  selectedPlaylist?: SpotifyPlaylist;
  connectionStatus: SpotifyConnectionStatus;
}

// Error types
export interface SpotifyError {
  type: 'auth' | 'api' | 'network' | 'permission';
  message: string;
  details?: string;
  retryable: boolean;
}

// Operation result types following existing patterns
export type SpotifyResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      error_code?: string;
      field_errors?: Record<string, string>;
    };

// Spotify-specific operation states
export type SpotifyAuthState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';
export type SpotifyPlaylistVisibility = 'public' | 'private';
export type SpotifySyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

// Form types for UI components
export interface SpotifyPlaylistFormData {
  name: string;
  description: string;
  isPublic: boolean;
}

export interface SpotifyWatcherConfig {
  sourcePlaylistId: string;
  targetService: 'youtube_music';
  targetPlaylistId?: string;
  createNewPlaylist: boolean;
  newPlaylistName?: string;
  syncFrequency: number; // in minutes, minimum 5
}

// Dashboard integration
export interface SpotifyDashboardData {
  connectionStatus: SpotifyConnectionStatus;
  recentPlaylists: SpotifyPlaylist[];
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    lastSyncTime?: string;
  };
  errors: SpotifyError[];
}
