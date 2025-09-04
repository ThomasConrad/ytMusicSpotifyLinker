// Base HTTP client for API communication

import { ApiResponse } from '@/types';

class ApiError extends Error {
  public status: number;
  public error_code?: string;
  public field_errors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    error_code?: string,
    field_errors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error_code = error_code;
    this.field_errors = field_errors;
  }
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const { method = 'GET', headers = {}, body } = config;

    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include', // Include cookies for session management
    };

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestConfig);
      const contentType = response.headers.get('content-type');

      let data: T;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses
        data = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        // Extract error information from response
        const errorData = data as any;
        throw new ApiError(
          errorData?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData?.error_code,
          errorData?.field_errors
        );
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors or other fetch failures
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  async get<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async delete<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  // Helper method to set additional default headers (e.g., authorization)
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  // Helper method to remove default headers
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }
}

// Export singleton instance
export const apiClient = new ApiClient('/api');

// Export error class for error handling
export { ApiError };
export type { ApiResponse } from '@/types';
