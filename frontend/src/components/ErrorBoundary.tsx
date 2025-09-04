import { Component, JSX, createSignal, onMount } from 'solid-js';
import { Button } from './ui';

export interface ErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (error: Error, reset: () => void) => JSX.Element;
  onError?: (error: Error, errorInfo: any) => void;
}

export const ErrorBoundary: Component<ErrorBoundaryProps> = (props) => {
  const [error, setError] = createSignal<Error | null>(null);

  // Reset error state
  const resetError = () => {
    setError(null);
  };

  // Global error handler for uncaught errors
  onMount(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      setError(event.error || new Error(event.message));
      if (props.onError) {
        props.onError(event.error || new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      setError(error);
      if (props.onError) {
        props.onError(error, { type: 'unhandledrejection' });
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  });

  // Default fallback UI
  const defaultFallback = (error: Error, reset: () => void) => (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            class="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
          Something went wrong
        </h1>

        <p class="text-gray-600 dark:text-gray-400 mb-6">
          We encountered an unexpected error. Please try refreshing the page or
          contact support if the problem persists.
        </p>

        <div class="space-y-3">
          <Button variant="primary" onClick={reset} class="w-full">
            Try Again
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            class="w-full"
          >
            Refresh Page
          </Button>
        </div>

        <details class="mt-4 text-left">
          <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Error Details
          </summary>
          <div class="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-32">
            <div class="mb-2">
              <strong>Message:</strong> {error.message}
            </div>
            {error.stack && (
              <div>
                <strong>Stack:</strong>
                <pre class="whitespace-pre-wrap mt-1">{error.stack}</pre>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );

  return (
    <>
      {error()
        ? props.fallback
          ? props.fallback(error()!, resetError)
          : defaultFallback(error()!, resetError)
        : props.children}
    </>
  );
};

// Component-level error boundary for smaller sections
export interface SectionErrorBoundaryProps {
  children: JSX.Element;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onError?: (error: Error) => void;
}

export const SectionErrorBoundary: Component<SectionErrorBoundaryProps> = (
  props
) => {
  const [error, setError] = createSignal<Error | null>(null);

  const resetError = () => {
    setError(null);
    if (props.onRetry) {
      props.onRetry();
    }
  };

  // This would need to be implemented with a proper error boundary in a real SolidJS app
  // For now, we'll create a wrapper that can catch errors in child components
  const tryRender = () => {
    try {
      return props.children;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (props.onError) {
        props.onError(error);
      }
      return null;
    }
  };

  return (
    <>
      {error() ? (
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              class="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
            {props.title || 'Section Error'}
          </h3>

          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {props.description ||
              'This section encountered an error and could not be displayed.'}
          </p>

          <Button variant="secondary" size="sm" onClick={resetError}>
            Try Again
          </Button>
        </div>
      ) : (
        tryRender()
      )}
    </>
  );
};
