import { Component, Show, createEffect } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { useAuth } from '@/contexts/AuthContext';

export interface ProtectedRouteProps {
  children: any;
  redirectTo?: string;
}

export const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
  const { isAuthenticated, isLoading, hasInitiallyChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  createEffect(() => {
    // Wait for initial auth check to complete
    if (!hasInitiallyChecked()) return;

    // If not authenticated after check is complete, redirect to login
    if (!isAuthenticated() && !isLoading()) {
      const redirectTo = props.redirectTo || '/login';
      const returnTo =
        location.pathname !== '/' ? location.pathname : undefined;

      if (returnTo) {
        navigate(`${redirectTo}?returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        navigate(redirectTo);
      }
    }
  });

  return (
    <Show
      when={hasInitiallyChecked() && isAuthenticated()}
      fallback={
        <Show when={!isLoading()}>
          <div
            class="flex items-center justify-center min-h-screen"
            role="main"
            aria-live="polite"
          >
            <div class="text-center">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"
                role="status"
                aria-label="Checking authentication"
              ></div>
              <p class="mt-4 text-gray-600 dark:text-gray-400">
                Verifying your session...
              </p>
            </div>
          </div>
        </Show>
      }
    >
      <main role="main">{props.children}</main>
    </Show>
  );
};

// Guest route component (opposite of protected route)
export interface GuestRouteProps {
  children: any;
  redirectTo?: string;
}

export const GuestRoute: Component<GuestRouteProps> = (props) => {
  const { isAuthenticated, hasInitiallyChecked } = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    // Wait for initial auth check to complete
    if (!hasInitiallyChecked()) return;

    // If authenticated, redirect to dashboard or specified route
    if (isAuthenticated()) {
      const redirectTo = props.redirectTo || '/dashboard';
      navigate(redirectTo);
    }
  });

  return (
    <Show
      when={hasInitiallyChecked() && !isAuthenticated()}
      fallback={
        <div
          class="flex items-center justify-center min-h-screen"
          role="main"
          aria-live="polite"
        >
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"
              role="status"
              aria-label="Loading"
            ></div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <main role="main">{props.children}</main>
    </Show>
  );
};
