import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { LoadingSpinner, Button } from '@/components/ui';
import { SyncActivity } from '@/types';
import { userApi } from '@/services/userApi';
import { useUser } from '@/contexts/UserContext';

export interface SyncHistoryProps {
  class?: string;
}

export const SyncHistory: Component<SyncHistoryProps> = (props) => {
  // Local state for sync history
  const [syncHistory, setSyncHistory] = createSignal<SyncActivity[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Filter and pagination state
  const [selectedWatcher, setSelectedWatcher] = createSignal<number | null>(
    null
  );
  const [selectedService, setSelectedService] = createSignal<string | null>(
    null
  );
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Get watchers from UserContext for filtering
  const { watchers } = useUser();

  // Load sync history
  const loadSyncHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await userApi.getSyncHistory(
        limit() * currentPage(),
        selectedWatcher() || undefined
      );

      if (result.success) {
        setSyncHistory(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load sync history');
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when filters change
  createEffect(() => {
    loadSyncHistory();
  });

  const handleRetry = () => {
    loadSyncHistory();
  };

  const handleWatcherFilter = (watcherId: number | null) => {
    setSelectedWatcher(watcherId);
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const handleServiceFilter = (service: string | null) => {
    setSelectedService(service);
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'youtube_music':
        return (
          <svg class="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        );
      case 'spotify':
        return (
          <svg class="w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.746 3.808-.871 7.077-.496 9.712 1.115.295.18.387.563.207.857zm1.223-2.723c-.226.367-.706.482-1.073.256-2.687-1.652-6.785-2.131-9.965-1.166-.405.123-.834-.082-.957-.487-.123-.405.082-.834.487-.957 3.632-1.102 8.147-.568 11.252 1.327.367.226.482.706.256 1.073z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'youtube_music':
        return 'YouTube Music';
      case 'spotify':
        return 'Spotify';
      default:
        return service;
    }
  };

  // Filter sync history based on selected filters
  const filteredSyncHistory = () => {
    let filtered = syncHistory();
    
    if (selectedService()) {
      filtered = filtered.filter(activity => {
        // Assuming activity has source/target service info
        return activity.sourceService === selectedService() || 
               activity.targetService === selectedService();
      });
    }
    
    return filtered;
  };

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const getStatusColor = (status: 'success' | 'error' | 'partial') => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'partial':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status: 'success' | 'error' | 'partial') => {
    switch (status) {
      case 'success':
        return (
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case 'partial':
        return (
          <svg
            class="w-4 h-4"
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
        );
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown time';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return 'Less than an hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString();
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <section
      class={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${props.class || ''}`}
      aria-label="Sync History"
    >
      <div class="flex justify-between items-center mb-6">
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-50"
          id="sync-history-heading"
        >
          Sync History
        </h2>

        <div class="flex space-x-2 items-center">
          {/* Service filter dropdown */}
          <label class="sr-only" for="service-filter">
            Filter by service
          </label>
          <select
            id="service-filter"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={selectedService() || ''}
            onChange={(e) => {
              const value = e.currentTarget.value;
              handleServiceFilter(value || null);
            }}
            aria-label="Filter sync history by service"
          >
            <option value="">All services</option>
            <option value="youtube_music">YouTube Music</option>
            <option value="spotify">Spotify</option>
          </select>

          {/* Watcher filter dropdown */}
          <Show when={watchers().length > 0}>
            <label class="sr-only" for="watcher-filter">
              Filter by watcher
            </label>
            <select
              id="watcher-filter"
              class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={selectedWatcher() || ''}
              onChange={(e) => {
                const value = e.currentTarget.value;
                handleWatcherFilter(value ? parseInt(value, 10) : null);
              }}
              aria-label="Filter sync history by watcher"
            >
              <option value="">All watchers</option>
              <For each={watchers()}>
                {(watcher) => (
                  <option value={watcher.id}>{watcher.name}</option>
                )}
              </For>
            </select>
          </Show>

          <Show when={!isLoading() && !error()}>
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              Refresh
            </Button>
          </Show>
        </div>
      </div>

      <Show
        when={!isLoading() && !error()}
        fallback={
          <Show
            when={error()}
            fallback={
              <div class="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            }
          >
            <div class="text-center py-8">
              <div class="text-red-600 dark:text-red-400 mb-4">{error()}</div>
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </Show>
        }
      >
        <Show
          when={filteredSyncHistory().length > 0}
          fallback={
            <div class="text-center py-12">
              <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  class="w-8 h-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
                No sync history
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                Sync activities will appear here once you start running
                watchers.
              </p>
            </div>
          }
        >
          <div class="space-y-4">
            <For each={filteredSyncHistory()}>
              {(activity) => (
                <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50">
                          {activity.watcherName}
                        </h3>

                        <div
                          class={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}
                        >
                          {getStatusIcon(activity.status)}
                          <span class="capitalize">{activity.status}</span>
                        </div>
                      </div>

                      {/* Service flow indicator */}
                      <Show when={activity.sourceService && activity.targetService}>
                        <div class="flex items-center space-x-2 mb-2">
                          <div class="flex items-center space-x-1">
                            {getServiceIcon(activity.sourceService)}
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              {getServiceName(activity.sourceService)}
                            </span>
                          </div>
                          <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <div class="flex items-center space-x-1">
                            {getServiceIcon(activity.targetService)}
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              {getServiceName(activity.targetService)}
                            </span>
                          </div>
                        </div>
                      </Show>

                      <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span title={formatTimestamp(activity.timestamp)}>
                          {getRelativeTime(activity.timestamp)}
                        </span>

                        <Show when={activity.status !== 'error'}>
                          <div class="flex items-center space-x-3">
                            <span class="flex items-center space-x-1">
                              <svg
                                class="w-4 h-4 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                              <span>{activity.songsAdded} added</span>
                            </span>

                            <Show when={activity.songsSkipped > 0}>
                              <span class="flex items-center space-x-1">
                                <svg
                                  class="w-4 h-4 text-yellow-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>{activity.songsSkipped} skipped</span>
                              </span>
                            </Show>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>

                  <Show when={activity.error}>
                    <div class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                      <div class="flex items-start space-x-2">
                        <svg
                          class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
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
                        <div>
                          <h4 class="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Sync Error
                          </h4>
                          <p class="text-sm text-red-700 dark:text-red-300">
                            {activity.error}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Show>
                </div>
              )}
            </For>

            {/* Load more button if there might be more data */}
            <Show when={filteredSyncHistory().length >= limit()}>
              <div class="text-center pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadMore}
                  loading={isLoading()}
                >
                  Load More
                </Button>
              </div>
            </Show>
          </div>
        </Show>
      </Show>
    </section>
  );
};
