import { Component, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';

const Login: Component = () => {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const navigate = useNavigate();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email(),
          password: password(),
        }),
      });

      if (response.ok) {
        // Store the token in localStorage
        const data = await response.json();
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div class="max-w-md mx-auto card">
      <h2 class="heading-2 text-center mb-8">Login</h2>
      {error() && (
        <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error()}
        </div>
      )}
      <form onSubmit={handleSubmit} class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="input"
            required
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="input"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary w-full">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login; 