// Watcher and sync related types

export interface WatcherSummary {
  id: number;
  name: string;
  sourceService: 'youtube_music' | 'spotify';
  targetService: 'youtube_music' | 'spotify';
  status: 'idle' | 'running' | 'error';
  lastSyncTime?: string;
  playlistName: string;
}

export interface CreateWatcherRequest {
  name: string;
  sourceService: 'youtube_music' | 'spotify';
  targetService: 'youtube_music' | 'spotify';
  sourcePlaylistId: string;
  targetPlaylistId?: string;
  createNewPlaylist?: boolean;
  newPlaylistName?: string;
}

export interface SyncPreviewItem {
  title: string;
  artist: string;
  action: 'add' | 'skip' | 'conflict';
  reason?: string;
  sourceId: string;
  targetId?: string;
}

export interface SyncPreview {
  watcherName: string;
  sourcePlaylist: string;
  targetPlaylist: string;
  items: SyncPreviewItem[];
  summary: {
    totalSongs: number;
    toAdd: number;
    toSkip: number;
    conflicts: number;
  };
}

// Watcher operation result types
export type WatcherResult<T> =
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

export type WatcherStatus = 'idle' | 'running' | 'error';
export type ServiceType = 'youtube_music' | 'spotify';
export type SyncAction = 'add' | 'skip' | 'conflict';
