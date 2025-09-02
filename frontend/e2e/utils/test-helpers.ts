import { Page, expect, Locator } from '@playwright/test';

/**
 * Helper class for common E2E test operations
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific route and wait for it to load
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill a form field and wait for any validation
   */
  async fillField(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
    // Wait a bit for any validation to trigger
    await this.page.waitForTimeout(100);
  }

  /**
   * Click a button and wait for any loading states
   */
  async clickButton(selector: string): Promise<void> {
    await this.page.click(selector);
    // Wait for potential navigation or loading
    await this.page.waitForTimeout(100);
  }

  /**
   * Wait for an element to be visible and return it
   */
  async waitForElement(selector: string): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    return element;
  }

  /**
   * Wait for an element to be hidden
   */
  async waitForElementToHide(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeHidden();
  }

  /**
   * Check if user is on login page
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  /**
   * Check if user is on dashboard page
   */
  async isOnDashboardPage(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete(): Promise<void> {
    // Wait for any loading spinners to appear and then disappear
    const spinner = this.page.locator('[role="status"], [data-testid*="loading"], .animate-spin').first();
    
    try {
      // Wait for spinner to appear (with short timeout)
      await spinner.waitFor({ state: 'visible', timeout: 1000 });
      // Then wait for it to disappear
      await spinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // If no spinner appears, that's fine - continue
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element contains text
   */
  async elementContainsText(selector: string, text: string): Promise<boolean> {
    try {
      await expect(this.page.locator(selector)).toContainText(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for API request to complete
   */
  async waitForApiRequest(urlPattern: string): Promise<void> {
    await this.page.waitForResponse(response => 
      response.url().includes(urlPattern) && response.status() < 400
    );
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string, response: any, status: number = 200): Promise<void> {
    await this.page.route(`**${urlPattern}**`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Clear all API mocks
   */
  async clearApiMocks(): Promise<void> {
    await this.page.unrouteAll();
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await expect(element).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if page has error message
   */
  async hasErrorMessage(message?: string): Promise<boolean> {
    const errorSelectors = [
      '[role="alert"]',
      '.error',
      '[data-testid*="error"]',
      '.text-red-600',
      '.text-red-400'
    ];

    for (const selector of errorSelectors) {
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          if (message) {
            const text = await element.textContent();
            if (text?.includes(message)) return true;
          } else {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Get form validation errors
   */
  async getValidationErrors(): Promise<string[]> {
    const errorElements = this.page.locator('[role="alert"], .error, [data-testid*="error"]');
    const count = await errorElements.count();
    const errors: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await errorElements.nth(i).textContent();
      if (text) errors.push(text);
    }
    
    return errors;
  }
}

/**
 * Authentication helpers
 */
export class AuthHelpers extends TestHelpers {
  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<void> {
    await this.goto('/login');
    
    // Fill login form
    await this.fillField('input[name="username"], input[type="email"]', username);
    await this.fillField('input[name="password"], input[type="password"]', password);
    
    // Submit form
    await this.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for navigation
    await this.waitForNavigation();
  }

  /**
   * Register new user
   */
  async register(username: string, password: string): Promise<void> {
    await this.goto('/login');
    
    // Look for registration link or toggle
    const registerLink = this.page.locator('text=Register, text=Sign up, [data-testid="register-link"]').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
    }
    
    // Fill registration form
    await this.fillField('input[name="username"], input[type="email"]', username);
    await this.fillField('input[name="password"], input[type="password"]', password);
    
    // Submit form
    await this.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
    
    // Wait for navigation
    await this.waitForNavigation();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Look for logout button/link
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.waitForNavigation();
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    // Check for dashboard URL or authenticated indicators
    return this.isOnDashboardPage() || 
           await this.isElementVisible('[data-testid="user-menu"], .user-profile, button:has-text("Logout")');
  }
}

/**
 * Dashboard helpers
 */
export class DashboardHelpers extends TestHelpers {
  /**
   * Navigate to dashboard and wait for it to load
   */
  async gotoDashboard(): Promise<void> {
    await this.goto('/dashboard');
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if dashboard sections are visible
   */
  async hasDashboardSections(): Promise<boolean> {
    const sections = [
      'Service Connections',
      'Watchers',
      'Sync History'
    ];

    for (const section of sections) {
      const isVisible = await this.isElementVisible(`h2:has-text("${section}"), h3:has-text("${section}")`);
      if (!isVisible) return false;
    }

    return true;
  }

  /**
   * Create a new watcher
   */
  async createWatcher(name: string, sourceService: string, targetService: string): Promise<void> {
    // Look for "Create Watcher" button
    const createButton = this.page.locator('button:has-text("Create Watcher"), [data-testid="create-watcher"]').first();
    await createButton.click();

    // Fill watcher form
    await this.fillField('input[name="name"], [data-testid="watcher-name"]', name);
    
    // Select source service
    const sourceSelect = this.page.locator('select[name="sourceService"], [data-testid="source-service"]').first();
    await sourceSelect.selectOption(sourceService);
    
    // Select target service  
    const targetSelect = this.page.locator('select[name="targetService"], [data-testid="target-service"]').first();
    await targetSelect.selectOption(targetService);

    // Submit form
    await this.clickButton('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    
    // Wait for creation to complete
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if watcher exists in the list
   */
  async hasWatcher(name: string): Promise<boolean> {
    return await this.isElementVisible(`text=${name}, [data-testid*="${name}"]`);
  }
}