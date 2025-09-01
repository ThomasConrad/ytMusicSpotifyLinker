import { test, expect } from '@playwright/test';

test.describe('Authentication Login Workflow', () => {
  test('should successfully login and navigate to dashboard without getting stuck on spinner', async ({ page }) => {
    // Start on the home page
    await page.goto('/');
    
    // Navigate to login page
    await page.click('a[href="/login"]');
    await expect(page).toHaveURL('/login');
    
    // Fill in login credentials
    await page.fill('#username', 'ferris');
    await page.fill('#password', 'hunter42');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and expect to be redirected to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // Ensure we're not stuck on the authentication spinner
    // The spinner shows "Checking authentication..." text
    await expect(page.locator('text=Checking authentication')).not.toBeVisible({ timeout: 5000 });
    
    // Verify we can see dashboard content (not spinner)
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
    
    // Verify user is actually authenticated by checking for logout button
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('should show appropriate error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Try to login with invalid credentials
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should stay on login page
    await expect(page).toHaveURL('/login');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should redirect to login when accessing protected route while unauthenticated', async ({ page }) => {
    // Try to access dashboard directly without being logged in
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login');
    
    // Should not show the spinner indefinitely
    await expect(page.locator('text=Checking authentication')).not.toBeVisible({ timeout: 5000 });
  });

  test('should preserve redirect after login', async ({ page }) => {
    // Try to access dashboard while unauthenticated
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Login with valid credentials
    await page.fill('#username', 'ferris');
    await page.fill('#password', 'hunter42');
    await page.click('button[type="submit"]');
    
    // Should redirect back to dashboard after login
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // Verify dashboard is loaded
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should handle logout correctly', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#username', 'ferris');
    await page.fill('#password', 'hunter42');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Click logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login', { timeout: 10000 });
    
    // Verify we can't access dashboard anymore
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should display console logs for debugging authentication flow', async ({ page }) => {
    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && (
        msg.text().includes('🔍') || 
        msg.text().includes('📞') || 
        msg.text().includes('📋') || 
        msg.text().includes('✅') || 
        msg.text().includes('❌') || 
        msg.text().includes('🏁')
      )) {
        logs.push(msg.text());
      }
    });

    // Go to login page and login
    await page.goto('/login');
    await page.fill('#username', 'ferris');
    await page.fill('#password', 'hunter42');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // Print captured logs for debugging
    console.log('Authentication flow logs:');
    logs.forEach(log => console.log(log));
    
    // Verify we got some debug logs
    expect(logs.length).toBeGreaterThan(0);
  });
});