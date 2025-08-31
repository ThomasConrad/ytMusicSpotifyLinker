// User Profile API service

import { apiClient, ApiResponse } from "./apiClient";
import { AuthResult } from "./authApi";

// Types matching backend API responses
export interface UserProfile {
  id: number;
  username: string;
  created_at?: string;
}

export interface ServiceConnectionStatus {
  service: string;
  is_connected: boolean;
  expires_at?: string;
  last_successful_auth?: string;
  requires_reauth: boolean;
}

export interface ServiceConnectionsResponse {
  connections: ServiceConnectionStatus[];
}

export interface UserDashboardData {
  profile: UserProfile;
  service_connections: ServiceConnectionStatus[];
  watcher_count: number;
}

export interface UpdateProfileRequest {
  username?: string;
}

export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

export class UserApiService {
  private basePath = "/api/users";

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthResult<UserProfile>> {
    try {
      const response: ApiResponse<UserProfile> = await apiClient.get(
        `${this.basePath}/profile`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get user profile",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get user profile",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    updates: UpdateProfileRequest,
  ): Promise<AuthResult<UserProfile>> {
    try {
      const response: ApiResponse<UserProfile> = await apiClient.put(
        `${this.basePath}/profile`,
        updates,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to update profile",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to update profile",
        error_code: error.error_code,
        field_errors: error.field_errors,
      };
    }
  }

  /**
   * Get dashboard data including profile, connections, and watcher count
   */
  async getDashboardData(): Promise<AuthResult<UserDashboardData>> {
    try {
      const response: ApiResponse<UserDashboardData> = await apiClient.get(
        `${this.basePath}/dashboard`,
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get dashboard data",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get dashboard data",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get service connection status
   */
  async getServiceConnections(): Promise<
    AuthResult<ServiceConnectionsResponse>
  > {
    try {
      const response: ApiResponse<ServiceConnectionsResponse> =
        await apiClient.get(`${this.basePath}/connections`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: "Failed to get service connections",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get service connections",
        error_code: error.error_code,
      };
    }
  }

  /**
   * Disconnect from a service (YouTube Music or Spotify)
   */
  async disconnectService(
    service: "youtube_music" | "spotify",
  ): Promise<AuthResult<void>> {
    try {
      const response: ApiResponse<ApiSuccessResponse> = await apiClient.delete(
        `${this.basePath}/connections/${service}`,
      );

      if (response.success && response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || "Failed to disconnect service",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to disconnect service",
        error_code: error.error_code,
      };
    }
  }
}

// Export singleton instance
export const userApi = new UserApiService();
