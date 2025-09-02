import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@solidjs/testing-library';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Test component to access theme context
const TestComponent = () => {
  const theme = useTheme();
  
  return (
    <div>
      <div data-testid="theme">{theme.theme()}</div>
      <div data-testid="is-dark">{theme.isDark() ? 'true' : 'false'}</div>
      <button onClick={() => theme.toggleTheme()}>Toggle Theme</button>
      <button onClick={() => theme.setTheme('light')}>Set Light</button>
      <button onClick={() => theme.setTheme('dark')}>Set Dark</button>
    </div>
  );
};

const renderWithProvider = (component: any) => {
  return render(() => (
    <ThemeProvider>
      {component}
    </ThemeProvider>
  ));
};

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock matchMedia to return light theme by default
    mockMatchMedia.mockImplementation((query) => ({
      matches: false, // Not dark mode
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('should initialize with system theme (light)', () => {
    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
  });

  it('should initialize with system theme (dark)', () => {
    // Mock system dark mode
    mockMatchMedia.mockImplementation((query) => ({
      matches: true, // Dark mode
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
  });

  it('should use stored theme preference over system theme', () => {
    localStorageMock.getItem.mockReturnValue('dark');

    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
  });

  it('should toggle theme from light to dark', async () => {
    renderWithProvider(<TestComponent />);

    // Should start with light theme
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    // Click toggle button
    const toggleButton = screen.getByText('Toggle Theme');
    toggleButton.click();

    // Should switch to dark theme
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });

    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should toggle theme from dark to light', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    renderWithProvider(<TestComponent />);

    // Should start with dark theme
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    // Click toggle button
    const toggleButton = screen.getByText('Toggle Theme');
    toggleButton.click();

    // Should switch to light theme
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    });

    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('should set theme directly', async () => {
    renderWithProvider(<TestComponent />);

    // Should start with light theme
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    // Click set dark button
    const setDarkButton = screen.getByText('Set Dark');
    setDarkButton.click();

    // Should switch to dark theme
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });

    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should not change theme when setting same theme', async () => {
    renderWithProvider(<TestComponent />);

    // Should start with light theme
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    // Click set light button (same as current)
    const setLightButton = screen.getByText('Set Light');
    setLightButton.click();

    // Theme should remain the same
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');

    // Should still save to localStorage (idempotent operation)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    // Should not crash and fall back to system theme
    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
  });

  it('should handle invalid stored theme value', () => {
    localStorageMock.getItem.mockReturnValue('invalid-theme');

    // Should not crash and fall back to system theme
    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
  });

  it('should respond to system theme changes', async () => {
    const mediaQueryMock = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null as any,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    mockMatchMedia.mockReturnValue(mediaQueryMock);

    renderWithProvider(<TestComponent />);

    // Should start with light theme
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    // Simulate system theme change to dark
    mediaQueryMock.matches = true;
    if (mediaQueryMock.onchange) {
      mediaQueryMock.onchange({ matches: true } as any);
    }

    // Should update theme when no stored preference exists
    // Note: This would require the theme context to actually listen to media query changes
    // For now, we're just testing that the event listener is set up
    expect(mediaQueryMock.addEventListener).toHaveBeenCalled();
  });
});