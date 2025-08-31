import { Component, Show, For, createSignal } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import { useUser } from "../contexts/UserContext";
import { CreateWatcherRequest, WatcherSummary } from "../services/watcherApi";
import UserProfile from "../components/dashboard/UserProfile";
import ServiceConnections from "../components/dashboard/ServiceConnections";
import DashboardStats from "../components/dashboard/DashboardStats";
import WatcherOverview from "../components/dashboard/WatcherOverview";
import WatcherModal from "../components/watchers/WatcherModal";
import SyncHistory from "../components/dashboard/SyncHistory";
import SyncPreview from "../components/watchers/SyncPreview";

const Dashboard: Component = () => {
  const { logout } = useAuth();
  const {
    dashboardData,
    isLoadingDashboard,
    dashboardError,
    watchers,
    isLoadingWatchers,
    watchersError,
    serviceConnections,
    isLoadingConnections,
    connectionsError,
    retryDashboard,
    retryWatchers,
    retryConnections,
    refreshAll,
    disconnectService,
    startWatcher,
    stopWatcher,
    createWatcher,
  } = useUser();

  const [isRefreshing, setIsRefreshing] = createSignal(false);
  
  // Watcher modal state
  const [isWatcherModalOpen, setIsWatcherModalOpen] = createSignal(false);
  const [editingWatcher, setEditingWatcher] = createSignal<WatcherSummary | undefined>(undefined);
  const [isCreatingWatcher, setIsCreatingWatcher] = createSignal(false);
  const [watcherError, setWatcherError] = createSignal<string | null>(null);
  const [watcherFieldErrors, setWatcherFieldErrors] = createSignal<Record<string, string>>({});

  // Sync preview modal state
  const [isSyncPreviewOpen, setIsSyncPreviewOpen] = createSignal(false);
  const [previewWatcherName, setPreviewWatcherName] = createSignal<string>("");

  const handleLogout = async () => {
    await logout();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnectService = async (
    service: "youtube_music" | "spotify",
  ) => {
    const result = await disconnectService(service);
    if (!result.success) {
      alert(`Failed to disconnect from ${service}: ${result.error}`);
    }
  };

  const handleStartWatcher = async (watcherName: string) => {
    const result = await startWatcher(watcherName);
    if (result.success) {
      // Success is handled by the context refreshing data
    } else {
      alert(`Failed to start watcher: ${result.error}`);
    }
  };

  const handleStopWatcher = async (watcherName: string) => {
    const result = await stopWatcher(watcherName);
    if (result.success) {
      // Success is handled by the context refreshing data
    } else {
      alert(`Failed to stop watcher: ${result.error}`);
    }
  };

  // Watcher modal handlers
  const handleCreateWatcher = () => {
    setEditingWatcher(undefined);
    setWatcherError(null);
    setWatcherFieldErrors({});
    setIsWatcherModalOpen(true);
  };

  const handleEditWatcher = (watcher: WatcherSummary) => {
    setEditingWatcher(watcher);
    setWatcherError(null);
    setWatcherFieldErrors({});
    setIsWatcherModalOpen(true);
  };

  const handleCloseWatcherModal = () => {
    if (isCreatingWatcher()) return; // Prevent closing while creating
    setIsWatcherModalOpen(false);
    setEditingWatcher(undefined);
    setWatcherError(null);
    setWatcherFieldErrors({});
  };

  const handleSubmitWatcher = async (request: CreateWatcherRequest) => {
    setIsCreatingWatcher(true);
    setWatcherError(null);
    setWatcherFieldErrors({});

    try {
      const result = await createWatcher(request);
      
      if (result.success) {
        setIsWatcherModalOpen(false);
        setEditingWatcher(undefined);
        // Success is handled by the context refreshing data
      } else {
        if (result.field_errors) {
          setWatcherFieldErrors(result.field_errors);
        } else {
          setWatcherError(result.error || "Failed to create watcher");
        }
      }
    } catch (error) {
      setWatcherError("An unexpected error occurred");
    } finally {
      setIsCreatingWatcher(false);
    }
  };

  // Sync preview handlers
  const handlePreviewWatcher = (watcherName: string) => {
    setPreviewWatcherName(watcherName);
    setIsSyncPreviewOpen(true);
  };

  const handleCloseSyncPreview = () => {
    setIsSyncPreviewOpen(false);
    setPreviewWatcherName("");
  };

  const handleExecuteSync = async (watcherName: string) => {
    // Use the existing startWatcher functionality for now
    // In a full implementation, this might trigger a different API call
    await handleStartWatcher(watcherName);
  };

  // Loading spinner component for overall loading
  const LoadingSpinner = () => (
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  );

  // Overall loading state (only show if all are loading initially)
  const isOverallLoading = () =>
    isLoadingDashboard() && isLoadingWatchers() && isLoadingConnections() && 
    !dashboardData() && !serviceConnections() && watchers().length === 0;

  if (isOverallLoading()) {
    return (
      <div class="flex flex-col justify-center items-center min-h-[400px] space-y-4">
        <LoadingSpinner />
        <p class="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div class="card">
      <div class="flex justify-between items-center mb-8">
        <h1 class="heading-1">Dashboard</h1>
        <div class="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing()}
            class="btn btn-secondary flex items-center space-x-2"
          >
            <Show when={isRefreshing()}>
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            </Show>
            <span>Refresh</span>
          </button>
          <button onClick={handleLogout} class="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div class="space-y-8">
        {/* User Profile Section */}
        <UserProfile
          dashboardData={dashboardData()}
          isLoading={isLoadingDashboard()}
          error={dashboardError()}
          onRetry={retryDashboard}
        />

        {/* Dashboard Stats Section */}
        <section>
          <h2 class="heading-2 mb-4">Statistics</h2>
          <DashboardStats
            dashboardData={dashboardData()}
            isLoading={isLoadingDashboard()}
            error={dashboardError()}
            onRetry={retryDashboard}
          />
        </section>

        {/* Service Connections Section */}
        <ServiceConnections
          serviceConnections={serviceConnections()}
          isLoading={isLoadingConnections()}
          error={connectionsError()}
          onRetry={retryConnections}
          onDisconnect={handleDisconnectService}
        />

        {/* Watchers Section */}
        <WatcherOverview
          watchers={watchers()}
          isLoading={isLoadingWatchers()}
          error={watchersError()}
          onRetry={retryWatchers}
          onStartWatcher={handleStartWatcher}
          onStopWatcher={handleStopWatcher}
          onEditWatcher={handleEditWatcher}
          onPreviewWatcher={handlePreviewWatcher}
          onCreateWatcher={handleCreateWatcher}
        />

        {/* Recent Activity Section */}
        <Show when={watchers().length > 0 && watchers()[0]?.id}>
          <SyncHistory
            watcherId={watchers()[0].id}
            limit={5}
            showWatcherNames={false}
          />
        </Show>
      </div>
      
      {/* Watcher Modal */}
      <WatcherModal
        isOpen={isWatcherModalOpen()}
        watcher={editingWatcher()}
        isLoading={isCreatingWatcher()}
        error={watcherError()}
        fieldErrors={watcherFieldErrors()}
        onSubmit={handleSubmitWatcher}
        onClose={handleCloseWatcherModal}
      />
      
      {/* Sync Preview Modal */}
      <SyncPreview
        isOpen={isSyncPreviewOpen()}
        watcherName={previewWatcherName()}
        onClose={handleCloseSyncPreview}
        onExecuteSync={handleExecuteSync}
      />
    </div>
  );
};

export default Dashboard;
