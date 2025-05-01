import { Component, createSignal, onMount } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import ThemeToggle from './ThemeToggle';

const Navbar: Component = () => {
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const navigate = useNavigate();

  onMount(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
      <div class="container">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <A href="/" class="text-xl font-bold text-gradient">
              YT Music Spotify Linker
            </A>
          </div>
          
          {/* Desktop Navigation */}
          <div class="hidden md:flex items-center space-x-6">
            <A href="/" class="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
              Home
            </A>
            <A href="/about" class="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
              Learn More
            </A>
            {isAuthenticated() ? (
              <>
                <A href="/dashboard" class="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
                  Dashboard
                </A>
                <button onClick={handleLogout} class="btn btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <A href="/login" class="btn btn-primary">
                Login
              </A>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile menu button */}
          <div class="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen())}
              class="p-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 focus:outline-none"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen() ? (
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div class={`md:hidden ${isMenuOpen() ? 'block' : 'hidden'}`}>
          <div class="px-2 pt-2 pb-3 space-y-1">
            <A
              href="/"
              class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Home
            </A>
            <A
              href="/about"
              class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Learn More
            </A>
            {isAuthenticated() ? (
              <>
                <A
                  href="/dashboard"
                  class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Dashboard
                </A>
                <button
                  onClick={handleLogout}
                  class="block w-full text-left px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <A
                href="/login"
                class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Login
              </A>
            )}
            <div class="px-3 py-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 