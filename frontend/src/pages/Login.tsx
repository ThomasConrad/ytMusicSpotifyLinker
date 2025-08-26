import { Component, createSignal, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';

const Login: Component = () => {
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string>>({});
  const navigate = useNavigate();
  const auth = useAuth();

  // Redirect if already authenticated
  createEffect(() => {
    if (auth.isAuthenticated() && !auth.isLoading()) {
      navigate('/dashboard', { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!username().trim()) {
      setFieldErrors({ username: 'Username is required' });
      return;
    }

    if (!password()) {
      setFieldErrors({ password: 'Password is required' });
      return;
    }

    try {
      const result = await auth.login({
        username: username().trim(),
        password: password(),
      });

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        // Handle different error types
        if (result.field_errors) {
          setFieldErrors(result.field_errors);
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div class="max-w-md mx-auto card animate-zoom-in shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h2 class="heading-2 text-center mb-8 animate-fade-in">Login</h2>
      
      {/* General error message */}
      {error() && (
        <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4 animate-shake">
          {error()}
        </div>
      )}
      
      <form onSubmit={handleSubmit} class="space-y-6">
        <div class="animate-slide-up" style={{"animation-delay": "100ms"}}>
          <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            class={`input focus:animate-shadow-pulse transition-all duration-300 focus:scale-[1.02] ${
              fieldErrors().username ? 'border-red-500 focus:border-red-500' : ''
            }`}
            disabled={auth.isLoading()}
            required
          />
          {fieldErrors().username && (
            <p class="text-red-600 text-sm mt-1 animate-shake">{fieldErrors().username}</p>
          )}
        </div>
        
        <div class="animate-slide-up" style={{"animation-delay": "200ms"}}>
          <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class={`input focus:animate-shadow-pulse transition-all duration-300 focus:scale-[1.02] ${
              fieldErrors().password ? 'border-red-500 focus:border-red-500' : ''
            }`}
            disabled={auth.isLoading()}
            required
          />
          {fieldErrors().password && (
            <p class="text-red-600 text-sm mt-1 animate-shake">{fieldErrors().password}</p>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={auth.isLoading()}
          class={`btn btn-primary w-full animate-slide-up transition-all duration-300 hover:scale-105 hover:shadow-lg ${
            auth.isLoading() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{"animation-delay": "300ms"}}
        >
          {auth.isLoading() ? (
            <div class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </div>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </div>
  );
};

export default Login; 