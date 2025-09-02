import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/authApi';

// Mock the auth API
vi.mock('../../services/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="is-loading">{auth.isLoading() ? 'true' : 'false'}</div>
      <div data-testid="is-authenticated">{auth.isAuthenticated() ? 'true' : 'false'}</div>
      <div data-testid="user">{auth.user()?.username || 'null'}</div>
      <div data-testid="error">{auth.error() || 'null'}</div>
      <div data-testid="has-checked">{auth.hasInitiallyChecked() ? 'true' : 'false'}</div>
      <button onClick={() => auth.login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
};

const renderWithProviders = (component: any) => {
  return render(() => (
    <Router>
      <AuthProvider>
        {component}
      </AuthProvider>
    </Router>
  ));
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    // Mock getCurrentUser to return no user
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      success: false,
      error: 'Not authenticated',
    });

    renderWithProviders(<TestComponent />);

    // Should start with loading state
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');

    // Wait for initial check to complete
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('has-checked')).toHaveTextContent('true');
    });
  });

  it('should authenticate user on successful login', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    // Mock successful login
    vi.mocked(authApi.login).mockResolvedValue({
      success: true,
      data: mockUser,
    });

    renderWithProviders(<TestComponent />);

    // Click login button
    const loginButton = screen.getByText('Login');
    loginButton.click();

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });

    expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle login failure', async () => {
    // Mock failed login
    vi.mocked(authApi.login).mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });

    renderWithProviders(<TestComponent />);

    // Click login button
    const loginButton = screen.getByText('Login');
    loginButton.click();

    // Wait for login attempt to complete
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  it('should logout user successfully', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    // Mock initial authenticated state
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      success: true,
      data: mockUser,
    });

    // Mock successful logout
    vi.mocked(authApi.logout).mockResolvedValue({
      success: true,
      data: undefined,
    });

    renderWithProviders(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    // Click logout button
    const logoutButton = screen.getByText('Logout');
    logoutButton.click();

    // Wait for logout to complete
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    expect(authApi.logout).toHaveBeenCalled();
  });

  it('should handle network errors during initial check', async () => {
    // Mock network error
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<TestComponent />);

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to check authentication status');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('has-checked')).toHaveTextContent('true');
    });
  });

  it('should clear error when login succeeds after failure', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    // Mock initial failed login
    vi.mocked(authApi.login)
      .mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      })
      .mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

    renderWithProviders(<TestComponent />);

    // First login attempt - should fail
    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });

    // Second login attempt - should succeed and clear error
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });
});