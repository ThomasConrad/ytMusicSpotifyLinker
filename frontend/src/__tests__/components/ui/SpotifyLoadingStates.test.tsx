import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@solidjs/testing-library';
import {
  SpotifyOAuthLoading,
  SpotifySyncLoading,
  SpotifyPlaylistLoading,
  SpotifyConnectionStatus,
  SpotifyMinimalLoading,
} from '../../../components/ui/SpotifyLoadingStates';

describe('SpotifyLoadingStates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('SpotifyOAuthLoading', () => {
    it('should render connecting step by default', () => {
      render(() => <SpotifyOAuthLoading />);

      expect(screen.getByText('Connecting to Spotify')).toBeTruthy();
      expect(screen.getByText(/Establishing secure connection/)).toBeTruthy();
    });

    it('should render authorizing step', () => {
      render(() => <SpotifyOAuthLoading step="authorizing" />);

      expect(screen.getByText('Waiting for authorization')).toBeTruthy();
      expect(screen.getByText(/Please complete the authorization/)).toBeTruthy();
    });

    it('should render completing step', () => {
      render(() => <SpotifyOAuthLoading step="completing" />);

      expect(screen.getByText('Finalizing connection')).toBeTruthy();
      expect(screen.getByText(/Almost done!/)).toBeTruthy();
    });

    it('should animate dots', () => {
      render(() => <SpotifyOAuthLoading step="connecting" />);

      const titleElement = screen.getByText(/Connecting to Spotify/);
      expect(titleElement.textContent).toBe('Connecting to Spotify');

      // Fast forward timer to see dots animation
      vi.advanceTimersByTime(500);
      expect(titleElement.textContent).toBe('Connecting to Spotify.');

      vi.advanceTimersByTime(500);
      expect(titleElement.textContent).toBe('Connecting to Spotify..');

      vi.advanceTimersByTime(500);
      expect(titleElement.textContent).toBe('Connecting to Spotify...');

      vi.advanceTimersByTime(500);
      expect(titleElement.textContent).toBe('Connecting to Spotify');
    });

    it('should show step indicators correctly', () => {
      const { rerender } = render(() => <SpotifyOAuthLoading step="connecting" />);

      // Check connecting step indicators
      const stepDots = screen.getAllByRole('generic');
      const activeDots = stepDots.filter(dot => 
        dot.className.includes('bg-[#1DB954]')
      );
      expect(activeDots.length).toBe(1); // Only first step should be active

      // Change to authorizing step
      rerender(() => <SpotifyOAuthLoading step="authorizing" />);
      expect(screen.getByText('Waiting for authorization')).toBeTruthy();
    });

    it('should apply custom size classes', () => {
      render(() => <SpotifyOAuthLoading size="lg" />);

      const container = screen.getByText('Connecting to Spotify').closest('div');
      expect(container?.className).toContain('p-8');
    });
  });

  describe('SpotifySyncLoading', () => {
    it('should render with default progress', () => {
      render(() => <SpotifySyncLoading />);

      expect(screen.getByText('Syncing Playlist')).toBeTruthy();
      expect(screen.getByText('0 of 100 tracks (0%)')).toBeTruthy();
      expect(screen.getByText('Processing tracks...')).toBeTruthy();
    });

    it('should render with custom progress', () => {
      render(() => (
        <SpotifySyncLoading
          progress={25}
          total={50}
          currentTrack="Test Song - Test Artist"
          status="Matching tracks on YouTube Music"
          estimatedTime={120}
        />
      ));

      expect(screen.getByText('25 of 50 tracks (50%)')).toBeTruthy();
      expect(screen.getByText('Test Song - Test Artist')).toBeTruthy();
      expect(screen.getByText('Matching tracks on YouTube Music')).toBeTruthy();
      expect(screen.getByText('~2m 0s remaining')).toBeTruthy();
    });

    it('should format time correctly', () => {
      render(() => (
        <SpotifySyncLoading
          progress={10}
          total={100}
          estimatedTime={65}
        />
      ));

      expect(screen.getByText('~1m 5s remaining')).toBeTruthy();
    });

    it('should show current track section when provided', () => {
      render(() => (
        <SpotifySyncLoading
          currentTrack="Currently Processing Track"
        />
      ));

      expect(screen.getByText('Currently processing:')).toBeTruthy();
      expect(screen.getByText('Currently Processing Track')).toBeTruthy();
    });

    it('should calculate percentage correctly', () => {
      render(() => (
        <SpotifySyncLoading
          progress={33}
          total={100}
        />
      ));

      expect(screen.getByText('33 of 100 tracks (33%)')).toBeTruthy();
      
      const progressBar = screen.getByRole('generic').querySelector('[style*="width: 33%"]');
      expect(progressBar).toBeTruthy();
    });
  });

  describe('SpotifyPlaylistLoading', () => {
    it('should render default loading message', () => {
      render(() => <SpotifyPlaylistLoading />);

      expect(screen.getByText('Loading Spotify Playlists')).toBeTruthy();
    });

    it('should animate dots', () => {
      render(() => <SpotifyPlaylistLoading />);

      const titleElement = screen.getByText(/Loading Spotify Playlists/);
      expect(titleElement.textContent).toBe('Loading Spotify Playlists');

      vi.advanceTimersByTime(500);
      expect(titleElement.textContent).toBe('Loading Spotify Playlists.');

      vi.advanceTimersByTime(1500);
      expect(titleElement.textContent).toBe('Loading Spotify Playlists...');

      vi.advanceTimersByTime(500);
      expect(titleElement.textContent).toBe('Loading Spotify Playlists');
    });

    it('should show playlist count when provided', () => {
      render(() => (
        <SpotifyPlaylistLoading
          playlistCount={15}
          currentPlaylist="My Awesome Playlist"
        />
      ));

      expect(screen.getByText('Found 15 playlists')).toBeTruthy();
      expect(screen.getByText('Loading: My Awesome Playlist')).toBeTruthy();
    });

    it('should apply custom size classes', () => {
      render(() => <SpotifyPlaylistLoading size="sm" />);

      const container = screen.getByText('Loading Spotify Playlists').closest('div');
      expect(container?.className).toContain('p-4');
    });
  });

  describe('SpotifyConnectionStatus', () => {
    it('should render connecting status', () => {
      render(() => <SpotifyConnectionStatus status="connecting" />);

      expect(screen.getByText('Connecting to Spotify...')).toBeTruthy();
      expect(screen.getByLabelText('Loading')).toBeTruthy(); // LoadingSpinner
    });

    it('should render testing status', () => {
      render(() => <SpotifyConnectionStatus status="testing" />);

      expect(screen.getByText('Testing connection...')).toBeTruthy();
      expect(screen.getByLabelText('Loading')).toBeTruthy(); // LoadingSpinner
    });

    it('should render success status', () => {
      render(() => <SpotifyConnectionStatus status="success" />);

      expect(screen.getByText('Successfully connected to Spotify')).toBeTruthy();
      // Success icon should be present
      const successIcon = screen.getByRole('generic').querySelector('svg');
      expect(successIcon).toBeTruthy();
    });

    it('should render error status', () => {
      render(() => <SpotifyConnectionStatus status="error" />);

      expect(screen.getByText('Failed to connect to Spotify')).toBeTruthy();
      // Error icon should be present
      const errorIcon = screen.getByRole('generic').querySelector('svg');
      expect(errorIcon).toBeTruthy();
    });

    it('should render custom message', () => {
      render(() => (
        <SpotifyConnectionStatus 
          status="success" 
          message="Connected as: user@example.com"
        />
      ));

      expect(screen.getByText('Connected as: user@example.com')).toBeTruthy();
    });

    it('should apply correct styling for each status', () => {
      const { rerender } = render(() => <SpotifyConnectionStatus status="connecting" />);

      let container = screen.getByText('Connecting to Spotify...').closest('div');
      expect(container?.className).toContain('bg-blue-100');

      rerender(() => <SpotifyConnectionStatus status="success" />);
      container = screen.getByText('Successfully connected to Spotify').closest('div');
      expect(container?.className).toContain('bg-green-100');

      rerender(() => <SpotifyConnectionStatus status="error" />);
      container = screen.getByText('Failed to connect to Spotify').closest('div');
      expect(container?.className).toContain('bg-red-100');
    });
  });

  describe('SpotifyMinimalLoading', () => {
    it('should render with small size by default', () => {
      render(() => <SpotifyMinimalLoading />);

      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-[#1DB954]')
      );
      expect(dots.length).toBe(3);
      
      // Check for small size class
      dots.forEach(dot => {
        expect(dot.className).toContain('w-4 h-4');
      });
    });

    it('should render with medium size', () => {
      render(() => <SpotifyMinimalLoading size="md" />);

      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-[#1DB954]')
      );
      
      // Check for medium size class
      dots.forEach(dot => {
        expect(dot.className).toContain('w-6 h-6');
      });
    });

    it('should animate dots with staggered delay', () => {
      render(() => <SpotifyMinimalLoading />);

      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-[#1DB954]') && el.className.includes('animate-pulse')
      );
      
      expect(dots.length).toBe(3);
      
      // Check staggered animation delays
      expect(dots[1].style.animationDelay).toBe('0.2s');
      expect(dots[2].style.animationDelay).toBe('0.4s');
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels for OAuth loading', () => {
      render(() => <SpotifyOAuthLoading />);

      // Should have accessible loading indicators
      expect(screen.getByLabelText(/Loading/)).toBeTruthy();
    });

    it('should provide semantic markup for sync progress', () => {
      render(() => (
        <SpotifySyncLoading
          progress={50}
          total={100}
          currentTrack="Test Song"
        />
      ));

      // Progress information should be accessible
      expect(screen.getByText(/50 of 100 tracks/)).toBeTruthy();
      expect(screen.getByText(/Currently processing:/)).toBeTruthy();
    });

    it('should maintain proper contrast for status indicators', () => {
      render(() => <SpotifyConnectionStatus status="success" />);

      const statusContainer = screen.getByText('Successfully connected to Spotify').closest('div');
      expect(statusContainer?.className).toContain('text-[#1DB954]');
    });
  });

  describe('Theming', () => {
    it('should use Spotify brand colors consistently', () => {
      render(() => <SpotifyOAuthLoading />);

      // Check for Spotify green color usage
      const spotifyLogo = screen.getByRole('generic').querySelector('.bg-\\[\\#1DB954\\]');
      expect(spotifyLogo).toBeTruthy();
    });

    it('should support dark mode classes', () => {
      render(() => <SpotifyConnectionStatus status="connecting" />);

      const container = screen.getByText('Connecting to Spotify...').closest('div');
      expect(container?.className).toContain('dark:bg-blue-900/20');
    });

    it('should use proper spacing and sizing', () => {
      render(() => <SpotifySyncLoading size="lg" />);

      const container = screen.getByText('Syncing Playlist').closest('div');
      expect(container?.className).toContain('p-8');
    });
  });
});