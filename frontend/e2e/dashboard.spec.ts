import { test, expect } from '@playwright/test';
import { DashboardHelpers } from './utils/test-helpers';

test.describe('Dashboard', () => {
  let dashboardHelpers: DashboardHelpers;

  test.beforeEach(async ({ page }) => {
    dashboardHelpers = new DashboardHelpers(page);

    // Mock authentication
    await dashboardHelpers.mockApiResponse('/api/auth/me', {
      success: true,
      data: { id: 1, username: 'testuser' }
    });

    // Mock dashboard data
    await dashboardHelpers.mockApiResponse('/api/protected/dashboard', {
      success: true,
      data: {
        user: { id: 1, username: 'testuser' },
        stats: {
          totalWatchers: 3,
          activeWatchers: 2,
          totalSyncs: 15,
          lastSyncTime: '2024-01-15T10:30:00Z'
        }
      }
    });

    // Mock watchers data
    await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
      success: true,
      data: [
        {
          id: 1,
          name: 'My Favorites Sync',
          sourceService: 'youtube_music',
          targetService: 'spotify',
          status: 'idle',
          playlistName: 'My Favorites',
          lastSyncTime: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          name: 'Workout Playlist Sync',
          sourceService: 'spotify',
          targetService: 'youtube_music',
          status: 'running',
          playlistName: 'Workout Mix',
          lastSyncTime: '2024-01-15T09:15:00Z'
        }
      ]
    });

    // Mock service connections
    await dashboardHelpers.mockApiResponse('/api/protected/connections', {
      success: true,
      data: [
        {
          service: 'youtube_music',
          connected: true,
          username: 'testuser@gmail.com',
          connectedAt: '2024-01-10T12:00:00Z',
          lastRefresh: '2024-01-15T08:00:00Z'
        },
        {
          service: 'spotify',
          connected: true,
          username: 'testuser_spotify',
          connectedAt: '2024-01-12T14:30:00Z',
          lastRefresh: '2024-01-15T08:00:00Z'
        }
      ]
    });

    // Mock sync history
    await dashboardHelpers.mockApiResponse('/api/protected/sync-history', {
      success: true,
      data: [
        {
          id: 1,
          watcherId: 1,
          watcherName: 'My Favorites Sync',
          timestamp: '2024-01-15T10:30:00Z',
          status: 'success',
          songsAdded: 3,
          songsSkipped: 0
        },
        {
          id: 2,
          watcherId: 2,
          watcherName: 'Workout Playlist Sync',
          timestamp: '2024-01-15T09:15:00Z',
          status: 'partial',
          songsAdded: 5,
          songsSkipped: 2,
          error: 'Some songs could not be matched'
        }
      ]
    });
  });

  test.describe('Dashboard Loading', () => {
    test('should load dashboard with all sections', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Check that all main sections are present
      await expect(page.locator('h2:has-text("Service Connections"), h2:has-text("Connections")')).toBeVisible();
      await expect(page.locator('h2:has-text("Watchers")')).toBeVisible();
      await expect(page.locator('h2:has-text("Sync History")')).toBeVisible();
    });

    test('should display user profile information', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should display user information
      await expect(page.locator('text=testuser')).toBeVisible();
    });

    test('should display dashboard stats', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should show stats from mocked data
      await expect(page.locator('text=3, text=Total')).toBeVisible(); // Total watchers
      await expect(page.locator('text=2, text=Active')).toBeVisible(); // Active watchers
      await expect(page.locator('text=15, text=Syncs')).toBeVisible(); // Total syncs
    });

    test('should handle loading states', async ({ page }) => {
      await dashboardHelpers.goto('/dashboard');

      // Should show loading spinners initially
      const hasLoadingSpinner = await dashboardHelpers.isElementVisible('[role="status"], .animate-spin');
      
      // Wait for loading to complete
      await dashboardHelpers.waitForLoadingToComplete();

      // Dashboard content should be visible
      const hasDashboardSections = await dashboardHelpers.hasDashboardSections();
      expect(hasDashboardSections).toBe(true);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error for dashboard
      await dashboardHelpers.mockApiResponse('/api/protected/dashboard', {
        success: false,
        error: 'Failed to load dashboard data'
      }, 500);

      await dashboardHelpers.gotoDashboard();

      // Should show error message
      const hasError = await dashboardHelpers.hasErrorMessage('Failed to load');
      expect(hasError).toBe(true);

      // Should show retry option
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
      await expect(retryButton).toBeVisible();
    });
  });

  test.describe('Service Connections', () => {
    test('should display connected services', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should show YouTube Music connection
      await expect(page.locator('text=YouTube Music')).toBeVisible();
      await expect(page.locator('text=Connected')).toBeVisible();
      await expect(page.locator('text=testuser@gmail.com')).toBeVisible();

      // Should show Spotify connection
      await expect(page.locator('text=Spotify')).toBeVisible();
      await expect(page.locator('text=testuser_spotify')).toBeVisible();
    });

    test('should show disconnect options for connected services', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should have disconnect buttons for connected services
      const disconnectButtons = page.locator('button:has-text("Disconnect")');
      await expect(disconnectButtons).toHaveCount(2);
    });

    test('should handle service disconnection', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock disconnect API
      await dashboardHelpers.mockApiResponse('/api/protected/connections/youtube_music/disconnect', {
        success: true,
        message: 'Service disconnected successfully'
      });

      // Mock updated connections after disconnect
      await dashboardHelpers.mockApiResponse('/api/protected/connections', {
        success: true,
        data: [
          {
            service: 'youtube_music',
            connected: false
          },
          {
            service: 'spotify',
            connected: true,
            username: 'testuser_spotify',
            connectedAt: '2024-01-12T14:30:00Z',
            lastRefresh: '2024-01-15T08:00:00Z'
          }
        ]
      });

      // Find and click disconnect button for YouTube Music
      const ytDisconnectButton = page.locator('button:has-text("Disconnect")').first();
      
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      await ytDisconnectButton.click();

      // Should refresh connections
      await dashboardHelpers.waitForApiRequest('/api/protected/connections');
    });
  });

  test.describe('Watchers Overview', () => {
    test('should display watchers list', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should show watcher names
      await expect(page.locator('text=My Favorites Sync')).toBeVisible();
      await expect(page.locator('text=Workout Playlist Sync')).toBeVisible();

      // Should show watcher statuses
      await expect(page.locator('text=idle')).toBeVisible();
      await expect(page.locator('text=running')).toBeVisible();
    });

    test('should show create watcher button', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should have create watcher button
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create")');
      await expect(createButton.first()).toBeVisible();
    });

    test('should allow starting and stopping watchers', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should have Start button for idle watchers
      const startButtons = page.locator('button:has-text("Start")');
      await expect(startButtons.first()).toBeVisible();

      // Should have Stop button for running watchers  
      const stopButtons = page.locator('button:has-text("Stop")');
      await expect(stopButtons.first()).toBeVisible();
    });

    test('should handle watcher start operation', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock start watcher API
      await dashboardHelpers.mockApiResponse('/api/protected/watchers/My%20Favorites%20Sync/start', {
        success: true,
        message: 'Watcher started successfully'
      });

      // Mock updated watchers data
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: true,
        data: [
          {
            id: 1,
            name: 'My Favorites Sync',
            sourceService: 'youtube_music',
            targetService: 'spotify',
            status: 'running',
            playlistName: 'My Favorites',
            lastSyncTime: '2024-01-15T10:30:00Z'
          },
          {
            id: 2,
            name: 'Workout Playlist Sync',
            sourceService: 'spotify',
            targetService: 'youtube_music',
            status: 'running',
            playlistName: 'Workout Mix',
            lastSyncTime: '2024-01-15T09:15:00Z'
          }
        ]
      });

      // Click start button for the first watcher
      const startButton = page.locator('button:has-text("Start")').first();
      await startButton.click();

      // Should make API call to start watcher
      await dashboardHelpers.waitForApiRequest('/api/protected/watchers');
    });
  });

  test.describe('Sync History', () => {
    test('should display sync history entries', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should show watcher names from history
      await expect(page.locator('text=My Favorites Sync')).toBeVisible();
      await expect(page.locator('text=Workout Playlist Sync')).toBeVisible();

      // Should show sync results
      await expect(page.locator('text=3 added')).toBeVisible();
      await expect(page.locator('text=5 added')).toBeVisible();
      await expect(page.locator('text=2 skipped')).toBeVisible();
    });

    test('should show sync status indicators', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should show success and partial status indicators
      await expect(page.locator('text=success')).toBeVisible();
      await expect(page.locator('text=partial')).toBeVisible();
    });

    test('should display error information for failed syncs', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should show error details for partial sync
      await expect(page.locator('text=Some songs could not be matched')).toBeVisible();
    });

    test('should allow filtering sync history by watcher', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Should have filter dropdown
      const filterSelect = page.locator('select, [role="combobox"]').first();
      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption('My Favorites Sync');
        
        // Should filter results
        await dashboardHelpers.waitForLoadingToComplete();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await dashboardHelpers.gotoDashboard();

      // Dashboard should still be functional
      const hasDashboardSections = await dashboardHelpers.hasDashboardSections();
      expect(hasDashboardSections).toBe(true);
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await dashboardHelpers.gotoDashboard();

      // Dashboard should still be functional
      const hasDashboardSections = await dashboardHelpers.hasDashboardSections();
      expect(hasDashboardSections).toBe(true);
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow retrying failed operations', async ({ page }) => {
      // Mock initial API failure
      await dashboardHelpers.clearApiMocks();
      await dashboardHelpers.mockApiResponse('/api/protected/dashboard', {
        success: false,
        error: 'Network error'
      }, 500);

      await dashboardHelpers.gotoDashboard();

      // Should show error
      const hasError = await dashboardHelpers.hasErrorMessage('Network error');
      expect(hasError).toBe(true);

      // Mock successful retry
      await dashboardHelpers.mockApiResponse('/api/protected/dashboard', {
        success: true,
        data: {
          user: { id: 1, username: 'testuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
        }
      });

      // Click retry button
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
      await retryButton.click();

      // Should load successfully after retry
      await dashboardHelpers.waitForLoadingToComplete();
      const stillHasError = await dashboardHelpers.hasErrorMessage();
      expect(stillHasError).toBe(false);
    });

    test('should handle partial data loading failures', async ({ page }) => {
      // Mock dashboard success but watchers failure
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: false,
        error: 'Failed to load watchers'
      }, 500);

      await dashboardHelpers.gotoDashboard();

      // Dashboard section should load
      await expect(page.locator('text=testuser')).toBeVisible();

      // Watchers section should show error
      const watchersError = await dashboardHelpers.hasErrorMessage('Failed to load watchers');
      expect(watchersError).toBe(true);
    });
  });
});