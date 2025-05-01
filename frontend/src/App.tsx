import { Routes, Route } from '@solidjs/router';
import { Component } from 'solid-js';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import About from './pages/About';

const App: Component = () => {
  return (
    <div class="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar />
      <main class="flex-1 section">
        <div class="container">
          <Routes>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/about" component={About} />
          </Routes>
        </div>
      </main>
      <footer class="bg-white py-8 border-t border-gray-200">
        <div class="container text-center text-gray-600">
          <p>© 2024 YT Music Spotify Linker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App; 