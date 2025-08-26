import { ParentComponent, createEffect, createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../../contexts/AuthContext';

export interface ProtectedRouteProps {
  children: any;
  redirectTo?: string;
  fallback?: () => any;
  requireAuth?: boolean;
}

/**
 * ProtectedRoute component that guards routes requiring authentication.
 * Features:
 * - Session validity checking via API
 * - Automatic redirects for unauthenticated users  
 * - Loading states during authentication checks
 * - Custom fallback components for unauthenticated state
 * - Session expiration detection and handling
 */
export const ProtectedRoute: ParentComponent<ProtectedRouteProps> = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [hasCheckedAuth, setHasCheckedAuth] = createSignal(false);
  const [sessionExpired, setSessionExpired] = createSignal(false);
  
  const requireAuth = props.requireAuth ?? true;
  const redirectTo = props.redirectTo || '/login';

  // Handle authentication state changes and redirects
  createEffect(() => {
    // Skip if we don't require auth for this route
    if (!requireAuth) {
      setHasCheckedAuth(true);
      return;
    }

    // Wait for initial auth check to complete
    if (auth.isLoading()) return;

    setHasCheckedAuth(true);

    // Check for session expiration
    if (!auth.isAuthenticated() && auth.user() !== null) {
      // User was previously authenticated but now is not - session likely expired
      setSessionExpired(true);
      console.warn('Session expired, redirecting to login');
    }

    // Redirect if not authenticated and no custom fallback
    if (!auth.isAuthenticated() && !props.fallback) {
      const currentPath = window.location.pathname;
      
      // Avoid redirect loops
      if (currentPath !== redirectTo) {
        // Preserve the intended destination for post-login redirect
        if (currentPath !== '/login') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        navigate(redirectTo, { replace: true });
      }
    }
  });

  // Show loading spinner while checking authentication
  if (!hasCheckedAuth() || auth.isLoading()) {
    return (
      <div class="flex items-center justify-center min-h-screen">
        <div class="flex flex-col items-center space-y-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="text-gray-600 dark:text-gray-400 animate-pulse">
            {sessionExpired() ? 'Session expired, redirecting...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // Show custom fallback if provided and not authenticated
  if (!auth.isAuthenticated() && props.fallback) {
    return props.fallback();
  }

  // Show children if authenticated or if auth not required
  return (
    <Show when={!requireAuth || auth.isAuthenticated()} fallback={null}>
      {props.children}
    </Show>
  );
};

/**
 * Higher-order component for protecting entire route components
 */
export const withProtectedRoute = <P extends object>(
  Component: (props: P) => any,
  options?: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * Component for routes that should only be accessible when NOT authenticated
 * (e.g., login, register pages)
 */
export const GuestRoute: ParentComponent<{
  redirectTo?: string;
  fallback?: () => any;
}> = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const redirectTo = props.redirectTo || '/dashboard';

  createEffect(() => {
    // Wait for auth check to complete
    if (auth.isLoading()) return;

    // Redirect if authenticated
    if (auth.isAuthenticated()) {
      // Check for intended destination after login
      const intendedDestination = sessionStorage.getItem('redirectAfterLogin');
      if (intendedDestination) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(intendedDestination, { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    }
  });

  // Show loading while checking auth
  if (auth.isLoading()) {
    return (
      <div class="flex items-center justify-center min-h-screen">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show custom fallback if authenticated and fallback provided
  if (auth.isAuthenticated() && props.fallback) {
    return props.fallback();
  }

  // Show children only if not authenticated
  return (
    <Show when={!auth.isAuthenticated()} fallback={null}>
      {props.children}
    </Show>
  );
};

export default ProtectedRoute;