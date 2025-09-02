# YT Music Spotify Linker - Frontend

A modern, accessible SolidJS frontend for the YT Music Spotify Linker application. This application allows users to synchronize playlists between YouTube Music and Spotify with automated playlist management and cross-platform synchronization.

## Features

- 🔐 **Secure Authentication** - Session-based authentication with automatic session management
- 📱 **Responsive Design** - Fully responsive interface that works on desktop, tablet, and mobile
- 🎨 **Dark Mode Support** - System preference detection with manual toggle
- ♿ **Accessibility** - WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- 🚀 **Performance Optimized** - Code splitting, lazy loading, and Core Web Vitals monitoring
- 🧪 **Comprehensive Testing** - Unit tests, integration tests, and E2E tests with Playwright
- 🔧 **Developer Experience** - TypeScript, ESLint, Prettier, and hot reload

## Tech Stack

- **Framework**: SolidJS 1.8+ with TypeScript 5.3+
- **Styling**: Tailwind CSS 3.4+ with custom theme and dark mode
- **Build Tool**: Vite 5.1+ with optimized production builds
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Code Quality**: ESLint, Prettier, strict TypeScript configuration

## Architecture

### Component Structure

```
src/
├── components/
│   ├── auth/              # Authentication components
│   │   ├── ProtectedRoute.tsx
│   │   └── index.ts
│   ├── dashboard/         # Dashboard-specific components
│   │   ├── UserProfile.tsx
│   │   ├── ServiceConnections.tsx
│   │   ├── WatcherOverview.tsx
│   │   ├── DashboardStats.tsx
│   │   └── SyncHistory.tsx
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── index.ts
│   ├── watchers/          # Watcher management components
│   │   ├── WatcherForm.tsx
│   │   ├── WatcherModal.tsx
│   │   └── SyncPreview.tsx
│   ├── ErrorBoundary.tsx # Error boundary for graceful error handling
│   ├── Navbar.tsx        # Navigation component
│   └── ThemeToggle.tsx   # Theme switching component
├── contexts/              # Global state management
│   ├── AuthContext.tsx   # Authentication state
│   ├── UserContext.tsx   # User data and dashboard state
│   └── ThemeContext.tsx  # Theme management
├── pages/                 # Route components
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── About.tsx
├── services/              # API communication
│   ├── apiClient.ts      # Base API client with error handling
│   ├── authApi.ts        # Authentication API calls
│   ├── userApi.ts        # User and dashboard API calls
│   └── watcherApi.ts     # Watcher management API calls
├── types/                 # TypeScript type definitions
│   ├── auth.ts
│   ├── user.ts
│   ├── watcher.ts
│   └── index.ts
└── utils/                 # Utility functions
    ├── errorHandling.ts  # Error management utilities
    ├── accessibility.ts  # Accessibility helpers
    ├── performance.ts    # Performance monitoring
    └── index.ts
```

### State Management

The application uses SolidJS's reactive primitives with context providers for global state:

- **AuthContext**: Manages authentication state, login/logout, and session management
- **UserContext**: Handles dashboard data, watchers, service connections, and sync history
- **ThemeContext**: Controls light/dark mode with system preference detection

### API Integration

- **apiClient**: Base HTTP client with automatic error handling and retry logic
- **authApi**: Authentication endpoints (login, register, logout, profile)
- **userApi**: Dashboard data, service connections, and sync history
- **watcherApi**: Watcher CRUD operations and sync management

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend server running on port 3000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

### Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality
```bash
npm run lint         # Lint code with ESLint
npm run format       # Format code with Prettier
npm run typecheck    # Type checking with TypeScript
```

### Testing
```bash
npm run test         # Run unit tests with Vitest
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run E2E tests with Playwright
```

### Performance & Analysis
```bash
npm run analyze      # Analyze bundle size
npm run lighthouse   # Run Lighthouse audit
npm run perf:audit   # Complete performance audit
```

## Development Guidelines

### Component Development

1. **Single Responsibility**: Each component handles one specific UI concern
2. **TypeScript**: All components must have proper type definitions
3. **Accessibility**: Include ARIA labels, semantic HTML, and keyboard support
4. **Error Handling**: Implement proper error boundaries and user feedback
5. **Testing**: Write unit tests for all components

### Code Style

- Use TypeScript with strict mode enabled
- Follow ESLint and Prettier configurations
- Use semantic HTML elements
- Implement proper error handling
- Write self-documenting code with JSDoc comments

### State Management

- Use SolidJS reactive primitives (signals, effects, memos)
- Keep state as close to where it's used as possible
- Use contexts for truly global state
- Implement proper loading and error states

### Performance Best Practices

- Lazy load routes and large components
- Use proper memoization for expensive computations
- Optimize bundle size with code splitting
- Monitor Core Web Vitals

## Testing Strategy

### Unit Tests
- Test component rendering and behavior
- Test context providers and hooks
- Test utility functions and API services
- Located in `src/__tests__/`

### Integration Tests
- Test component interactions
- Test API integration points
- Test authentication flows

### E2E Tests
- Test complete user workflows
- Test cross-browser compatibility
- Test accessibility features
- Located in `e2e/`

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic markup
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: WCAG AA compliant color ratios
- **Responsive Design**: Works at 200% zoom and on all screen sizes

## Performance Optimizations

- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: Optimized chunk naming for browser caching
- **Core Web Vitals**: Automatic monitoring and reporting
- **Resource Hints**: Preloading and prefetching critical resources

## Error Handling

- **Error Boundaries**: Graceful component failure handling
- **API Errors**: Consistent error formatting and user messaging
- **Network Resilience**: Automatic retries with exponential backoff
- **User Feedback**: Clear error messages and recovery options

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Deployment

### Production Build
```bash
npm run build
```

The build creates optimized static files in the `dist/` directory ready for deployment to any static hosting service.

### Environment Configuration

Set environment variables for production:
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_ENVIRONMENT`: Production environment identifier

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure all TypeScript errors are resolved
2. **API Connection**: Verify backend server is running and accessible
3. **Performance Issues**: Check bundle analyzer for large dependencies
4. **Test Failures**: Verify all mocks and setup are properly configured

### Debug Mode

Enable debug logging in development:
```bash
DEBUG=true npm run dev
```

## Contributing

1. Follow the established code style and patterns
2. Write tests for all new features
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Run full test suite before submitting

## License

This project is part of the YT Music Spotify Linker application.