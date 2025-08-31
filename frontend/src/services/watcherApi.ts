// Watcher API service

import { apiClient, ApiResponse } from "./apiClient";
import { AuthResult } from "./authApi";

// Types matching backend API responses
export interface Watcher {
  id: number;
  name: string;
  source_service: string;
  source_playlist_id: string;
  target_service: string;
  target_playlist_id?: string;
  is_active: boolean;
  sync_frequency: number;
  last_sync_at?: string;
  created_at: string;
}

export interface WatcherSummary {
  id: number;
  name: string;
  source_service: string;
  target_service: string;
  is_active: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  total_songs?: number;
  sync_success_rate?: number;
  created_at: string;
  source_playlist_id: string;
  target_playlist_id?: string;
  sync_frequency: number;
}

export interface SyncOperationSummary {
  id: number;
  operation_type: string;
  status: string;
  songs_added: number;
  songs_removed: number;
  songs_failed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface WatcherStatistics {
  total_sync_operations: number;
  successful_syncs: number;
  failed_syncs: number;
  success_rate: number;
  total_songs_synced: number;
  average_sync_time_seconds?: number;
}

export interface WatcherStatusDetail {
  watcher: WatcherSummary;
  recent_sync_operations: SyncOperationSummary[];
  statistics: WatcherStatistics;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface SyncHistoryResponse {
  watcher_id: number;
  watcher_name: string;
  operations: SyncOperationSummary[];
  pagination: PaginationInfo;
}

export interface CreateWatcherRequest {
  name: string;
  source_service: string;
  source_playlist_id: string;
  target_service: string;
  target_playlist_id?: string;
  sync_frequency?: number;
}

export interface SongResponse {
  id: number;
  service: string;
  external_id: string;
  title: string;
  artist?: string;
  album?: string;
  duration_ms?: number;
}

export interface SongFailure {
  title: string;
  artist?: string;
  error: string;
}

export interface SyncPreviewResponse {
  message: string;
  songs_to_add: SongResponse[];
  songs_to_remove: SongResponse[];
  songs_failed: SongFailure[];
}

export interface WatcherActionResponse {
  message: string;
  status: string;
}

export class WatcherApiService {
  private basePath = "/watchers";

  /**
   * Get all watchers for the current user
   */
  async getWatchers(): Promise<AuthResult<Watcher[]>> {
    try {
      const response: ApiResponse<Watcher[]> = await apiClient.get(
        this.basePath,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get watchers",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get watchers",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get enhanced watchers list with statistics for dashboard
   */
  async getEnhancedWatchers(): Promise<AuthResult<WatcherSummary[]>> {
    try {
      const response: ApiResponse<WatcherSummary[]> = await apiClient.get(
        `${this.basePath}/enhanced`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get enhanced watchers",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get enhanced watchers",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Create a new watcher
   */
  async createWatcher(
    request: CreateWatcherRequest,
  ): Promise<AuthResult<Watcher>> {
    try {
      const response: ApiResponse<Watcher> = await apiClient.post(
        this.basePath,
        request,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to create watcher",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create watcher",
        error_code: error.error_code,
        field_errors: error.field_errors,
      };
    }
  }

  /**
   * Start a watcher by name
   */
  async startWatcher(
    watcherName: string,
  ): Promise<AuthResult<WatcherActionResponse>> {
    try {
      const response: ApiResponse<WatcherActionResponse> = await apiClient.get(
        `${this.basePath}/${watcherName}/start`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to start watcher",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to start watcher",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Stop a watcher by name
   */
  async stopWatcher(
    watcherName: string,
  ): Promise<AuthResult<WatcherActionResponse>> {
    try {
      const response: ApiResponse<WatcherActionResponse> = await apiClient.get(
        `${this.basePath}/${watcherName}/stop`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to stop watcher",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to stop watcher",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get detailed status for a specific watcher
   */
  async getWatcherStatus(
    watcherId: number,
  ): Promise<AuthResult<WatcherStatusDetail>> {
    try {
      const response: ApiResponse<WatcherStatusDetail> = await apiClient.get(
        `${this.basePath}/${watcherId}/status`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get watcher status",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get watcher status",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get sync history for a specific watcher with pagination
   */
  async getWatcherSyncHistory(
    watcherId: number,
    page: number = 1,
    perPage: number = 20,
  ): Promise<AuthResult<SyncHistoryResponse>> {
    try {
      const response: ApiResponse<SyncHistoryResponse> = await apiClient.get(
        `${this.basePath}/${watcherId}/history?page=${page}&per_page=${perPage}`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get sync history",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get sync history",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Preview sync changes for a watcher
   */
  async previewSync(
    watcherName: string,
  ): Promise<AuthResult<SyncPreviewResponse>> {
    try {
      const response: ApiResponse<SyncPreviewResponse> = await apiClient.get(
        `${this.basePath}/${watcherName}/preview`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get sync preview",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get sync preview",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get YouTube Music playlist info for a watcher
   */
  async getYouTubeMusicInfo(watcherName: string): Promise<AuthResult<string>> {
    try {
      const response: ApiResponse<string> = await apiClient.get(
        `${this.basePath}/${watcherName}/ytmusic`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get YouTube Music info",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get YouTube Music info",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get YouTube Music songs for a watcher
   */
  async getYouTubeMusicSongs(watcherName: string): Promise<AuthResult<string>> {
    try {
      const response: ApiResponse<string> = await apiClient.get(
        `${this.basePath}/${watcherName}/ytmusic/songs`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get YouTube Music songs",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get YouTube Music songs",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get Spotify playlist info for a watcher
   */
  async getSpotifyInfo(watcherName: string): Promise<AuthResult<string>> {
    try {
      const response: ApiResponse<string> = await apiClient.get(
        `${this.basePath}/${watcherName}/spotify`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get Spotify info",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get Spotify info",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get Spotify songs for a watcher
   */
  async getSpotifySongs(watcherName: string): Promise<AuthResult<string>> {
    try {
      const response: ApiResponse<string> = await apiClient.get(
        `${this.basePath}/${watcherName}/spotify/songs`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get Spotify songs",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get Spotify songs",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Update Spotify playlist configuration for a watcher
   */
  async updateSpotifyPlaylist(
    watcherName: string,
    playlistId: string,
  ): Promise<AuthResult<string>> {
    try {
      const response: ApiResponse<string> = await apiClient.post(
        `${this.basePath}/${watcherName}/spotify`,
        { playlist: playlistId },
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to update Spotify playlist",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to update Spotify playlist",
        error_code: error.error_code,
      };
    }
  }
}

// Export singleton instance
export const watcherApi = new WatcherApiService();
