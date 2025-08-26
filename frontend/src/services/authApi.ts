// Authentication API service

import { apiClient, ApiResponse } from './apiClient';

// Types matching backend API responses
export interface User {
  id: number;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// Authentication result types for easier handling
export type AuthResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  error_code?: string;
  field_errors?: Record<string, string>;
};

export class AuthApiService {
  private basePath = '/api/auth';

  /**
   * Login with username and password
   */
  async login(credentials: LoginRequest): Promise<AuthResult<User>> {
    try {
      const response: ApiResponse<LoginResponse> = await apiClient.post(
        `${this.basePath}/login`,
        credentials
      );

      if (response.data?.success && response.data.user) {
        return {
          success: true,
          data: response.data.user,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Login failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
        error_code: error.error_code,
        field_errors: error.field_errors,
      };
    }
  }

  /**
   * Register a new user account
   */
  async register(userData: RegisterRequest): Promise<AuthResult<User>> {
    try {
      const response: ApiResponse<RegisterResponse> = await apiClient.post(
        `${this.basePath}/register`,
        userData
      );

      if (response.data?.success && response.data.user) {
        return {
          success: true,
          data: response.data.user,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Registration failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed',
        error_code: error.error_code,
        field_errors: error.field_errors,
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<AuthResult<void>> {
    try {
      const response: ApiResponse<LogoutResponse> = await apiClient.post(
        `${this.basePath}/logout`
      );

      if (response.data?.success) {
        return {
          success: true,
          data: undefined,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Logout failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Logout failed',
        error_code: error.error_code,
      };
    }
  }

  /**
   * Get current user profile (check if session is valid)
   */
  async getCurrentUser(): Promise<AuthResult<User>> {
    try {
      const response: ApiResponse<User> = await apiClient.get(
        `${this.basePath}/profile`
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to get user profile',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get user profile',
        error_code: error.error_code,
      };
    }
  }

  /**
   * Check if user is authenticated by validating session
   */
  async checkAuthentication(): Promise<boolean> {
    try {
      const result = await this.getCurrentUser();
      return result.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const authApi = new AuthApiService();