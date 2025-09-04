import { Component, Show, createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

export const Navbar: Component = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false);

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen());
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div class="flex-shrink-0">
            <A
              href="/"
              class="text-xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
              onClick={closeMobileMenu}
            >
              YT Music Spotify Linker
            </A>
          </div>

          {/* Desktop Menu */}
          <div class="hidden md:flex md:items-center md:space-x-6">
            <A
              href="/about"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              activeClass="text-primary-600 dark:text-primary-400"
            >
              About
            </A>

            <Show
              when={isAuthenticated()}
              fallback={
                <div class="flex items-center space-x-3">
                  <ThemeToggle />
                  <A href="/login">
                    <Button variant="primary" size="sm">
                      Sign In
                    </Button>
                  </A>
                </div>
              }
            >
              <A
                href="/dashboard"
                class="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                activeClass="text-primary-600 dark:text-primary-400"
              >
                Dashboard
              </A>

              <div class="flex items-center space-x-3">
                <ThemeToggle />
                <span class="text-sm text-gray-600 dark:text-gray-300">
                  {user()?.username}
                </span>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </Show>
          </div>

          {/* Mobile menu button */}
          <div class="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={toggleMobileMenu}
              class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              <Show
                when={!isMobileMenuOpen()}
                fallback={
                  // Close icon
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                }
              >
                {/* Hamburger icon */}
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Show>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <Show when={isMobileMenuOpen()}>
          <div class="md:hidden border-t border-gray-200 dark:border-gray-700 py-4 space-y-3">
            <A
              href="/about"
              class="block text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 py-2"
              activeClass="text-primary-600 dark:text-primary-400"
              onClick={closeMobileMenu}
            >
              About
            </A>

            <Show
              when={isAuthenticated()}
              fallback={
                <div class="pt-2">
                  <A href="/login" onClick={closeMobileMenu}>
                    <Button variant="primary" size="sm" class="w-full">
                      Sign In
                    </Button>
                  </A>
                </div>
              }
            >
              <A
                href="/dashboard"
                class="block text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 py-2"
                activeClass="text-primary-600 dark:text-primary-400"
                onClick={closeMobileMenu}
              >
                Dashboard
              </A>

              <div class="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div class="text-sm text-gray-600 dark:text-gray-300 py-1">
                  Signed in as {user()?.username}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  class="w-full"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </nav>
  );
};
