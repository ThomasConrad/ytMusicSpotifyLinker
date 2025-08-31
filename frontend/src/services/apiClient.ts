// Base API client with error handling and retry logic

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  field_errors?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public error_code?: string,
    public field_errors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    baseUrl: string = "",
    maxRetries: number = 3,
    retryDelay: number = 1000,
  ) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(status: number, attempt: number): boolean {
    // Retry on network errors and 5xx server errors, but not on client errors (4xx)
    return attempt < this.maxRetries && (status >= 500 || status === 0);
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    attempt: number = 0,
  ): Promise<ApiResponse<T>> {
    try {
      const fullUrl = `${this.baseUrl}${url}`;

      // Default headers
      const defaultHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      const response = await fetch(fullUrl, {
        ...options,
        headers: defaultHeaders,
        credentials: "include", // Important for session cookies
      });

      // Handle different response types
      let data: any;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Check if we should retry
        if (this.shouldRetry(response.status, attempt)) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
          return this.makeRequest<T>(url, options, attempt + 1);
        }

        // Create ApiError with structured error information
        const errorMessage =
          typeof data === "object" && data?.error
            ? data.error
            : `HTTP ${response.status}: ${response.statusText}`;

        throw new ApiError(
          errorMessage,
          response.status,
          data?.error_code,
          data?.field_errors,
        );
      }

      // Return structured response
      if (typeof data === "object" && data !== null) {
        return {
          success: true,
          data,
        };
      } else {
        return {
          success: true,
          data: data as T,
        };
      }
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof ApiError) {
        throw error;
      }

      // Retry on network errors
      if (attempt < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, attempt));
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      // Final failure
      throw new ApiError(
        error instanceof Error ? error.message : "Network error occurred",
        0,
      );
    }
  }

  async get<T>(url: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "GET",
      headers,
    });
  }

  async post<T>(
    url: string,
    data?: any,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    url: string,
    data?: any,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "PUT",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "DELETE",
      headers,
    });
  }
}

// Export a default instance
export const apiClient = new ApiClient();
