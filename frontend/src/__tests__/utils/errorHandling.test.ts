import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAppError,
  getUserFriendlyMessage,
  determineErrorType,
  formatValidationErrors,
  handleApiError,
  retryOperation,
  withErrorHandling,
  makeSafe,
  validateAndTransformErrors,
  ErrorType,
} from '../../utils/errorHandling';

describe('ErrorHandling Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid test noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  describe('createAppError', () => {
    it('should create error from Error instance', () => {
      const originalError = new Error('Test error message');
      const appError = createAppError(originalError, ErrorType.NETWORK);

      expect(appError.message).toBe('Test error message');
      expect(appError.type).toBe(ErrorType.NETWORK);
      expect(appError.details.stack).toBeDefined();
      expect(appError.userMessage).toContain('Network error');
      expect(appError.timestamp).toBeInstanceOf(Date);
    });

    it('should create error from string', () => {
      const errorMessage = 'String error message';
      const appError = createAppError(errorMessage, ErrorType.VALIDATION);

      expect(appError.message).toBe(errorMessage);
      expect(appError.type).toBe(ErrorType.VALIDATION);
      expect(appError.userMessage).toContain('check your input');
    });

    it('should create error from object with error properties', () => {
      const errorObj = {
        message: 'Object error',
        code: 'ERROR_CODE',
        status: 400,
      };
      const appError = createAppError(errorObj, ErrorType.CLIENT);

      expect(appError.message).toBe('Object error');
      expect(appError.code).toBe('ERROR_CODE');
      expect(appError.type).toBe(ErrorType.CLIENT);
      expect(appError.details).toBe(errorObj);
    });

    it('should handle unknown error types', () => {
      const unknownError = { someProperty: 'value' };
      const appError = createAppError(unknownError);

      expect(appError.type).toBe(ErrorType.UNKNOWN);
      expect(appError.userMessage).toContain('unexpected error');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for network errors', () => {
      const message = getUserFriendlyMessage('fetch failed', ErrorType.NETWORK);
      expect(message).toContain('connect to the server');
    });

    it('should return user-friendly message for authentication errors', () => {
      const message = getUserFriendlyMessage(
        'token expired',
        ErrorType.AUTHENTICATION
      );
      expect(message).toContain('session has expired');
    });

    it('should return user-friendly message for validation errors', () => {
      const message = getUserFriendlyMessage(
        'invalid input',
        ErrorType.VALIDATION
      );
      expect(message).toContain('check your input');
    });

    it('should return generic message for unknown errors', () => {
      const message = getUserFriendlyMessage('unknown', ErrorType.UNKNOWN);
      expect(message).toContain('unexpected error');
    });
  });

  describe('determineErrorType', () => {
    it('should determine type from HTTP status codes', () => {
      expect(determineErrorType({ status: 401 })).toBe(
        ErrorType.AUTHENTICATION
      );
      expect(determineErrorType({ status: 403 })).toBe(ErrorType.AUTHORIZATION);
      expect(determineErrorType({ status: 404 })).toBe(ErrorType.NOT_FOUND);
      expect(determineErrorType({ status: 400 })).toBe(ErrorType.CLIENT);
      expect(determineErrorType({ status: 500 })).toBe(ErrorType.SERVER);
    });

    it('should determine type from error messages', () => {
      expect(determineErrorType({ message: 'network connection failed' })).toBe(
        ErrorType.NETWORK
      );
      expect(determineErrorType({ message: 'unauthorized access' })).toBe(
        ErrorType.AUTHENTICATION
      );
      expect(determineErrorType({ message: 'permission denied' })).toBe(
        ErrorType.AUTHORIZATION
      );
      expect(determineErrorType({ message: 'validation error' })).toBe(
        ErrorType.VALIDATION
      );
      expect(determineErrorType({ message: 'not found' })).toBe(
        ErrorType.NOT_FOUND
      );
    });

    it('should return UNKNOWN for unrecognizable errors', () => {
      expect(determineErrorType({})).toBe(ErrorType.UNKNOWN);
      expect(determineErrorType('random string')).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format field errors into a string', () => {
      const fieldErrors = {
        email: 'Invalid email format',
        password: 'Password too short',
      };

      const formatted = formatValidationErrors(fieldErrors);
      expect(formatted).toContain('email: Invalid email format');
      expect(formatted).toContain('password: Password too short');
    });

    it('should return default message for empty errors', () => {
      expect(formatValidationErrors({})).toContain('check your input');
      expect(formatValidationErrors(undefined)).toContain('check your input');
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryOperation(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValueOnce('success');

      const result = await retryOperation(operation, 3, 10, false);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));

      await expect(retryOperation(operation, 2, 10, false)).rejects.toThrow(
        'Persistent failure'
      );
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry authentication errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue({ message: 'unauthorized', status: 401 });

      await expect(retryOperation(operation, 3)).rejects.toMatchObject({
        status: 401,
      });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      await retryOperation(operation, 3, 100, true);
      const endTime = Date.now();

      // Should have waited at least 100ms for the backoff
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withErrorHandling', () => {
    it('should return data on successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success data');

      const result = await withErrorHandling(operation);

      expect(result).toEqual({
        data: 'success data',
        error: null,
      });
    });

    it('should return error on failed operation', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Operation failed'));

      const result = await withErrorHandling(operation, 'test context');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Operation failed');
      expect(result.error?.type).toBe(ErrorType.UNKNOWN);
    });

    it('should return fallback value on error', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Operation failed'));
      const fallback = 'fallback value';

      const result = await withErrorHandling(
        operation,
        'test context',
        fallback
      );

      expect(result.data).toBe(fallback);
      expect(result.error?.message).toBe('Operation failed');
    });
  });

  describe('makeSafe', () => {
    it('should return result on successful execution', () => {
      const fn = vi.fn().mockReturnValue('success');
      const safeFn = makeSafe(fn, 'default');

      const result = safeFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return default value on error', () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Function failed');
      });
      const safeFn = makeSafe(fn, 'default');

      const result = safeFn();

      expect(result).toBe('default');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('validateAndTransformErrors', () => {
    it('should return no errors for successful result', () => {
      const result = validateAndTransformErrors({ success: true });

      expect(result).toEqual({ hasErrors: false });
    });

    it('should return errors for failed result', () => {
      const result = validateAndTransformErrors({
        success: false,
        error: 'General error',
        field_errors: { email: 'Invalid email' },
      });

      expect(result).toEqual({
        hasErrors: true,
        generalError: 'General error',
        fieldErrors: { email: 'Invalid email' },
      });
    });
  });
});
