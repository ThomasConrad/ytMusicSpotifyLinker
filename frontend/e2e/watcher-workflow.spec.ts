import { test, expect } from '@playwright/test';
import { DashboardHelpers } from './utils/test-helpers';

test.describe('Watcher Creation Workflow', () => {
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
        stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
      }
    });

    // Mock empty watchers initially
    await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
      success: true,
      data: []
    });

    // Mock connected services
    await dashboardHelpers.mockApiResponse('/api/protected/connections', {
      success: true,
      data: [
        {
          service: 'youtube_music',
          connected: true,
          username: 'testuser@gmail.com',
          connectedAt: '2024-01-10T12:00:00Z'
        },
        {
          service: 'spotify',
          connected: true,
          username: 'testuser_spotify',
          connectedAt: '2024-01-12T14:30:00Z'
        }
      ]
    });

    // Mock sync history
    await dashboardHelpers.mockApiResponse('/api/protected/sync-history', {
      success: true,
      data: []
    });
  });

  test.describe('Watcher Creation Form', () => {
    test('should open watcher creation modal', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Click create watcher button
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Modal should open
      await expect(page.locator('[role="dialog"], .modal, [data-testid="watcher-modal"]')).toBeVisible();
    });

    test('should display watcher creation form fields', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Check form fields are present
      await expect(page.locator('input[name="name"], [data-testid="watcher-name"]')).toBeVisible();
      await expect(page.locator('select[name="sourceService"], [data-testid="source-service"]')).toBeVisible();
      await expect(page.locator('select[name="targetService"], [data-testid="target-service"]')).toBeVisible();
      await expect(page.locator('input[name="sourcePlaylistId"], [data-testid="source-playlist"]')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Should show validation errors
      const hasErrors = await dashboardHelpers.hasErrorMessage();
      expect(hasErrors).toBe(true);
    });

    test('should prevent selecting same service for source and target', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Select same service for both
      const sourceSelect = page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
      await sourceSelect.selectOption('youtube_music');

      const targetSelect = page.locator('select[name="targetService"], [data-testid="target-service"]').first();
      await targetSelect.selectOption('youtube_music');

      // Fill other required fields
      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'Test Watcher');
      await dashboardHelpers.fillField('input[name="sourcePlaylistId"], [data-testid="source-playlist"]', 'playlist123');

      // Try to submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Should show validation error
      const hasError = await dashboardHelpers.hasErrorMessage();
      expect(hasError).toBe(true);
    });
  });

  test.describe('Successful Watcher Creation', () => {
    test('should create watcher successfully', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock successful watcher creation
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: true,
        data: {
          id: 1,
          name: 'My Test Watcher',
          sourceService: 'youtube_music',
          targetService: 'spotify',
          status: 'idle',
          sourcePlaylistId: 'yt_playlist_123'
        }
      }, 201);

      // Mock updated watchers list after creation
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: true,
        data: [
          {
            id: 1,
            name: 'My Test Watcher',
            sourceService: 'youtube_music',
            targetService: 'spotify',
            status: 'idle',
            playlistName: 'My Playlist',
            lastSyncTime: null
          }
        ]
      });

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Fill form with valid data
      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'My Test Watcher');
      
      const sourceSelect = page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
      await sourceSelect.selectOption('youtube_music');
      
      const targetSelect = page.locator('select[name="targetService"], [data-testid="target-service"]').first();
      await targetSelect.selectOption('spotify');

      await dashboardHelpers.fillField('input[name="sourcePlaylistId"], [data-testid="source-playlist"]', 'yt_playlist_123');

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Wait for creation to complete
      await dashboardHelpers.waitForApiRequest('/api/protected/watchers');

      // Modal should close
      await dashboardHelpers.waitForElementToHide('[role="dialog"], .modal, [data-testid="watcher-modal"]');

      // New watcher should appear in list
      await expect(page.locator('text=My Test Watcher')).toBeVisible();
    });

    test('should create watcher with new playlist option', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock successful watcher creation with new playlist
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: true,
        data: {
          id: 2,
          name: 'Auto Playlist Sync',
          sourceService: 'spotify',
          targetService: 'youtube_music',
          status: 'idle',
          createNewPlaylist: true,
          newPlaylistName: 'Synced from Spotify'
        }
      }, 201);

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Fill form
      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'Auto Playlist Sync');
      
      const sourceSelect = page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
      await sourceSelect.selectOption('spotify');
      
      const targetSelect = page.locator('select[name="targetService"], [data-testid="target-service"]').first();
      await targetSelect.selectOption('youtube_music');

      await dashboardHelpers.fillField('input[name="sourcePlaylistId"], [data-testid="source-playlist"]', 'spotify_playlist_456');

      // Select create new playlist option
      const createNewPlaylistCheckbox = page.locator('input[type="checkbox"][name="createNewPlaylist"], [data-testid="create-new-playlist"]').first();
      if (await createNewPlaylistCheckbox.isVisible()) {
        await createNewPlaylistCheckbox.check();
        
        // Fill new playlist name
        await dashboardHelpers.fillField('input[name="newPlaylistName"], [data-testid="new-playlist-name"]', 'Synced from Spotify');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Should create watcher successfully
      await dashboardHelpers.waitForApiRequest('/api/protected/watchers');
    });
  });

  test.describe('Watcher Creation Errors', () => {
    test('should handle API validation errors', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock API validation error
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: false,
        error: 'Validation failed',
        field_errors: {
          name: 'Watcher name already exists',
          sourcePlaylistId: 'Playlist not found'
        }
      }, 400);

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Fill form
      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'Existing Watcher');
      
      const sourceSelect = page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
      await sourceSelect.selectOption('youtube_music');
      
      const targetSelect = page.locator('select[name="targetService"], [data-testid="target-service"]').first();
      await targetSelect.selectOption('spotify');

      await dashboardHelpers.fillField('input[name="sourcePlaylistId"], [data-testid="source-playlist"]', 'invalid_playlist');

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Should show validation errors
      const hasErrors = await dashboardHelpers.hasErrorMessage();
      expect(hasErrors).toBe(true);

      // Should show specific field errors
      await expect(page.locator('text=Watcher name already exists')).toBeVisible();
      await expect(page.locator('text=Playlist not found')).toBeVisible();
    });

    test('should handle network errors during creation', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock network error
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: false,
        error: 'Network error occurred'
      }, 500);

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Fill form with valid data
      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'Network Test Watcher');
      
      const sourceSelect = page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
      await sourceSelect.selectOption('youtube_music');
      
      const targetSelect = page.locator('select[name="targetService"], [data-testid="target-service"]').first();
      await targetSelect.selectOption('spotify');

      await dashboardHelpers.fillField('input[name="sourcePlaylistId"], [data-testid="source-playlist"]', 'test_playlist');

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Should show network error
      const hasError = await dashboardHelpers.hasErrorMessage('Network error');
      expect(hasError).toBe(true);
    });

    test('should handle service disconnection during creation', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Mock service disconnected error
      await dashboardHelpers.mockApiResponse('/api/protected/watchers', {
        success: false,
        error: 'YouTube Music service is not connected'
      }, 400);

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Fill form
      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'Disconnected Service Test');
      
      const sourceSelect = page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
      await sourceSelect.selectOption('youtube_music');
      
      const targetSelect = page.locator('select[name="targetService"], [data-testid="target-service"]').first();
      await targetSelect.selectOption('spotify');

      await dashboardHelpers.fillField('input[name="sourcePlaylistId"], [data-testid="source-playlist"]', 'test_playlist');

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Should show service connection error
      const hasError = await dashboardHelpers.hasErrorMessage('service is not connected');
      expect(hasError).toBe(true);
    });
  });

  test.describe('Form Interaction', () => {
    test('should close modal when clicking cancel', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Modal should be visible
      await expect(page.locator('[role="dialog"], .modal, [data-testid="watcher-modal"]')).toBeVisible();

      // Click cancel button
      const cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-button"]').first();
      await cancelButton.click();

      // Modal should close
      await dashboardHelpers.waitForElementToHide('[role="dialog"], .modal, [data-testid="watcher-modal"]');
    });

    test('should close modal when clicking outside', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Modal should be visible
      await expect(page.locator('[role="dialog"], .modal, [data-testid="watcher-modal"]')).toBeVisible();

      // Click outside modal (on backdrop)
      const modal = page.locator('[role="dialog"], .modal, [data-testid="watcher-modal"]').first();
      const modalBox = await modal.boundingBox();
      
      if (modalBox) {
        // Click outside the modal box
        await page.click('body', { position: { x: modalBox.x - 10, y: modalBox.y - 10 } });
        
        // Modal should close
        await dashboardHelpers.waitForElementToHide('[role="dialog"], .modal, [data-testid="watcher-modal"]');
      }
    });

    test('should close modal when pressing escape key', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open create watcher modal
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      // Modal should be visible
      await expect(page.locator('[role="dialog"], .modal, [data-testid="watcher-modal"]')).toBeVisible();

      // Press escape key
      await page.keyboard.press('Escape');

      // Modal should close
      await dashboardHelpers.waitForElementToHide('[role="dialog"], .modal, [data-testid="watcher-modal"]');
    });

    test('should reset form when modal is reopened', async ({ page }) => {
      await dashboardHelpers.gotoDashboard();

      // Open modal and fill form
      const createButton = page.locator('button:has-text("Create Watcher"), button:has-text("Create Your First Watcher")').first();
      await createButton.click();

      await dashboardHelpers.fillField('input[name="name"], [data-testid="watcher-name"]', 'Test Name');

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-button"]').first();
      await cancelButton.click();
      await dashboardHelpers.waitForElementToHide('[role="dialog"], .modal, [data-testid="watcher-modal"]');

      // Reopen modal
      await createButton.click();

      // Form should be reset
      const nameInput = page.locator('input[name="name"], [data-testid="watcher-name"]').first();
      const value = await nameInput.inputValue();
      expect(value).toBe('');
    });
  });
});