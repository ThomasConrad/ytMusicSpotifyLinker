import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import { UserProvider, useUser } from '../../contexts/UserContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { userApi } from '../../services/userApi';
import { watcherApi } from '../../services/watcherApi';

// Mock the APIs
vi.mock('../../services/userApi', () => ({
  userApi: {
    getDashboard: vi.fn(),
    getServiceConnections: vi.fn(),
    disconnectService: vi.fn(),
  },
}));

vi.mock('../../services/watcherApi', () => ({
  watcherApi: {
    getWatchers: vi.fn(),
    startWatcher: vi.fn(),
    stopWatcher: vi.fn(),
    createWatcher: vi.fn(),
  },
}));

vi.mock('../../services/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 1, username: 'testuser' },
    }),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

// Test component to access user context
const TestComponent = () => {
  const user = useUser();

  return (
    <div>
      <div data-testid="dashboard-loading">
        {user.isLoadingDashboard() ? 'true' : 'false'}
      </div>
      <div data-testid="dashboard-error">{user.dashboardError() || 'null'}</div>
      <div data-testid="watchers-loading">
        {user.isLoadingWatchers() ? 'true' : 'false'}
      </div>
      <div data-testid="watchers-count">{user.watchers().length}</div>
      <div data-testid="connections-loading">
        {user.isLoadingConnections() ? 'true' : 'false'}
      </div>
      <div data-testid="connections-count">
        {user.serviceConnections().length}
      </div>
      <button onClick={() => user.retryDashboard()}>Retry Dashboard</button>
      <button onClick={() => user.refreshAll()}>Refresh All</button>
      <button onClick={() => user.startWatcher('test-watcher')}>
        Start Watcher
      </button>
    </div>
  );
};

const renderWithProviders = (component: any) => {
  return render(() => (
    <Router>
      <AuthProvider>
        <UserProvider>{component}</UserProvider>
      </AuthProvider>
    </Router>
  ));
};

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and load data for authenticated user', async () => {
    const mockDashboardData = {
      user: { id: 1, username: 'testuser' },
      stats: {
        totalWatchers: 2,
        activeWatchers: 1,
        totalSyncs: 5,
        lastSyncTime: '2024-01-01T00:00:00Z',
      },
    };

    const mockWatchers = [
      {
        id: 1,
        name: 'Test Watcher 1',
        sourceService: 'youtube_music',
        targetService: 'spotify',
        status: 'idle',
        playlistName: 'Test Playlist',
      },
    ];

    const mockConnections = [
      { service: 'youtube_music', connected: true, username: 'ytuser' },
    ];

    vi.mocked(userApi.getDashboard).mockResolvedValue({
      success: true,
      data: mockDashboardData,
    });

    vi.mocked(watcherApi.getWatchers).mockResolvedValue({
      success: true,
      data: mockWatchers,
    });

    vi.mocked(userApi.getServiceConnections).mockResolvedValue({
      success: true,
      data: mockConnections,
    });

    renderWithProviders(<TestComponent />);

    // Should start with loading states
    expect(screen.getByTestId('dashboard-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('watchers-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('connections-loading')).toHaveTextContent('true');

    // Wait for all data to load
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('watchers-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('connections-loading')).toHaveTextContent(
        'false'
      );
    });

    expect(screen.getByTestId('watchers-count')).toHaveTextContent('1');
    expect(screen.getByTestId('connections-count')).toHaveTextContent('1');
    expect(screen.getByTestId('dashboard-error')).toHaveTextContent('null');
  });

  it('should handle dashboard loading error', async () => {
    vi.mocked(userApi.getDashboard).mockResolvedValue({
      success: false,
      error: 'Failed to load dashboard',
    });

    // Mock other APIs to succeed
    vi.mocked(watcherApi.getWatchers).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(userApi.getServiceConnections).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent(
        'Failed to load dashboard'
      );
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent(
        'false'
      );
    });
  });

  it('should retry dashboard loading', async () => {
    // First call fails, second succeeds
    vi.mocked(userApi.getDashboard)
      .mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 1, username: 'testuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 },
        },
      });

    vi.mocked(watcherApi.getWatchers).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(userApi.getServiceConnections).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<TestComponent />);

    // Wait for initial error
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent(
        'Network error'
      );
    });

    // Click retry button
    const retryButton = screen.getByText('Retry Dashboard');
    retryButton.click();

    // Wait for retry to succeed
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent('null');
    });

    expect(userApi.getDashboard).toHaveBeenCalledTimes(3); // Initial + retry + context refresh
  });

  it('should start watcher successfully', async () => {
    const mockWatchers = [
      {
        id: 1,
        name: 'test-watcher',
        sourceService: 'youtube_music',
        targetService: 'spotify',
        status: 'idle',
        playlistName: 'Test',
      },
    ];

    vi.mocked(userApi.getDashboard).mockResolvedValue({
      success: true,
      data: {
        user: { id: 1, username: 'testuser' },
        stats: { totalWatchers: 1, activeWatchers: 0, totalSyncs: 0 },
      },
    });

    vi.mocked(watcherApi.getWatchers).mockResolvedValue({
      success: true,
      data: mockWatchers,
    });

    vi.mocked(userApi.getServiceConnections).mockResolvedValue({
      success: true,
      data: [],
    });

    vi.mocked(watcherApi.startWatcher).mockResolvedValue({
      success: true,
      data: undefined,
    });

    renderWithProviders(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent(
        'false'
      );
    });

    // Click start watcher button
    const startButton = screen.getByText('Start Watcher');
    startButton.click();

    // Should call the API
    await waitFor(() => {
      expect(watcherApi.startWatcher).toHaveBeenCalledWith('test-watcher');
    });
  });

  it('should handle watcher start error', async () => {
    vi.mocked(userApi.getDashboard).mockResolvedValue({
      success: true,
      data: {
        user: { id: 1, username: 'testuser' },
        stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 },
      },
    });

    vi.mocked(watcherApi.getWatchers).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(userApi.getServiceConnections).mockResolvedValue({
      success: true,
      data: [],
    });

    vi.mocked(watcherApi.startWatcher).mockResolvedValue({
      success: false,
      error: 'Watcher not found',
    });

    renderWithProviders(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent(
        'false'
      );
    });

    // Click start watcher button
    const startButton = screen.getByText('Start Watcher');
    startButton.click();

    // Should handle the error gracefully (component should remain functional)
    await waitFor(() => {
      expect(watcherApi.startWatcher).toHaveBeenCalledWith('test-watcher');
    });
  });

  it('should refresh all data', async () => {
    vi.mocked(userApi.getDashboard).mockResolvedValue({
      success: true,
      data: {
        user: { id: 1, username: 'testuser' },
        stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 },
      },
    });

    vi.mocked(watcherApi.getWatchers).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(userApi.getServiceConnections).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent(
        'false'
      );
    });

    // Clear mock calls from initial load
    vi.clearAllMocks();

    // Click refresh all button
    const refreshButton = screen.getByText('Refresh All');
    refreshButton.click();

    // Should call all APIs again
    await waitFor(() => {
      expect(userApi.getDashboard).toHaveBeenCalled();
      expect(watcherApi.getWatchers).toHaveBeenCalled();
      expect(userApi.getServiceConnections).toHaveBeenCalled();
    });
  });
});
