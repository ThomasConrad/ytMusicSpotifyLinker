import { Component, Show, For } from "solid-js";
import { WatcherSummary } from "../../services/watcherApi";
import WatcherCard from "../watchers/WatcherCard";

interface WatcherOverviewProps {
  watchers: WatcherSummary[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onStartWatcher: (watcherName: string) => void;
  onStopWatcher: (watcherName: string) => void;
  onEditWatcher?: (watcher: WatcherSummary) => void;
  onPreviewWatcher?: (watcherName: string) => void;
  onCreateWatcher?: () => void;
}

const WatcherOverview: Component<WatcherOverviewProps> = (props) => {
  const LoadingSpinner = () => (
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  );

  const ErrorDisplay = () => (
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg
            class="w-5 h-5 text-red-400 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-red-800 dark:text-red-200">{props.error}</p>
        </div>
        <button
          onClick={props.onRetry}
          class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div class="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
      <svg
        class="w-12 h-12 text-gray-400 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
        No watchers yet
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto">
        Create your first watcher to start syncing playlists between your music services.
      </p>
      <Show when={props.onCreateWatcher}>
        <button
          onClick={props.onCreateWatcher}
          class="btn btn-primary inline-flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Watcher</span>
        </button>
      </Show>
    </div>
  );

  const getActiveCount = () => props.watchers.filter(w => w.is_active).length;
  const getTotalSyncedSongs = () => props.watchers.reduce((total, w) => total + (w.total_songs || 0), 0);
  const getAverageSuccessRate = () => {
    const watchersWithRates = props.watchers.filter(w => w.sync_success_rate !== undefined);
    if (watchersWithRates.length === 0) return 0;
    return watchersWithRates.reduce((sum, w) => sum + (w.sync_success_rate || 0), 0) / watchersWithRates.length;
  };

  const WatcherStats = () => (
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900">
            <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {getActiveCount()} / {props.watchers.length}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Songs</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {getTotalSyncedSongs().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Success</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {Math.round(getAverageSuccessRate())}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="heading-2">Your Watchers</h2>
        <Show when={props.watchers.length > 0 && props.onCreateWatcher}>
          <button
            onClick={props.onCreateWatcher}
            class="btn btn-primary inline-flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Watcher</span>
          </button>
        </Show>
      </div>

      <Show
        when={!props.isLoading}
        fallback={
          <div class="space-y-4">
            <Show when={props.error}>
              <ErrorDisplay />
            </Show>
            <Show when={props.isLoading}>
              <div class="flex items-center justify-center py-8 space-x-2">
                <LoadingSpinner />
                <span class="text-gray-600 dark:text-gray-400">
                  Loading watchers...
                </span>
              </div>
            </Show>
          </div>
        }
      >
        <Show
          when={props.watchers.length > 0}
          fallback={<EmptyState />}
        >
          <WatcherStats />
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <For each={props.watchers}>
              {(watcher) => (
                <WatcherCard
                  watcher={watcher}
                  onStart={props.onStartWatcher}
                  onStop={props.onStopWatcher}
                  onEdit={props.onEditWatcher}
                  onPreview={props.onPreviewWatcher}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
};

export default WatcherOverview;