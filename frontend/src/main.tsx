/* @refresh reload */
import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';

import './index.css';
import App from './App';
import { startPerformanceMonitoring, mark } from './utils/performance';

// Mark the start of app initialization
mark('app-init-start');

const root = document.getElementById('root');

if (import.meta.env?.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?'
  );
}

// Mark before render
mark('app-render-start');

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  root!
);

// Mark after render
mark('app-render-end');

// Start performance monitoring
if (typeof window !== 'undefined') {
  // Wait for initial render to complete
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      startPerformanceMonitoring();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      startPerformanceMonitoring();
    }, 100);
  }
}
