// Spotify API service for frontend integration

import { apiClient, ApiError } from './apiClient';
import {
  SpotifyAuthUrlResponse,
  SpotifyAuthStatusResponse,
  SpotifyPlaylistsResponse,
  SpotifyPlaylistDetailResponse,
  SpotifyPlaylistTracksResponse,
  CreateSpotifyPlaylistRequest,
  SpotifySyncPreviewRequest,
  SpotifySyncPreviewResponse,
  SpotifySyncExecuteRequest,
  SpotifySyncOperationResponse,
  SpotifySyncStatusResponse,
  SpotifyApiSuccessResponse,
  SpotifyResult,
  SpotifyPlaylist,
  SpotifyUserProfile,
  SpotifyTrack,
} from '@/types';

export class SpotifyApiService {
  private basePath = '/spotify';

  // Authentication Methods

  /**
   * Start Spotify OAuth flow - redirects user to Spotify authorization
   */
  async startAuthFlow(): Promise<SpotifyResult<string>> {
    try {
      const response = await apiClient.get<SpotifyAuthUrlResponse>(
        `${this.basePath}/auth/start`
      );

      if (response.data?.success && response.data.auth_url) {
        return {
          success: true,
          data: response.data.auth_url,
        };
      } else {
        return {
          success: false,
          error:
            response.data?.error || 'Failed to start Spotify authentication',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to start Spotify authentication');
    }
  }

  /**
   * Get current Spotify authentication status and user profile
   */
  async getAuthStatus(): Promise<
    SpotifyResult<{ authenticated: boolean; profile?: SpotifyUserProfile }>
  > {
    try {
      const response = await apiClient.get<SpotifyAuthStatusResponse>(
        `${this.basePath}/auth/status`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: {
            authenticated: response.data.authenticated,
            profile: response.data.user_profile,
          },
        };
      } else {
        return {
          success: false,
          error:
            response.data?.error ||
            'Failed to get Spotify authentication status',
        };
      }
    } catch (error) {
      return this.handleError(
        error,
        'Failed to get Spotify authentication status'
      );
    }
  }

  /**
   * Disconnect Spotify account - revokes tokens and removes credentials
   */
  async disconnect(): Promise<SpotifyResult<void>> {
    try {
      const response = await apiClient.post<SpotifyApiSuccessResponse>(
        `${this.basePath}/auth/disconnect`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to disconnect Spotify account',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to disconnect Spotify account');
    }
  }

  /**
   * Test Spotify connection - verifies tokens are valid
   */
  async testConnection(): Promise<SpotifyResult<boolean>> {
    try {
      const response = await apiClient.get<SpotifyApiSuccessResponse>(
        `${this.basePath}/test`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: true,
        };
      } else {
        return {
          success: true,
          data: false,
        };
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        return {
          success: true,
          data: false,
        };
      }
      return this.handleError(error, 'Failed to test Spotify connection');
    }
  }

  // Playlist Methods

  /**
   * Get user's Spotify playlists
   */
  async getPlaylists(): Promise<SpotifyResult<SpotifyPlaylist[]>> {
    try {
      const response = await apiClient.get<SpotifyPlaylistsResponse>(
        `${this.basePath}/playlists`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: response.data.playlists,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to get Spotify playlists',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to get Spotify playlists');
    }
  }

  /**
   * Get detailed information about a specific playlist
   */
  async getPlaylistDetails(
    playlistId: string
  ): Promise<SpotifyResult<SpotifyPlaylist>> {
    try {
      const response = await apiClient.get<SpotifyPlaylistDetailResponse>(
        `${this.basePath}/playlists/${encodeURIComponent(playlistId)}`
      );

      if (response.data?.success && response.data.playlist) {
        return {
          success: true,
          data: response.data.playlist,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to get playlist details',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to get playlist details');
    }
  }

  /**
   * Get tracks from a specific playlist
   */
  async getPlaylistTracks(
    playlistId: string
  ): Promise<SpotifyResult<{ tracks: SpotifyTrack[]; total: number }>> {
    try {
      const response = await apiClient.get<SpotifyPlaylistTracksResponse>(
        `${this.basePath}/playlists/${encodeURIComponent(playlistId)}/tracks`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: {
            tracks: response.data.tracks,
            total: response.data.total,
          },
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to get playlist tracks',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to get playlist tracks');
    }
  }

  /**
   * Create a new Spotify playlist
   */
  async createPlaylist(
    playlist: CreateSpotifyPlaylistRequest
  ): Promise<SpotifyResult<SpotifyPlaylist>> {
    try {
      const response = await apiClient.post<SpotifyPlaylistDetailResponse>(
        `${this.basePath}/playlists`,
        playlist
      );

      if (response.data?.success && response.data.playlist) {
        return {
          success: true,
          data: response.data.playlist,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to create playlist',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to create playlist');
    }
  }

  // Sync Methods

  /**
   * Preview sync operation - shows what changes would be made
   */
  async previewSync(
    request: SpotifySyncPreviewRequest
  ): Promise<SpotifyResult<SpotifySyncPreviewResponse['preview']>> {
    try {
      const response = await apiClient.post<SpotifySyncPreviewResponse>(
        `${this.basePath}/sync/preview`,
        request
      );

      if (response.data?.success) {
        return {
          success: true,
          data: response.data.preview,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to preview sync operation',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to preview sync operation');
    }
  }

  /**
   * Execute sync operation for a watcher
   */
  async executeSync(
    request: SpotifySyncExecuteRequest
  ): Promise<SpotifyResult<SpotifySyncOperationResponse['operation']>> {
    try {
      const response = await apiClient.post<SpotifySyncOperationResponse>(
        `${this.basePath}/sync/execute`,
        request
      );

      if (response.data?.success) {
        return {
          success: true,
          data: response.data.operation,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to execute sync operation',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to execute sync operation');
    }
  }

  /**
   * Get status of a sync operation
   */
  async getSyncStatus(
    syncId: number
  ): Promise<SpotifyResult<SpotifySyncStatusResponse['operation']>> {
    try {
      const response = await apiClient.get<SpotifySyncStatusResponse>(
        `${this.basePath}/sync/${syncId}/status`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: response.data.operation,
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Failed to get sync status',
        };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to get sync status');
    }
  }

  // Utility Methods

  /**
   * Check if user is authenticated with Spotify
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const result = await this.getAuthStatus();
      return result.success && result.data.authenticated;
    } catch {
      return false;
    }
  }

  /**
   * Retry a failed operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<SpotifyResult<T>>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<SpotifyResult<T>> {
    let lastError: SpotifyResult<T>;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        if (result.success) {
          return result;
        }

        lastError = result;

        // Don't retry on certain error types
        if (
          result.error_code === 'UNAUTHORIZED' ||
          result.error_code === 'FORBIDDEN'
        ) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await this.delay(baseDelay * Math.pow(2, attempt));
        }
      } catch (error) {
        lastError = this.handleError(error, 'Operation failed');

        if (attempt < maxRetries) {
          await this.delay(baseDelay * Math.pow(2, attempt));
        }
      }
    }

    return lastError!;
  }

  /**
   * Batch playlist requests to avoid rate limiting
   */
  async getPlaylistsBatch(
    playlistIds: string[],
    batchSize: number = 5
  ): Promise<SpotifyResult<SpotifyPlaylist[]>> {
    try {
      const results: SpotifyPlaylist[] = [];

      for (let i = 0; i < playlistIds.length; i += batchSize) {
        const batch = playlistIds.slice(i, i + batchSize);
        const promises = batch.map((id) => this.getPlaylistDetails(id));

        const batchResults = await Promise.all(promises);

        for (const result of batchResults) {
          if (result.success) {
            results.push(result.data);
          }
        }

        // Add delay between batches to respect rate limits
        if (i + batchSize < playlistIds.length) {
          await this.delay(100);
        }
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get playlists in batch');
    }
  }

  // Private helper methods

  private handleError(
    error: unknown,
    defaultMessage: string
  ): SpotifyResult<never> {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message,
        error_code: error.error_code,
        field_errors: error.field_errors,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : defaultMessage,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const spotifyApi = new SpotifyApiService();
