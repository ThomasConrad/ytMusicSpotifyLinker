import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Global test setup

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000',
  hostname: 'localhost',
  port: '3000',
  protocol: 'http:',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    length: 1,
    state: null,
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Mock environment variables
vi.mock('import.meta.env', () => ({
  DEV: true,
  PROD: false,
  VITE_API_BASE_URL: 'http://localhost:3000/api',
}));

// Clean up after each test
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset localStorage
  localStorageMock.getItem.mockReturnValue(null);

  // Reset location
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockLocation.hash = '';

  // Reset console to avoid test output noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Cleanup function for tests
export const cleanup = () => {
  // Reset all mocks
  vi.resetAllMocks();

  // Clear timers
  vi.clearAllTimers();

  // Reset modules
  vi.resetModules();
};
