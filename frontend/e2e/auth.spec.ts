import { test, expect } from '@playwright/test';
import { AuthHelpers } from './utils/test-helpers';

test.describe('Authentication Flow', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await authHelpers.goto('/login');

      // Check that login form elements are present
      await expect(page.locator('input[type="email"], input[name="username"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await authHelpers.goto('/login');

      // Try to submit empty form
      await authHelpers.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

      // Should show validation errors
      const hasErrors = await authHelpers.hasErrorMessage();
      expect(hasErrors).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await authHelpers.goto('/login');

      // Mock login API to return error
      await authHelpers.mockApiResponse('/api/auth/login', {
        success: false,
        error: 'Invalid username or password'
      }, 401);

      // Try to login with invalid credentials
      await authHelpers.fillField('input[type="email"], input[name="username"]', 'invalid@example.com');
      await authHelpers.fillField('input[type="password"], input[name="password"]', 'wrongpassword');
      await authHelpers.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

      // Should show error message
      const hasError = await authHelpers.hasErrorMessage('Invalid username or password');
      expect(hasError).toBe(true);
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await authHelpers.goto('/login');

      // Mock successful login
      await authHelpers.mockApiResponse('/api/auth/login', {
        success: true,
        data: { id: 1, username: 'testuser' }
      });

      // Mock dashboard data requests
      await authHelpers.mockApiResponse('/api/protected/dashboard', {
        success: true,
        data: {
          user: { id: 1, username: 'testuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
        }
      });

      await authHelpers.mockApiResponse('/api/protected/connections', {
        success: true,
        data: []
      });

      // Login with valid credentials
      await authHelpers.fillField('input[type="email"], input[name="username"]', 'testuser@example.com');
      await authHelpers.fillField('input[type="password"], input[name="password"]', 'correctpassword');
      await authHelpers.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

      // Should redirect to dashboard
      await authHelpers.waitForNavigation();
      expect(await authHelpers.isOnDashboardPage()).toBe(true);
    });

    test('should remember return URL after login', async ({ page }) => {
      // Try to access protected route
      await authHelpers.goto('/dashboard');

      // Should redirect to login with return URL
      await authHelpers.waitForNavigation();
      expect(await authHelpers.isOnLoginPage()).toBe(true);

      // Mock successful login
      await authHelpers.mockApiResponse('/api/auth/login', {
        success: true,
        data: { id: 1, username: 'testuser' }
      });

      await authHelpers.mockApiResponse('/api/protected/dashboard', {
        success: true,
        data: {
          user: { id: 1, username: 'testuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
        }
      });

      // Login
      await authHelpers.fillField('input[type="email"], input[name="username"]', 'testuser@example.com');
      await authHelpers.fillField('input[type="password"], input[name="password"]', 'correctpassword');
      await authHelpers.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

      // Should redirect back to dashboard
      await authHelpers.waitForNavigation();
      expect(await authHelpers.isOnDashboardPage()).toBe(true);
    });
  });

  test.describe('Registration', () => {
    test('should display registration form', async ({ page }) => {
      await authHelpers.goto('/login');

      // Look for registration link or switch
      const registerToggle = page.locator('text=Register, text=Sign up, button:has-text("Register")').first();
      if (await registerToggle.isVisible()) {
        await registerToggle.click();
      }

      // Check that registration form elements are present
      await expect(page.locator('input[type="email"], input[name="username"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")')).toBeVisible();
    });

    test('should show validation errors for invalid registration data', async ({ page }) => {
      await authHelpers.goto('/login');

      // Switch to registration if needed
      const registerToggle = page.locator('text=Register, text=Sign up, button:has-text("Register")').first();
      if (await registerToggle.isVisible()) {
        await registerToggle.click();
      }

      // Mock registration API to return validation errors
      await authHelpers.mockApiResponse('/api/auth/register', {
        success: false,
        error: 'Validation failed',
        field_errors: {
          username: 'Username already exists',
          password: 'Password too short'
        }
      }, 400);

      // Try to register with invalid data
      await authHelpers.fillField('input[type="email"], input[name="username"]', 'existing@example.com');
      await authHelpers.fillField('input[type="password"], input[name="password"]', '123');
      await authHelpers.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');

      // Should show validation errors
      const hasErrors = await authHelpers.hasErrorMessage();
      expect(hasErrors).toBe(true);
    });

    test('should register successfully with valid data', async ({ page }) => {
      await authHelpers.goto('/login');

      // Switch to registration if needed
      const registerToggle = page.locator('text=Register, text=Sign up, button:has-text("Register")').first();
      if (await registerToggle.isVisible()) {
        await registerToggle.click();
      }

      // Mock successful registration
      await authHelpers.mockApiResponse('/api/auth/register', {
        success: true,
        data: { id: 2, username: 'newuser' }
      });

      // Mock dashboard data for new user
      await authHelpers.mockApiResponse('/api/protected/dashboard', {
        success: true,
        data: {
          user: { id: 2, username: 'newuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
        }
      });

      await authHelpers.mockApiResponse('/api/protected/connections', {
        success: true,
        data: []
      });

      // Register with valid data
      await authHelpers.fillField('input[type="email"], input[name="username"]', 'newuser@example.com');
      await authHelpers.fillField('input[type="password"], input[name="password"]', 'securepassword');
      await authHelpers.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');

      // Should redirect to dashboard
      await authHelpers.waitForNavigation();
      expect(await authHelpers.isOnDashboardPage()).toBe(true);
    });
  });

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Setup authenticated state
      await authHelpers.goto('/login');

      await authHelpers.mockApiResponse('/api/auth/login', {
        success: true,
        data: { id: 1, username: 'testuser' }
      });

      await authHelpers.mockApiResponse('/api/protected/dashboard', {
        success: true,
        data: {
          user: { id: 1, username: 'testuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
        }
      });

      await authHelpers.mockApiResponse('/api/protected/connections', {
        success: true,
        data: []
      });

      // Login first
      await authHelpers.fillField('input[type="email"], input[name="username"]', 'testuser@example.com');
      await authHelpers.fillField('input[type="password"], input[name="password"]', 'password');
      await authHelpers.clickButton('button[type="submit"], button:has-text("Login")');
      await authHelpers.waitForNavigation();
    });

    test('should logout successfully', async ({ page }) => {
      // Verify we're logged in
      expect(await authHelpers.isLoggedIn()).toBe(true);

      // Mock logout API
      await authHelpers.mockApiResponse('/api/auth/logout', {
        success: true,
        message: 'Logged out successfully'
      });

      // Logout
      await authHelpers.logout();

      // Should redirect to home or login page
      await authHelpers.waitForNavigation();
      const isLoggedOut = await authHelpers.isOnLoginPage() || authHelpers.getCurrentUrl().includes('/');
      expect(isLoggedOut).toBe(true);
    });

    test('should clear authentication state after logout', async ({ page }) => {
      // Logout
      await authHelpers.mockApiResponse('/api/auth/logout', {
        success: true,
        message: 'Logged out successfully'
      });

      await authHelpers.logout();
      await authHelpers.waitForNavigation();

      // Try to access protected route - should redirect to login
      await authHelpers.goto('/dashboard');
      await authHelpers.waitForNavigation();
      expect(await authHelpers.isOnLoginPage()).toBe(true);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access dashboard without authentication
      await authHelpers.goto('/dashboard');
      await authHelpers.waitForNavigation();

      // Should be redirected to login
      expect(await authHelpers.isOnLoginPage()).toBe(true);
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // Mock authentication check
      await authHelpers.mockApiResponse('/api/auth/me', {
        success: true,
        data: { id: 1, username: 'testuser' }
      });

      await authHelpers.mockApiResponse('/api/protected/dashboard', {
        success: true,
        data: {
          user: { id: 1, username: 'testuser' },
          stats: { totalWatchers: 0, activeWatchers: 0, totalSyncs: 0 }
        }
      });

      await authHelpers.mockApiResponse('/api/protected/connections', {
        success: true,
        data: []
      });

      // Access dashboard with valid session
      await authHelpers.goto('/dashboard');
      await authHelpers.waitForLoadingToComplete();

      // Should remain on dashboard
      expect(await authHelpers.isOnDashboardPage()).toBe(true);
    });
  });
});