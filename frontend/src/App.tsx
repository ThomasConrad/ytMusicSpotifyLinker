import { Component, Suspense, lazy } from 'solid-js';
import { Routes, Route } from '@solidjs/router';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { ProtectedRoute, GuestRoute } from './components/auth';
import { Navbar } from './components/Navbar';
import { LoadingSpinner } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const About = lazy(() => import('./pages/About'));

// Loading fallback component
const PageLoadingFallback = () => (
  <div class="flex items-center justify-center min-h-[400px]">
    <div class="text-center">
      <LoadingSpinner size="lg" label="Loading page" />
      <p class="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

const App: Component = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error:', error);
        // In production, send to error reporting service
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 animate-fade-in-slow">
              <Navbar />
              <main class="flex-1 py-8 animate-zoom-in">
                <div class="container mx-auto px-4">
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      <Route path="/" component={Home} />
                      <Route path="/about" component={About} />
                      <Route
                        path="/login"
                        component={() => (
                          <GuestRoute redirectTo="/dashboard">
                            <Login />
                          </GuestRoute>
                        )}
                      />
                      <Route
                        path="/dashboard"
                        component={() => (
                          <ProtectedRoute redirectTo="/login">
                            <Dashboard />
                          </ProtectedRoute>
                        )}
                      />
                    </Routes>
                  </Suspense>
                </div>
              </main>
              <footer class="bg-white dark:bg-gray-800 py-8 border-t border-gray-200 dark:border-gray-700 mt-auto animate-slide-up">
                <div class="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
                  <p class="animate-fade-in">
                    © 2024 YT Music Spotify Linker. All rights reserved.
                  </p>
                </div>
              </footer>
            </div>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;