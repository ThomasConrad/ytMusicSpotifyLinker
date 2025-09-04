import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { LoadingSpinner } from './LoadingSpinner';

export interface SpotifyLoadingProps {
  class?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface SpotifyOAuthLoadingProps extends SpotifyLoadingProps {
  step?: 'connecting' | 'authorizing' | 'completing';
}

export interface SpotifySyncLoadingProps extends SpotifyLoadingProps {
  progress?: number;
  total?: number;
  currentTrack?: string;
  status?: string;
  estimatedTime?: number;
}

export interface SpotifyPlaylistLoadingProps extends SpotifyLoadingProps {
  playlistCount?: number;
  currentPlaylist?: string;
}

export const SpotifyOAuthLoading: Component<SpotifyOAuthLoadingProps> = (props) => {
  const [dots, setDots] = createSignal('');
  let interval: number;

  onMount(() => {
    interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
  });

  onCleanup(() => {
    if (interval) {
      clearInterval(interval);
    }
  });

  const stepMessages = {
    connecting: 'Connecting to Spotify',
    authorizing: 'Waiting for authorization',
    completing: 'Finalizing connection',
  };

  const step = props.step || 'connecting';
  const size = props.size || 'md';

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div class={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${props.class || ''}`}>
      {/* Spotify Logo with Spinner */}
      <div class="relative mb-4">
        <div class="w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg">
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="white"
            class="transform scale-110"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.859-.179-.979-.539-.121-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <div class="absolute inset-0 animate-ping w-16 h-16 bg-[#1DB954] rounded-full opacity-20"></div>
      </div>

      {/* Status Message */}
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
        {stepMessages[step]}{dots()}
      </h3>

      {/* Step Indicator */}
      <div class="flex space-x-2 mb-4">
        <div class={`w-2 h-2 rounded-full ${step === 'connecting' ? 'bg-[#1DB954]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
        <div class={`w-2 h-2 rounded-full ${step === 'authorizing' ? 'bg-[#1DB954]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
        <div class={`w-2 h-2 rounded-full ${step === 'completing' ? 'bg-[#1DB954]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
      </div>

      {/* Instructions */}
      <p class="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
        {step === 'connecting' && 'Establishing secure connection with Spotify...'}
        {step === 'authorizing' && 'Please complete the authorization in the Spotify window.'}
        {step === 'completing' && 'Almost done! Saving your connection...'}
      </p>
    </div>
  );
};

export const SpotifySyncLoading: Component<SpotifySyncLoadingProps> = (props) => {
  const progress = props.progress || 0;
  const total = props.total || 100;
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const size = props.size || 'md';

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div class={`${sizeClasses[size]} ${props.class || ''}`}>
      {/* Header */}
      <div class="flex items-center justify-center mb-6">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="white"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.859-.179-.979-.539-.121-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <div class="text-right arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-gray-400">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="white"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div class="mb-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-900 dark:text-gray-50">
            Syncing Playlist
          </span>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {progress} of {total} tracks ({percentage}%)
          </span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            class="bg-gradient-to-r from-[#1DB954] to-[#1ed760] h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={`width: ${percentage}%`}
          >
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Current Track */}
      {props.currentTrack && (
        <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center space-x-2">
            <LoadingSpinner size="sm" color="primary" />
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-50">
                Currently processing:
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                {props.currentTrack}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status and Time Estimate */}
      <div class="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>{props.status || 'Processing tracks...'}</span>
        {props.estimatedTime && (
          <span>~{formatTime(props.estimatedTime)} remaining</span>
        )}
      </div>
    </div>
  );
};

export const SpotifyPlaylistLoading: Component<SpotifyPlaylistLoadingProps> = (props) => {
  const [dots, setDots] = createSignal('');
  let interval: number;

  onMount(() => {
    interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
  });

  onCleanup(() => {
    if (interval) {
      clearInterval(interval);
    }
  });

  const size = props.size || 'md';

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div class={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${props.class || ''}`}>
      {/* Animated Playlist Icon */}
      <div class="relative mb-4">
        <div class="w-12 h-12 bg-[#1DB954] rounded-lg flex items-center justify-center shadow-md">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="white"
            class="animate-pulse"
          >
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
        </div>
        <div class="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full border-2 border-[#1DB954] flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      </div>

      {/* Loading Message */}
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
        Loading Spotify Playlists{dots()}
      </h3>

      {/* Current Status */}
      <div class="space-y-1">
        {props.playlistCount && (
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Found {props.playlistCount} playlists
          </p>
        )}
        {props.currentPlaylist && (
          <p class="text-xs text-gray-500 dark:text-gray-500 truncate max-w-xs">
            Loading: {props.currentPlaylist}
          </p>
        )}
      </div>

      {/* Loading Animation */}
      <div class="flex space-x-1 mt-4">
        <div class="w-2 h-2 bg-[#1DB954] rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 bg-[#1DB954] rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 bg-[#1DB954] rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
    </div>
  );
};

export const SpotifyConnectionStatus: Component<{
  status: 'connecting' | 'testing' | 'success' | 'error';
  message?: string;
  class?: string;
}> = (props) => {
  const statusConfig = {
    connecting: {
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      icon: <LoadingSpinner size="sm" color="primary" />,
      defaultMessage: 'Connecting to Spotify...'
    },
    testing: {
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      icon: <LoadingSpinner size="sm" color="current" />,
      defaultMessage: 'Testing connection...'
    },
    success: {
      color: 'text-[#1DB954]',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      ),
      defaultMessage: 'Successfully connected to Spotify'
    },
    error: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ),
      defaultMessage: 'Failed to connect to Spotify'
    }
  };

  const config = statusConfig[props.status];

  return (
    <div class={`flex items-center space-x-2 p-3 rounded-lg ${config.bgColor} ${props.class || ''}`}>
      <div class={config.color}>
        {config.icon}
      </div>
      <span class={`text-sm font-medium ${config.color}`}>
        {props.message || config.defaultMessage}
      </span>
    </div>
  );
};

export const SpotifyMinimalLoading: Component<{ size?: 'sm' | 'md' }> = (props) => {
  const size = props.size || 'sm';
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div class={`inline-flex items-center space-x-2`}>
      <div class={`${sizeClasses} bg-[#1DB954] rounded-full animate-pulse`}></div>
      <div class={`${sizeClasses} bg-[#1DB954] rounded-full animate-pulse`} style="animation-delay: 0.2s"></div>
      <div class={`${sizeClasses} bg-[#1DB954] rounded-full animate-pulse`} style="animation-delay: 0.4s"></div>
    </div>
  );
};