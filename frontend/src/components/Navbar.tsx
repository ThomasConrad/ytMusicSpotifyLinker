import { Component, createSignal } from 'solid-js';
import { A, useNavigate, useLocation } from '@solidjs/router';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

const Navbar: Component = () => {
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const handleLogout = async () => {
    await auth.logout();
    setIsMenuOpen(false);
    navigate('/login');
  };

  // Animation delay for nav items
  const getAnimationDelay = (index: number) => {
    return `${index * 100}ms`;
  };

  return (
    <nav class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 animate-slide-down">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <A 
              href="/" 
              class="text-xl font-bold text-gray-800 dark:text-gray-200 hover:text-primary-500 transform transition-transform duration-300  animate-fade-in-slow"
            >
              YT Music Spotify Linker
            </A>
          </div>
          
          {/* Desktop Navigation */}
          <div class="hidden md:flex items-center space-x-6 animate-fade-in">
            <A 
              href="/" 
              class="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 transition-all duration-300 hover:animate-float relative px-2 py-1 after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary-500 after:left-0 after:bottom-0 after:transition-all after:duration-300 hover:after:w-full" 
              style={{"animation-delay": getAnimationDelay(0)}}
            >
              Home
            </A>
            <A 
              href="/about" 
              class="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 transition-all duration-300 hover:animate-float relative px-2 py-1 after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary-500 after:left-0 after:bottom-0 after:transition-all after:duration-300 hover:after:w-full" 
              style={{"animation-delay": getAnimationDelay(1)}}
            >
              Learn More
            </A>
            {auth.isAuthenticated() ? (
              <>
                <A 
                  href="/dashboard" 
                  class="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 transition-all duration-300 hover:animate-float relative px-2 py-1 after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary-500 after:left-0 after:bottom-0 after:transition-all after:duration-300 hover:after:w-full" 
                  style={{"animation-delay": getAnimationDelay(2)}}
                >
                  Dashboard
                </A>
                <button 
                  onClick={handleLogout} 
                  class="btn btn-secondary hover:animate-wiggle transition-transform animate-zoom-in" 
                  style={{"animation-delay": getAnimationDelay(3)}}
                >
                  Logout
                </button>
              </>
            ) : (
              <A 
                href="/login" 
                class="btn btn-primary animate-fade-in hover:animate-shadow-pulse transition-all transform " 
                style={{"animation-delay": getAnimationDelay(2)}}
              >
                Login
              </A>
            )}
            <div style={{"animation-delay": getAnimationDelay(3)}} class="animate-fade-in">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile menu button */}
          <div class="md:hidden animate-fade-in">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen())}
              class="p-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 focus:outline-none transition-all hover:scale-110 hover:animate-shake"
              aria-label="Toggle menu"
            >
              <svg
                class={`h-6 w-6 transition-transform duration-500 ease-in-out ${isMenuOpen() ? 'rotate-90' : 'rotate-0'}`}
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
                    class="animate-fade-in"
                  />
                ) : (
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M4 6h16M4 12h16M4 18h16"
                    class="animate-fade-in"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div 
          class={`md:hidden transition-all duration-500 ease-in-out overflow-hidden ${
            isMenuOpen() ? 'max-h-96 animate-slide-down opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div class="px-2 pt-2 pb-3 space-y-1">
            <A
              href="/"
              class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:translate-x-2 animate-slide-up"
              style={{"animation-delay": "100ms"}}
            >
              Home
            </A>
            <A
              href="/about"
              class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:translate-x-2 animate-slide-up"
              style={{"animation-delay": "200ms"}}
            >
              Learn More
            </A>
            {auth.isAuthenticated() ? (
              <>
                <A
                  href="/dashboard"
                  class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:translate-x-2 animate-slide-up"
                  style={{"animation-delay": "300ms"}}
                >
                  Dashboard
                </A>
                <button
                  onClick={handleLogout}
                  class="block w-full text-left px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:translate-x-2 animate-slide-up hover:animate-wiggle"
                  style={{"animation-delay": "400ms"}}
                >
                  Logout
                </button>
              </>
            ) : (
              <A
                href="/login"
                class="block px-3 py-2 rounded-md text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:translate-x-2 animate-slide-up animate-fade-in"
                style={{"animation-delay": "300ms"}}
              >
                Login
              </A>
            )}
            <div class="px-3 py-2 animate-slide-up" style={{"animation-delay": "400ms"}}>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 