import {
  AppError,
  ErrorType,
  createAppError,
  retryOperation,
} from './errorHandling';
import { ApiError } from '../services/apiClient';

export interface SpotifyError extends AppError {
  spotifyCode?: string;
  spotifyDetails?: any;
  retryable: boolean;
  retryAfter?: number;
}

export enum SpotifyErrorCode {
  INSUFFICIENT_CLIENT_SCOPE = 'insufficient-client-scope',
  PLAYER_ERROR = 'player-error',
  VOLUME_CONTROL_DISALLOWED = 'volume-control-disallowed',
  NO_PREV_TRACK = 'no-prev-track',
  NO_NEXT_TRACK = 'no-next-track',
  NO_SPECIFIC_TRACK = 'no-specific-track',
  ALREADY_PAUSED = 'already-paused',
  NOT_PAUSED = 'not-paused',
  NOT_PLAYING_LOCALLY = 'not-playing-locally',
  NOT_PLAYING_TRACK = 'not-playing-track',
  NOT_PLAYING_CONTEXT = 'not-playing-context',
  ENDLESS_CONTEXT = 'endless-context',
  CONTEXT_DISALLOW = 'context-disallow',
  ALREADY_PLAYING = 'already-playing',
  RATE_LIMITED = 'rate-limited',
  UNKNOWN_TRACK = 'unknown-track',
  CONTEXT_FAILURE = 'context-failure',
  PREMIUM_REQUIRED = 'premium-required',
  TOKEN_EXPIRED = 'token-expired',
  TOKEN_INVALID = 'token-invalid',
}

export function createSpotifyError(
  error: unknown,
  context?: string,
  userMessage?: string
): SpotifyError {
  let baseError: AppError;
  let spotifyCode: string | undefined;
  let spotifyDetails: any;
  let retryable = false;
  let retryAfter: number | undefined;

  if (error instanceof ApiError) {
    const errorType = determineSpotifyErrorType(error);
    baseError = createAppError(error, errorType, userMessage);
    
    spotifyCode = extractSpotifyErrorCode(error);
    spotifyDetails = error.field_errors || {};
    retryable = isRetryableSpotifyError(error);
    retryAfter = extractRetryAfter(error);
  } else {
    const errorType = determineSpotifyErrorType(error);
    baseError = createAppError(error, errorType, userMessage);
    retryable = isRetryableError(error);
  }

  const spotifyError: SpotifyError = {
    ...baseError,
    userMessage: userMessage || getSpotifyUserMessage(error, spotifyCode),
    spotifyCode,
    spotifyDetails,
    retryable,
    retryAfter,
  };

  if (context) {
    console.group(`🎵 Spotify Error (${context})`);
    console.error('Spotify Code:', spotifyCode);
    console.error('Retryable:', retryable);
    if (retryAfter) console.error('Retry After:', `${retryAfter}s`);
    console.error('Details:', spotifyDetails);
    console.groupEnd();
  }

  return spotifyError;
}

function determineSpotifyErrorType(error: unknown): ErrorType {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return ErrorType.AUTHENTICATION;
      case 403:
        const message = error.message.toLowerCase();
        if (message.includes('premium') || message.includes('subscription')) {
          return ErrorType.AUTHORIZATION;
        }
        if (message.includes('scope') || message.includes('permission')) {
          return ErrorType.AUTHORIZATION;
        }
        return ErrorType.AUTHORIZATION;
      case 404:
        return ErrorType.NOT_FOUND;
      case 429:
        return ErrorType.NETWORK;
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorType.SERVER;
      default:
        if (error.status >= 400 && error.status < 500) {
          return ErrorType.CLIENT;
        }
        return ErrorType.SERVER;
    }
  }

  if (error && typeof error === 'object') {
    const errorObj = error as any;
    const message = (errorObj.message || '').toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('token') || message.includes('auth')) {
      return ErrorType.AUTHENTICATION;
    }
  }

  return ErrorType.UNKNOWN;
}

function extractSpotifyErrorCode(error: ApiError): string | undefined {
  if (error.error_code) {
    return error.error_code;
  }

  const message = error.message.toLowerCase();
  
  if (message.includes('insufficient_client_scope')) {
    return SpotifyErrorCode.INSUFFICIENT_CLIENT_SCOPE;
  }
  if (message.includes('premium required') || message.includes('premium_required')) {
    return SpotifyErrorCode.PREMIUM_REQUIRED;
  }
  if (message.includes('token') && message.includes('expired')) {
    return SpotifyErrorCode.TOKEN_EXPIRED;
  }
  if (message.includes('token') && message.includes('invalid')) {
    return SpotifyErrorCode.TOKEN_INVALID;
  }
  if (message.includes('rate') && message.includes('limit')) {
    return SpotifyErrorCode.RATE_LIMITED;
  }

  return undefined;
}

function extractRetryAfter(error: ApiError): number | undefined {
  if (error.status === 429) {
    if (error.field_errors?.['retry-after']) {
      return parseInt(error.field_errors['retry-after'], 10);
    }
    
    const match = error.message.match(/retry\s*after\s*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    return 60;
  }
  return undefined;
}

function isRetryableSpotifyError(error: ApiError): boolean {
  switch (error.status) {
    case 429:
    case 500:
    case 502:
    case 503:
    case 504:
      return true;
    case 401:
      const code = extractSpotifyErrorCode(error);
      return code === SpotifyErrorCode.TOKEN_EXPIRED;
    default:
      return false;
  }
}

function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    const message = (errorObj.message || '').toLowerCase();
    
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('fetch');
  }
  return false;
}

function getSpotifyUserMessage(error: unknown, spotifyCode?: string): string {
  if (spotifyCode) {
    switch (spotifyCode) {
      case SpotifyErrorCode.INSUFFICIENT_CLIENT_SCOPE:
        return 'This feature requires additional Spotify permissions. Please reconnect your Spotify account.';
      case SpotifyErrorCode.PREMIUM_REQUIRED:
        return 'This feature requires a Spotify Premium subscription.';
      case SpotifyErrorCode.TOKEN_EXPIRED:
        return 'Your Spotify session has expired. Please reconnect your account.';
      case SpotifyErrorCode.TOKEN_INVALID:
        return 'There\'s an issue with your Spotify connection. Please reconnect your account.';
      case SpotifyErrorCode.RATE_LIMITED:
        return 'Too many requests to Spotify. Please wait a moment and try again.';
      case SpotifyErrorCode.PLAYER_ERROR:
        return 'Spotify player error. Make sure Spotify is open and try again.';
      case SpotifyErrorCode.NOT_PLAYING_LOCALLY:
        return 'No active Spotify device found. Please start playing music on Spotify first.';
      case SpotifyErrorCode.CONTEXT_DISALLOW:
        return 'This action is not allowed for the current track or playlist.';
      default:
        break;
    }
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'Your Spotify session has expired. Please reconnect your account.';
      case 403:
        const message = error.message.toLowerCase();
        if (message.includes('premium')) {
          return 'This feature requires a Spotify Premium subscription.';
        }
        if (message.includes('scope') || message.includes('permission')) {
          return 'This feature requires additional Spotify permissions. Please reconnect your account.';
        }
        return 'You don\'t have permission to perform this action on Spotify.';
      case 404:
        return 'The requested Spotify content was not found or may have been removed.';
      case 429:
        return 'Spotify is busy right now. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Spotify is temporarily unavailable. Please try again in a few minutes.';
      default:
        return 'An error occurred with Spotify. Please try again.';
    }
  }

  return 'An unexpected Spotify error occurred. Please try again.';
}

export async function retrySpotifyOperation<T>(
  operation: () => Promise<T>,
  context?: string,
  maxAttempts: number = 3
): Promise<T> {
  return retryOperation(
    operation,
    maxAttempts,
    1000,
    true
  ).catch((error) => {
    throw createSpotifyError(error, context);
  });
}

export async function withSpotifyErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  fallbackValue?: T
): Promise<{ data: T | null; error: SpotifyError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const spotifyError = createSpotifyError(error, context);
    return {
      data: fallbackValue || null,
      error: spotifyError,
    };
  }
}

export function createSpotifyRetryHandler(
  onRetry?: (attempt: number, error: SpotifyError) => void,
  onMaxRetriesReached?: (error: SpotifyError) => void
) {
  return async function retryWithSpotifyHandling<T>(
    operation: () => Promise<T>,
    context?: string,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: SpotifyError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = createSpotifyError(error, context);

        if (attempt === maxAttempts) {
          if (onMaxRetriesReached && lastError) {
            onMaxRetriesReached(lastError);
          }
          break;
        }

        if (!lastError.retryable) {
          break;
        }

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        const delay = lastError.retryAfter ? 
          lastError.retryAfter * 1000 : 
          Math.pow(2, attempt - 1) * 1000;
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || createSpotifyError(new Error('Unknown retry error'), context);
  };
}

export function getSpotifyErrorAction(error: SpotifyError): {
  primaryAction: string;
  primaryHandler: () => void;
  secondaryAction?: string;
  secondaryHandler?: () => void;
} {
  const isAuth = error.type === ErrorType.AUTHENTICATION || 
                error.spotifyCode === SpotifyErrorCode.TOKEN_EXPIRED ||
                error.spotifyCode === SpotifyErrorCode.TOKEN_INVALID;

  const isScope = error.spotifyCode === SpotifyErrorCode.INSUFFICIENT_CLIENT_SCOPE;

  if (isAuth || isScope) {
    return {
      primaryAction: 'Reconnect Spotify',
      primaryHandler: () => {
        window.location.href = '/api/spotify/auth/url';
      },
      secondaryAction: 'Try Again',
      secondaryHandler: () => {
        window.location.reload();
      }
    };
  }

  if (error.type === ErrorType.AUTHORIZATION && 
      error.spotifyCode === SpotifyErrorCode.PREMIUM_REQUIRED) {
    return {
      primaryAction: 'Learn About Premium',
      primaryHandler: () => {
        window.open('https://www.spotify.com/premium/', '_blank');
      },
      secondaryAction: 'Go Back',
      secondaryHandler: () => {
        window.history.back();
      }
    };
  }

  if (error.retryable) {
    return {
      primaryAction: 'Try Again',
      primaryHandler: () => {
        window.location.reload();
      },
      secondaryAction: 'Go to Dashboard',
      secondaryHandler: () => {
        window.location.href = '/dashboard';
      }
    };
  }

  return {
    primaryAction: 'Go to Dashboard',
    primaryHandler: () => {
      window.location.href = '/dashboard';
    },
    secondaryAction: 'Refresh Page',
    secondaryHandler: () => {
      window.location.reload();
    }
  };
}

export {
  withErrorHandling as withGenericErrorHandling,
  retryOperation as retryGenericOperation,
} from './errorHandling';