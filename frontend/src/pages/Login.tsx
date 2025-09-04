import { Component, createSignal, Show } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { LoginRequest, RegisterRequest } from '@/types';

const Login: Component = () => {
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isRegisterMode, setIsRegisterMode] = createSignal(false);
  const [formData, setFormData] = createSignal({ username: '', password: '' });
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [generalError, setGeneralError] = createSignal<string | null>(null);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors()[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const data = formData();

    if (!data.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!data.password) {
      newErrors.password = 'Password is required';
    } else if (data.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm()) return;

    setGeneralError(null);
    const data = formData();

    try {
      let result;
      if (isRegisterMode()) {
        const registerData: RegisterRequest = {
          username: data.username,
          password: data.password,
        };
        result = await register(registerData);
      } else {
        const loginData: LoginRequest = {
          username: data.username,
          password: data.password,
        };
        result = await login(loginData);
      }

      if (result.success) {
        // Redirect to return URL or dashboard
        const returnTo = searchParams.returnTo || '/dashboard';
        navigate(returnTo);
      } else {
        if (result.field_errors) {
          setErrors(result.field_errors);
        } else {
          setGeneralError(result.error || 'Authentication failed');
        }
      }
    } catch (error) {
      setGeneralError('An unexpected error occurred');
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode());
    setErrors({});
    setGeneralError(null);
    setFormData({ username: '', password: '' });
  };

  return (
    <div class="max-w-md mx-auto mt-8">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-center text-gray-900 dark:text-gray-50 mb-6">
          {isRegisterMode() ? 'Create Account' : 'Sign In'}
        </h1>

        <Show when={generalError()}>
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {generalError()}
          </div>
        </Show>

        <form onSubmit={handleSubmit} class="space-y-4">
          <Input
            type="text"
            label="Username"
            value={formData().username}
            onInput={(e) =>
              handleInputChange('username', e.currentTarget.value)
            }
            error={errors().username}
            disabled={isLoading()}
            required
          />

          <Input
            type="password"
            label="Password"
            value={formData().password}
            onInput={(e) =>
              handleInputChange('password', e.currentTarget.value)
            }
            error={errors().password}
            disabled={isLoading()}
            required
          />

          <Button
            type="submit"
            variant="primary"
            class="w-full"
            loading={isLoading()}
            disabled={isLoading()}
          >
            {isRegisterMode() ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div class="mt-6 text-center">
          <button
            type="button"
            onClick={toggleMode}
            class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
            disabled={isLoading()}
          >
            {isRegisterMode()
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
