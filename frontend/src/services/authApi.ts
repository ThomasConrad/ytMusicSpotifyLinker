// Authentication API service

import { apiClient, ApiError } from './apiClient';
import {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  AuthResult,
} from '@/types';

export class AuthApiService {
  private basePath = '/auth';

  /**
   * Login with username and password
   */
  async login(credentials: LoginRequest): Promise<AuthResult<User>> {
    try {
      const response = await apiClient.post<LoginResponse>(
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
        error: 'Login failed due to network error',
      };
    }
  }

  /**
   * Register a new user account
   */
  async register(userData: RegisterRequest): Promise<AuthResult<User>> {
    try {
      const response = await apiClient.post<RegisterResponse>(
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
        error: 'Registration failed due to network error',
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<AuthResult<void>> {
    try {
      const response = await apiClient.post<LogoutResponse>(
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
        error: 'Logout failed due to network error',
      };
    }
  }

  /**
   * Get current user profile (check if session is valid)
   */
  async getCurrentUser(): Promise<AuthResult<User>> {
    try {
      const response = await apiClient.get<User>(`${this.basePath}/profile`);

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
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle 401 Unauthorized as expected for unauthenticated users
        if (error.status === 401) {
          return {
            success: false,
            error: 'Not authenticated',
            error_code: 'UNAUTHORIZED',
          };
        }
      }

      return {
        success: false,
        error: 'Failed to get user profile',
        error_code: error instanceof ApiError ? error.error_code : undefined,
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
