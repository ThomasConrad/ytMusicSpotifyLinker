import { Component, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';

const Dashboard: Component = () => {
  const [userData, setUserData] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading()) {
    return (
      <div class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div class="card">
      <div class="flex justify-between items-center mb-8">
        <h1 class="heading-1">Dashboard</h1>
        <button onClick={handleLogout} class="btn btn-secondary">
          Logout
        </button>
      </div>
      
      {userData() && (
        <div class="space-y-4">
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-50">Welcome, {userData().name}!</h2>
            <p class="text-gray-600 dark:text-gray-200">Email: {userData().email}</p>
          </div>
          
          {/* Add your dashboard content here */}
          <div class="mt-8">
            <h2 class="heading-2 mb-4">Your Playlists</h2>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Playlist cards will go here */}
              <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-200">No playlists yet</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 