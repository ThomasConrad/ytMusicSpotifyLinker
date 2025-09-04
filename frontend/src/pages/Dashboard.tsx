import { Component, createSignal, Show } from 'solid-js';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ServiceConnections } from '@/components/dashboard/ServiceConnections';
import { SyncHistory } from '@/components/dashboard/SyncHistory';
import { UserProfile } from '@/components/dashboard/UserProfile';
import { WatcherOverview } from '@/components/dashboard/WatcherOverview';

const Dashboard: Component = () => {
  const { user, logout } = useAuth();
  const userContext = useUser();
  const [activeTab, setActiveTab] = createSignal('overview');

  const handleLogout = async () => {
    await logout();
  };

  // Enhanced dashboard data with Spotify integration
  const getDashboardData = () => {
    const spotifyStatus = userContext.spotifyConnectionStatus();
    return {
      user: { id: 1, username: user()?.username || 'User' },
      stats: {
        totalWatchers: userContext.watchers().length,
        activeWatchers: userContext.watchers().filter(w => w.status === 'running').length,
        totalSyncs: userContext.watchers().reduce((acc, w) => acc + (w.lastSyncTime ? 1 : 0), 0),
        lastSyncTime: userContext.watchers()
          .filter(w => w.lastSyncTime)
          .sort((a, b) => new Date(b.lastSyncTime!).getTime() - new Date(a.lastSyncTime!).getTime())[0]?.lastSyncTime,
        spotifyConnected: spotifyStatus.connected,
        spotifyPlaylistCount: userContext.spotifyPlaylists().length,
        spotifyPremium: spotifyStatus.premium,
      },
    };
  };

  // Enhanced service connections including Spotify status
  const getServiceConnections = () => {
    const spotifyStatus = userContext.spotifyConnectionStatus();
    const connections = [...userContext.serviceConnections()];
    
    // Always include Spotify connection status
    const existingSpotify = connections.find(conn => conn.service === 'spotify');
    if (!existingSpotify) {
      connections.push({
        service: 'spotify',
        connected: spotifyStatus.connected,
        username: spotifyStatus.username || spotifyStatus.display_name,
        connectedAt: spotifyStatus.connected ? new Date().toISOString() : null,
        lastRefresh: spotifyStatus.connected ? new Date().toISOString() : null,
      });
    }
    
    return connections;
  };

  const getTabLabel = (tabId: string, baseLabel: string) => {
    if (tabId === 'connections') {
      const connections = getServiceConnections();
      const connectedCount = connections.filter(c => c.connected).length;
      return `${baseLabel} (${connectedCount}/${connections.length})`;
    }
    if (tabId === 'watchers') {
      const watcherCount = userContext.watchers().length;
      return `${baseLabel} (${watcherCount})`;
    }
    return baseLabel;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'watchers', label: 'Watchers', icon: '👁' },
    { id: 'history', label: 'History', icon: '📝' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const handleRetry = () => {
    userContext.refreshAll();
  };

  const handleDisconnect = async (service: 'youtube_music' | 'spotify') => {
    await userContext.disconnectService(service);
  };

  const handleStartWatcher = async (watcherName: string) => {
    await userContext.startWatcher(watcherName);
  };

  const handleStopWatcher = async (watcherName: string) => {
    await userContext.stopWatcher(watcherName);
  };

  const handleEditWatcher = (watcher: any) => {
    console.log('Edit watcher:', watcher);
    // TODO: Open watcher edit modal
  };

  const handlePreviewWatcher = (watcherName: string) => {
    console.log('Preview watcher:', watcherName);
    // TODO: Open sync preview modal
  };

  const handleCreateWatcher = () => {
    console.log('Create watcher');
    // TODO: Open watcher creation modal
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
        <div class="flex items-center justify-between">
          <p class="text-gray-600 dark:text-gray-300">
            Manage your playlist synchronizations between YouTube Music and Spotify.
          </p>
          <Show when={userContext.spotifyConnectionStatus().connected}>
            <div class="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.746 3.808-.871 7.077-.496 9.712 1.115.295.18.387.563.207.857zm1.223-2.723c-.226.367-.706.482-1.073.256-2.687-1.652-6.785-2.131-9.965-1.166-.405.123-.834-.082-.957-.487-.123-.405.082-.834.487-.957 3.632-1.102 8.147-.568 11.252 1.327.367.226.482.706.256 1.073z" />
              </svg>
              <span class="text-sm font-medium">Spotify Connected</span>
            </div>
          </Show>
        </div>
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
                  <span>{getTabLabel(tab.id, tab.label)}</span>
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
            dashboardData={getDashboardData}
            isLoading={userContext.isLoadingDashboard}
            error={userContext.dashboardError}
            onRetry={handleRetry}
          />
        </Show>

        <Show when={activeTab() === 'connections'}>
          <ServiceConnections
            serviceConnections={getServiceConnections}
            isLoading={userContext.isLoadingConnections}
            error={userContext.connectionsError}
            onRetry={handleRetry}
            onDisconnect={handleDisconnect}
          />
        </Show>

        <Show when={activeTab() === 'watchers'}>
          <WatcherOverview
            watchers={userContext.watchers}
            isLoading={userContext.isLoadingWatchers}
            error={userContext.watchersError}
            onRetry={userContext.retryWatchers}
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
            dashboardData={getDashboardData}
            isLoading={userContext.isLoadingDashboard}
            error={userContext.dashboardError}
            onRetry={handleRetry}
          />
        </Show>
      </div>
    </div>
  );
};

export default Dashboard;
