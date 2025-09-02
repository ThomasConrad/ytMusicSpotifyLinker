import { Component } from 'solid-js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

const Dashboard: Component = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div class="max-w-6xl mx-auto py-8 space-y-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Dashboard
        </h1>
        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Welcome back, {user()?.username}!
        </h2>
        <p class="text-gray-600 dark:text-gray-300">
          Your dashboard is being built. Soon you'll be able to manage your playlist synchronizations here.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
            Service Connections
          </h3>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            Connect your YouTube Music and Spotify accounts
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
            Watchers
          </h3>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            Manage your playlist synchronization rules
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
            Sync History
          </h3>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            View your recent synchronization activity
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;