// Error handling utilities for consistent error management across the application

export interface AppError {
  message: string;
  code?: string;
  type: ErrorType;
  details?: any;
  timestamp: Date;
  userMessage: string;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION', 
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Creates a standardized error object from various error sources
 */
export function createAppError(
  error: unknown,
  type: ErrorType = ErrorType.UNKNOWN,
  userMessage?: string
): AppError {
  const timestamp = new Date();
  
  if (error instanceof Error) {
    return {
      message: error.message,
      type,
      details: {
        stack: error.stack,
        name: error.name,
      },
      timestamp,
      userMessage: userMessage || getUserFriendlyMessage(error, type),
    };
  }
  
  if (typeof error === 'string') {
    return {
      message: error,
      type,
      timestamp,
      userMessage: userMessage || getUserFriendlyMessage(error, type),
    };
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    return {
      message: errorObj.message || errorObj.error || 'Unknown error occurred',
      code: errorObj.code || errorObj.error_code,
      type,
      details: error,
      timestamp,
      userMessage: userMessage || getUserFriendlyMessage(errorObj.message || errorObj.error, type),
    };
  }
  
  return {
    message: 'Unknown error occurred',
    type: ErrorType.UNKNOWN,
    timestamp,
    userMessage: userMessage || 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Converts technical error messages to user-friendly messages
 */
export function getUserFriendlyMessage(error: unknown, type: ErrorType): string {
  const errorMessage = typeof error === 'string' ? error : 
    (error as any)?.message || 'Unknown error';
    
  switch (type) {
    case ErrorType.NETWORK:
      if (errorMessage.includes('fetch')) {
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      if (errorMessage.includes('timeout')) {
        return 'The request took too long. Please try again.';
      }
      return 'Network error occurred. Please check your connection and try again.';
      
    case ErrorType.AUTHENTICATION:
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        return 'Your session has expired. Please log in again.';
      }
      if (errorMessage.includes('credentials')) {
        return 'Invalid username or password. Please try again.';
      }
      return 'Authentication failed. Please log in again.';
      
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
      
    case ErrorType.VALIDATION:
      return 'Please check your input and try again.';
      
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
      
    case ErrorType.SERVER:
      if (errorMessage.includes('500')) {
        return 'Server error occurred. Please try again later.';
      }
      if (errorMessage.includes('503')) {
        return 'Service is temporarily unavailable. Please try again later.';
      }
      return 'Server error occurred. Please try again later.';
      
    case ErrorType.CLIENT:
      return 'Invalid request. Please refresh the page and try again.';
      
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Determines error type from HTTP status codes or error messages
 */
export function determineErrorType(error: unknown): ErrorType {
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    const status = errorObj.status || errorObj.statusCode;
    
    if (status) {
      if (status === 401) return ErrorType.AUTHENTICATION;
      if (status === 403) return ErrorType.AUTHORIZATION;
      if (status === 404) return ErrorType.NOT_FOUND;
      if (status >= 400 && status < 500) return ErrorType.CLIENT;
      if (status >= 500) return ErrorType.SERVER;
    }
    
    const message = errorObj.message || errorObj.error || '';
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
        return ErrorType.NETWORK;
      }
      if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('token')) {
        return ErrorType.AUTHENTICATION;
      }
      if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
        return ErrorType.AUTHORIZATION;
      }
      if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
        return ErrorType.VALIDATION;
      }
      if (lowerMessage.includes('not found')) {
        return ErrorType.NOT_FOUND;
      }
    }
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(fieldErrors?: Record<string, string>): string {
  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    return 'Please check your input and try again.';
  }
  
  const errors = Object.entries(fieldErrors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('; ');
    
  return errors;
}

/**
 * Logs error to console with structured format (in development)
 * In production, this would send to error reporting service
 */
export function logError(error: AppError, context?: string): void {
  const isDevelopment = import.meta.env?.DEV || false;
  
  const logData = {
    type: error.type,
    message: error.message,
    code: error.code,
    timestamp: error.timestamp,
    context,
    details: error.details,
  };
  
  if (isDevelopment) {
    console.group(`🚨 ${error.type} Error ${context ? `(${context})` : ''}`);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    if (error.code) console.error('Code:', error.code);
    console.error('Timestamp:', error.timestamp.toISOString());
    if (error.details) console.error('Details:', error.details);
    console.groupEnd();
  } else {
    // In production, send to error reporting service
    console.error('Error occurred:', logData);
    // TODO: Send to error reporting service (e.g., Sentry, LogRocket, etc.)
  }
}

/**
 * Handles API errors consistently across the application
 */
export function handleApiError(error: unknown, context?: string): AppError {
  const errorType = determineErrorType(error);
  const appError = createAppError(error, errorType);
  
  logError(appError, context);
  
  return appError;
}

/**
 * Retry utility for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  exponentialBackoff: boolean = true
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // Don't retry certain error types
      const errorType = determineErrorType(error);
      if (errorType === ErrorType.AUTHENTICATION || errorType === ErrorType.AUTHORIZATION) {
        break;
      }
      
      // Wait before next attempt
      const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Wraps async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  fallbackValue?: T
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const appError = handleApiError(error, context);
    return { 
      data: fallbackValue || null, 
      error: appError 
    };
  }
}

/**
 * Creates a safe version of a function that won't throw
 */
export function makeSafe<T extends any[], R>(
  fn: (...args: T) => R,
  defaultValue: R,
  context?: string
): (...args: T) => R {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      const appError = handleApiError(error, context);
      logError(appError, context);
      return defaultValue;
    }
  };
}

/**
 * Error boundary helper for form validation
 */
export function validateAndTransformErrors(
  result: { success: boolean; error?: string; field_errors?: Record<string, string> }
): { hasErrors: boolean; generalError?: string; fieldErrors?: Record<string, string> } {
  if (result.success) {
    return { hasErrors: false };
  }
  
  return {
    hasErrors: true,
    generalError: result.error,
    fieldErrors: result.field_errors,
  };
}