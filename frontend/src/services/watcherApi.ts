// Watcher management API service

import { apiClient, ApiError } from './apiClient';
import {
  WatcherSummary,
  CreateWatcherRequest,
  SyncPreview,
  WatcherResult
} from '@/types';

export class WatcherApiService {
  private basePath = '/protected/watchers';

  /**
   * Get all watchers for the current user
   */
  async getWatchers(): Promise<WatcherResult<WatcherSummary[]>> {
    try {
      const response = await apiClient.get<WatcherSummary[]>(this.basePath);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to load watchers',
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message,
          error_code: error.error_code,
        };
      }
      
      return {
        success: false,
        error: 'Failed to load watchers due to network error',
      };
    }
  }

  /**
   * Create a new watcher
   */
  async createWatcher(request: CreateWatcherRequest): Promise<WatcherResult<WatcherSummary>> {
    try {
      const response = await apiClient.post<WatcherSummary>(this.basePath, request);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to create watcher',
        };
      }
    } catch (error) {
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
        error: 'Failed to create watcher due to network error',
      };
    }
  }

  /**
   * Start a watcher
   */
  async startWatcher(watcherName: string): Promise<WatcherResult<void>> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${this.basePath}/${encodeURIComponent(watcherName)}/start`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to start watcher',
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message,
          error_code: error.error_code,
        };
      }
      
      return {
        success: false,
        error: 'Failed to start watcher due to network error',
      };
    }
  }

  /**
   * Stop a watcher
   */
  async stopWatcher(watcherName: string): Promise<WatcherResult<void>> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${this.basePath}/${encodeURIComponent(watcherName)}/stop`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to stop watcher',
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message,
          error_code: error.error_code,
        };
      }
      
      return {
        success: false,
        error: 'Failed to stop watcher due to network error',
      };
    }
  }

  /**
   * Delete a watcher
   */
  async deleteWatcher(watcherName: string): Promise<WatcherResult<void>> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `${this.basePath}/${encodeURIComponent(watcherName)}`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to delete watcher',
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message,
          error_code: error.error_code,
        };
      }
      
      return {
        success: false,
        error: 'Failed to delete watcher due to network error',
      };
    }
  }

  /**
   * Get sync preview for a watcher
   */
  async getSyncPreview(watcherName: string): Promise<WatcherResult<SyncPreview>> {
    try {
      const response = await apiClient.get<SyncPreview>(
        `${this.basePath}/${encodeURIComponent(watcherName)}/preview`
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to load sync preview',
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message,
          error_code: error.error_code,
        };
      }
      
      return {
        success: false,
        error: 'Failed to load sync preview due to network error',
      };
    }
  }

  /**
   * Execute sync for a watcher (same as start, but could have different implementation)
   */
  async executeSync(watcherName: string): Promise<WatcherResult<void>> {
    return this.startWatcher(watcherName);
  }
}

// Export singleton instance
export const watcherApi = new WatcherApiService();