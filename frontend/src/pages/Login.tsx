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
    <div class="max-w-md mx-auto card animate-zoom-in shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h2 class="heading-2 text-center mb-8 animate-fade-in">Login</h2>
      {error() && (
        <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4 animate-shake">
          {error()}
        </div>
      )}
      <form onSubmit={handleSubmit} class="space-y-6">
        <div class="animate-slide-up" style={{"animation-delay": "100ms"}}>
          <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="input focus:animate-shadow-pulse transition-all duration-300 focus:scale-[1.02]"
            required
          />
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
            class="input focus:animate-shadow-pulse transition-all duration-300 focus:scale-[1.02]"
            required
          />
        </div>
        <button 
          type="submit" 
          class="btn btn-primary w-full animate-slide-up transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{"animation-delay": "300ms"}}
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login; 