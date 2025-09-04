// Authentication types matching backend API

export interface User {
  id: number;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
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
export type AuthResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      error_code?: string;
      field_errors?: Record<string, string>;
    };

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  status?: number;
}
