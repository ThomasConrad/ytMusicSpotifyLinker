import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authApi } from '../../services/authApi';
import { apiClient, ApiError } from '../../services/apiClient';

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class MockApiError extends Error {
    constructor(
      message: string,
      public status?: number,
      public error_code?: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

describe('AuthApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      const mockResponse = { success: true, data: mockUser };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.login('testuser', 'password123');

      expect(result).toEqual({
        success: true,
        data: mockUser,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should handle login failure with invalid credentials', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid username or password',
        field_errors: { username: 'User not found' },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.login('invaliduser', 'wrongpassword');

      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password',
        field_errors: { username: 'User not found' },
      });
    });

    it('should handle API errors during login', async () => {
      const apiError = new ApiError('Network error', 500);
      vi.mocked(apiClient.post).mockRejectedValue(apiError);

      const result = await authApi.login('testuser', 'password123');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
        error_code: undefined,
      });
    });

    it('should handle non-API errors during login', async () => {
      const genericError = new Error('Unexpected error');
      vi.mocked(apiClient.post).mockRejectedValue(genericError);

      const result = await authApi.login('testuser', 'password123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to login due to network error',
      });
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const mockUser = { id: 1, username: 'newuser' };
      const mockResponse = { success: true, data: mockUser };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.register('newuser', 'password123');

      expect(result).toEqual({
        success: true,
        data: mockUser,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        password: 'password123',
      });
    });

    it('should handle registration failure with validation errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Validation failed',
        field_errors: {
          username: 'Username already exists',
          password: 'Password too short',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.register('existinguser', '123');

      expect(result).toEqual({
        success: false,
        error: 'Validation failed',
        field_errors: {
          username: 'Username already exists',
          password: 'Password too short',
        },
      });
    });

    it('should handle network errors during registration', async () => {
      const apiError = new ApiError(
        'Service unavailable',
        503,
        'SERVICE_UNAVAILABLE'
      );
      vi.mocked(apiClient.post).mockRejectedValue(apiError);

      const result = await authApi.register('newuser', 'password123');

      expect(result).toEqual({
        success: false,
        error: 'Service unavailable',
        error_code: 'SERVICE_UNAVAILABLE',
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.logout();

      expect(result).toEqual({
        success: true,
        data: undefined,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Session not found',
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.logout();

      expect(result).toEqual({
        success: false,
        error: 'Session not found',
      });
    });

    it('should handle network errors during logout', async () => {
      const apiError = new ApiError('Connection timeout', 408);
      vi.mocked(apiClient.post).mockRejectedValue(apiError);

      const result = await authApi.logout();

      expect(result).toEqual({
        success: false,
        error: 'Connection timeout',
        error_code: undefined,
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = { id: 1, username: 'currentuser' };
      const mockResponse = { success: true, data: mockUser };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.getCurrentUser();

      expect(result).toEqual({
        success: true,
        data: mockUser,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should handle unauthenticated user', async () => {
      const mockResponse = {
        success: false,
        error: 'Not authenticated',
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.getCurrentUser();

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
    });

    it('should handle expired session', async () => {
      const apiError = new ApiError('Session expired', 401, 'SESSION_EXPIRED');
      vi.mocked(apiClient.get).mockRejectedValue(apiError);

      const result = await authApi.getCurrentUser();

      expect(result).toEqual({
        success: false,
        error: 'Session expired',
        error_code: 'SESSION_EXPIRED',
      });
    });

    it('should handle server errors', async () => {
      const apiError = new ApiError('Internal server error', 500);
      vi.mocked(apiClient.get).mockRejectedValue(apiError);

      const result = await authApi.getCurrentUser();

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        error_code: undefined,
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      const result = await authApi.getCurrentUser();

      expect(result).toEqual({
        success: false,
        error: 'Failed to get current user due to network error',
      });
    });
  });
});
