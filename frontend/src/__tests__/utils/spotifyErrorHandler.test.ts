import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSpotifyError,
  retrySpotifyOperation,
  withSpotifyErrorHandling,
  createSpotifyRetryHandler,
  getSpotifyErrorAction,
  SpotifyErrorCode,
} from '../../utils/spotifyErrorHandler';
import { ApiError } from '../../services/apiClient';
import { ErrorType } from '../../utils/errorHandling';

describe('SpotifyErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid test noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    
    // Mock window methods
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        reload: vi.fn(),
      },
      writable: true,
    });
    
    Object.defineProperty(window, 'history', {
      value: {
        back: vi.fn(),
      },
      writable: true,
    });
    
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  describe('createSpotifyError', () => {
    it('should create Spotify error from ApiError with rate limiting', () => {
      const apiError = new ApiError('Rate limit exceeded', 429, 'rate-limited');
      apiError.field_errors = { 'retry-after': '60' };
      
      const spotifyError = createSpotifyError(apiError, 'test context');

      expect(spotifyError.type).toBe(ErrorType.NETWORK);
      expect(spotifyError.spotifyCode).toBe('rate-limited');
      expect(spotifyError.retryable).toBe(true);
      expect(spotifyError.retryAfter).toBe(60);
      expect(spotifyError.userMessage).toContain('busy');
    });

    it('should create Spotify error for insufficient scope', () => {
      const apiError = new ApiError('insufficient_client_scope', 403);
      
      const spotifyError = createSpotifyError(apiError, 'test context');

      expect(spotifyError.type).toBe(ErrorType.AUTHORIZATION);
      expect(spotifyError.spotifyCode).toBe(SpotifyErrorCode.INSUFFICIENT_CLIENT_SCOPE);
      expect(spotifyError.retryable).toBe(false);
      expect(spotifyError.userMessage).toContain('additional Spotify permissions');
    });

    it('should create Spotify error for premium required', () => {
      const apiError = new ApiError('Premium required', 403, 'premium_required');
      
      const spotifyError = createSpotifyError(apiError, 'test context');

      expect(spotifyError.type).toBe(ErrorType.AUTHORIZATION);
      expect(spotifyError.spotifyCode).toBe(SpotifyErrorCode.PREMIUM_REQUIRED);
      expect(spotifyError.retryable).toBe(false);
      expect(spotifyError.userMessage).toContain('Spotify Premium subscription');
    });

    it('should create Spotify error for expired token', () => {
      const apiError = new ApiError('Token expired', 401);
      
      const spotifyError = createSpotifyError(apiError, 'test context');

      expect(spotifyError.type).toBe(ErrorType.AUTHENTICATION);
      expect(spotifyError.spotifyCode).toBe(SpotifyErrorCode.TOKEN_EXPIRED);
      expect(spotifyError.retryable).toBe(true);
      expect(spotifyError.userMessage).toContain('session has expired');
    });

    it('should create Spotify error for server errors', () => {
      const apiError = new ApiError('Internal server error', 500);
      
      const spotifyError = createSpotifyError(apiError, 'test context');

      expect(spotifyError.type).toBe(ErrorType.SERVER);
      expect(spotifyError.retryable).toBe(true);
      expect(spotifyError.userMessage).toContain('temporarily unavailable');
    });

    it('should create Spotify error for network errors', () => {
      const networkError = new Error('Network request failed');
      
      const spotifyError = createSpotifyError(networkError, 'test context');

      expect(spotifyError.type).toBe(ErrorType.UNKNOWN);
      expect(spotifyError.retryable).toBe(true);
      expect(spotifyError.userMessage).toContain('unexpected Spotify error');
    });

    it('should extract retry-after from error message', () => {
      const apiError = new ApiError('Rate limited, retry after 30 seconds', 429);
      
      const spotifyError = createSpotifyError(apiError, 'test context');

      expect(spotifyError.retryAfter).toBe(30);
      expect(spotifyError.retryable).toBe(true);
    });
  });

  describe('retrySpotifyOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retrySpotifyOperation(operation, 'test context');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ApiError('Server error', 500))
        .mockResolvedValueOnce('success');

      const result = await retrySpotifyOperation(operation, 'test context', 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new ApiError('insufficient_client_scope', 403));

      await expect(
        retrySpotifyOperation(operation, 'test context', 3)
      ).rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw SpotifyError after max retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new ApiError('Server error', 500));

      await expect(
        retrySpotifyOperation(operation, 'test context', 2)
      ).rejects.toMatchObject({
        type: ErrorType.SERVER,
        retryable: true,
      });
      
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withSpotifyErrorHandling', () => {
    it('should return data on successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('spotify data');

      const result = await withSpotifyErrorHandling(operation, 'test context');

      expect(result).toEqual({
        data: 'spotify data',
        error: null,
      });
    });

    it('should return SpotifyError on failed operation', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new ApiError('Spotify API error', 400));

      const result = await withSpotifyErrorHandling(operation, 'test context');

      expect(result.data).toBeNull();
      expect(result.error?.type).toBe(ErrorType.CLIENT);
      expect(result.error?.retryable).toBe(false);
    });

    it('should return fallback value on error', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new ApiError('Spotify API error', 500));
      const fallback = { playlists: [] };

      const result = await withSpotifyErrorHandling(
        operation,
        'test context',
        fallback
      );

      expect(result.data).toBe(fallback);
      expect(result.error?.type).toBe(ErrorType.SERVER);
    });
  });

  describe('createSpotifyRetryHandler', () => {
    it('should call onRetry callback during retries', async () => {
      const onRetry = vi.fn();
      const onMaxRetriesReached = vi.fn();
      const retryHandler = createSpotifyRetryHandler(onRetry, onMaxRetriesReached);
      
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ApiError('Server error', 500))
        .mockResolvedValueOnce('success');

      await retryHandler(operation, 'test context', 3);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({
        type: ErrorType.SERVER,
        retryable: true,
      }));
      expect(onMaxRetriesReached).not.toHaveBeenCalled();
    });

    it('should call onMaxRetriesReached when retries exhausted', async () => {
      const onRetry = vi.fn();
      const onMaxRetriesReached = vi.fn();
      const retryHandler = createSpotifyRetryHandler(onRetry, onMaxRetriesReached);
      
      const operation = vi
        .fn()
        .mockRejectedValue(new ApiError('Server error', 500));

      await expect(
        retryHandler(operation, 'test context', 2)
      ).rejects.toThrow();

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
      expect(onMaxRetriesReached).toHaveBeenCalledWith(expect.objectContaining({
        type: ErrorType.SERVER,
        retryable: true,
      }));
    });

    it('should respect retry-after for rate limiting', async () => {
      const onRetry = vi.fn();
      const retryHandler = createSpotifyRetryHandler(onRetry);
      
      const apiError = new ApiError('Rate limited', 429);
      apiError.field_errors = { 'retry-after': '2' };
      
      const operation = vi
        .fn()
        .mockRejectedValueOnce(apiError)
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      await retryHandler(operation, 'test context', 3);
      const endTime = Date.now();

      // Should have waited at least 2 seconds (2000ms) for retry-after
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900); // Allow for some timing variance
      expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({
        retryAfter: 2,
      }));
    });
  });

  describe('getSpotifyErrorAction', () => {
    it('should return reconnect action for auth errors', () => {
      const authError = createSpotifyError(
        new ApiError('Token expired', 401),
        'test context'
      );

      const action = getSpotifyErrorAction(authError);

      expect(action.primaryAction).toBe('Reconnect Spotify');
      expect(action.primaryHandler).toBeDefined();
      expect(action.secondaryAction).toBe('Try Again');
    });

    it('should return reconnect action for scope errors', () => {
      const scopeError = createSpotifyError(
        new ApiError('insufficient_client_scope', 403),
        'test context'
      );

      const action = getSpotifyErrorAction(scopeError);

      expect(action.primaryAction).toBe('Reconnect Spotify');
      expect(action.primaryHandler).toBeDefined();
      expect(action.secondaryAction).toBe('Try Again');
    });

    it('should return premium action for premium required errors', () => {
      const premiumError = createSpotifyError(
        new ApiError('Premium required', 403, 'premium_required'),
        'test context'
      );

      const action = getSpotifyErrorAction(premiumError);

      expect(action.primaryAction).toBe('Learn About Premium');
      expect(action.primaryHandler).toBeDefined();
      expect(action.secondaryAction).toBe('Go Back');
    });

    it('should return retry action for retryable errors', () => {
      const retryableError = createSpotifyError(
        new ApiError('Server error', 500),
        'test context'
      );

      const action = getSpotifyErrorAction(retryableError);

      expect(action.primaryAction).toBe('Try Again');
      expect(action.primaryHandler).toBeDefined();
      expect(action.secondaryAction).toBe('Go to Dashboard');
    });

    it('should return dashboard action for non-retryable errors', () => {
      const nonRetryableError = createSpotifyError(
        new ApiError('Not found', 404),
        'test context'
      );

      const action = getSpotifyErrorAction(nonRetryableError);

      expect(action.primaryAction).toBe('Go to Dashboard');
      expect(action.primaryHandler).toBeDefined();
      expect(action.secondaryAction).toBe('Refresh Page');
    });

    it('should execute action handlers correctly', () => {
      const authError = createSpotifyError(
        new ApiError('Token expired', 401),
        'test context'
      );

      const action = getSpotifyErrorAction(authError);

      // Test primary action (redirect to auth)
      action.primaryHandler();
      expect(window.location.href).toBe('/api/spotify/auth/url');

      // Test secondary action (reload)
      action.secondaryHandler!();
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should open premium link for premium errors', () => {
      const premiumError = createSpotifyError(
        new ApiError('Premium required', 403, 'premium_required'),
        'test context'
      );

      const action = getSpotifyErrorAction(premiumError);

      // Test primary action (open premium link)
      action.primaryHandler();
      expect(window.open).toHaveBeenCalledWith(
        'https://www.spotify.com/premium/',
        '_blank'
      );

      // Test secondary action (go back)
      action.secondaryHandler!();
      expect(window.history.back).toHaveBeenCalled();
    });
  });

  describe('Error message mapping', () => {
    const testCases = [
      {
        error: new ApiError('insufficient_client_scope', 403),
        expectedMessage: 'additional Spotify permissions',
      },
      {
        error: new ApiError('Premium required', 403, 'premium_required'),
        expectedMessage: 'Spotify Premium subscription',
      },
      {
        error: new ApiError('Token expired', 401),
        expectedMessage: 'session has expired',
      },
      {
        error: new ApiError('Invalid token', 401),
        expectedMessage: 'issue with your Spotify connection',
      },
      {
        error: new ApiError('Rate limited', 429),
        expectedMessage: 'Too many requests',
      },
      {
        error: new ApiError('Player error', 500, 'player-error'),
        expectedMessage: 'Spotify player error',
      },
      {
        error: new ApiError('Not playing locally', 403, 'not-playing-locally'),
        expectedMessage: 'No active Spotify device',
      },
      {
        error: new ApiError('Context disallow', 403, 'context-disallow'),
        expectedMessage: 'not allowed for the current',
      },
    ];

    testCases.forEach(({ error, expectedMessage }) => {
      it(`should return correct message for ${error.error_code || error.message}`, () => {
        const spotifyError = createSpotifyError(error, 'test context');
        expect(spotifyError.userMessage).toContain(expectedMessage);
      });
    });
  });
});