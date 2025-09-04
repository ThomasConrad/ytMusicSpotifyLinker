import { Component, createSignal, Show } from 'solid-js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ServiceConnections } from '@/components/dashboard/ServiceConnections';
import { SyncHistory } from '@/components/dashboard/SyncHistory';
import { UserProfile } from '@/components/dashboard/UserProfile';
import { WatcherOverview } from '@/components/dashboard/WatcherOverview';

const Dashboard: Component = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = createSignal('overview');

  const handleLogout = async () => {
    await logout();
  };

  // Mock data - these would come from API calls in a real implementation
  const [dashboardData] = createSignal({
    user: { id: 1, username: user()?.username || 'User' },
    stats: {
      totalWatchers: 3,
      activeWatchers: 2,
      totalSyncs: 45,
      lastSyncTime: new Date().toISOString(),
    },
  });
  const [serviceConnections] = createSignal([
    {
      service: 'youtube_music' as const,
      connected: false,
      username: null,
      connectedAt: null,
      lastRefresh: null,
    },
    {
      service: 'spotify' as const,
      connected: false,
      username: null,
      connectedAt: null,
      lastRefresh: null,
    },
  ]);
  const [watchers] = createSignal([]);
  const [isLoading] = createSignal(false);
  const [error] = createSignal(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'watchers', label: 'Watchers', icon: '👁' },
    { id: 'history', label: 'History', icon: '📝' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const handleRetry = () => {
    // Refresh data
  };

  const handleDisconnect = (service: string) => {
    console.log('Disconnect:', service);
  };

  const handleStartWatcher = (watcherName: string) => {
    console.log('Start watcher:', watcherName);
  };

  const handleStopWatcher = (watcherName: string) => {
    console.log('Stop watcher:', watcherName);
  };

  const handleEditWatcher = (watcher: any) => {
    console.log('Edit watcher:', watcher);
  };

  const handlePreviewWatcher = (watcherName: string) => {
    console.log('Preview watcher:', watcherName);
  };

  const handleCreateWatcher = () => {
    console.log('Create watcher');
  };

  return (
    <div class="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Dashboard
        </h1>
        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Welcome Section */}
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
          Welcome back, {user()?.username}!
        </h2>
        <p class="text-gray-600 dark:text-gray-300">
          Manage your playlist synchronizations between YouTube Music and
          Spotify.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div class="mb-8">
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                onClick={() => setActiveTab(tab.id)}
                class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab() === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span class="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div class="space-y-8">
        <Show when={activeTab() === 'overview'}>
          <DashboardStats
            dashboardData={dashboardData}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        </Show>

        <Show when={activeTab() === 'connections'}>
          <ServiceConnections
            serviceConnections={serviceConnections}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            onDisconnect={handleDisconnect}
          />
        </Show>

        <Show when={activeTab() === 'watchers'}>
          <WatcherOverview
            watchers={watchers}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            onStartWatcher={handleStartWatcher}
            onStopWatcher={handleStopWatcher}
            onEditWatcher={handleEditWatcher}
            onPreviewWatcher={handlePreviewWatcher}
            onCreateWatcher={handleCreateWatcher}
          />
        </Show>

        <Show when={activeTab() === 'history'}>
          <SyncHistory />
        </Show>

        <Show when={activeTab() === 'profile'}>
          <UserProfile
            dashboardData={dashboardData}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        </Show>
      </div>
    </div>
  );
};

export default Dashboard;
