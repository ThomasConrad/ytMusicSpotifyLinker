// User data and dashboard API service

import { apiClient, ApiError } from './apiClient';
import {
  DashboardData,
  ServiceConnection,
  SyncActivity,
  UserResult,
} from '@/types';

export class UserApiService {
  private basePath = '/protected';

  /**
   * Get dashboard data including user stats and overview
   */
  async getDashboard(): Promise<UserResult<DashboardData>> {
    try {
      const response = await apiClient.get<DashboardData>(
        `${this.basePath}/dashboard`
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to load dashboard data',
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
        error: 'Failed to load dashboard data due to network error',
      };
    }
  }

  /**
   * Get service connection status for YouTube Music and Spotify
   */
  async getServiceConnections(): Promise<UserResult<ServiceConnection[]>> {
    try {
      const response = await apiClient.get<ServiceConnection[]>(
        `${this.basePath}/connections`
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to load service connections',
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
        error: 'Failed to load service connections due to network error',
      };
    }
  }

  /**
   * Disconnect from a service (YouTube Music or Spotify)
   */
  async disconnectService(
    service: 'youtube_music' | 'spotify'
  ): Promise<UserResult<void>> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>(`${this.basePath}/connections/${service}/disconnect`);

      if (response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error:
            response.data?.message || `Failed to disconnect from ${service}`,
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
        error: `Failed to disconnect from ${service} due to network error`,
      };
    }
  }

  /**
   * Get sync activity history
   */
  async getSyncHistory(
    limit?: number,
    watcherId?: number
  ): Promise<UserResult<SyncActivity[]>> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (watcherId) params.append('watcher_id', watcherId.toString());

      const queryString = params.toString();
      const endpoint = `${this.basePath}/sync-history${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<SyncActivity[]>(endpoint);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to load sync history',
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
        error: 'Failed to load sync history due to network error',
      };
    }
  }
}

// Export singleton instance
export const userApi = new UserApiService();
