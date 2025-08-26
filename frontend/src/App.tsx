import { Routes, Route } from '@solidjs/router';
import { Component } from 'solid-js';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';

const App: Component = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 animate-fade-in-slow">
          <Navbar />
          <main class="flex-1 py-8 animate-zoom-in">
            <div class="container mx-auto px-4">
              <Routes>
                <Route path="/" component={Home} />
                <Route path="/login" component={Login} />
                <Route path="/about" component={About} />
                <Route 
                  path="/dashboard" 
                  component={() => (
                    <ProtectedRoute redirectTo="/login">
                      <Dashboard />
                    </ProtectedRoute>
                  )} 
                />
              </Routes>
            </div>
          </main>
          <footer class="bg-white dark:bg-gray-800 py-8 border-t border-gray-200 dark:border-gray-700 mt-auto animate-slide-up">
            <div class="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
              <p class="animate-fade-in" style={{"animation-delay": "300ms"}}>© 2024 YT Music Spotify Linker. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 