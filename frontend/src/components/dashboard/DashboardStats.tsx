import { Component, Show } from 'solid-js';
import { LoadingSpinner, Button } from '@/components/ui';
import { DashboardData } from '@/types';

export interface DashboardStatsProps {
  dashboardData: () => DashboardData | null;
  isLoading: () => boolean;
  error: () => string | null;
  onRetry: () => void;
}

export const DashboardStats: Component<DashboardStatsProps> = (props) => {
  const formatLastSync = (lastSyncTime?: string) => {
    if (!lastSyncTime) return 'Never';

    try {
      const date = new Date(lastSyncTime);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">
          Statistics Overview
        </h2>

        <Show when={!props.isLoading() && props.dashboardData()}>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </Show>
      </div>

      <Show
        when={!props.isLoading() && !props.error()}
        fallback={
          <Show
            when={props.error()}
            fallback={
              <div class="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            }
          >
            <div class="text-center py-8">
              <div class="text-red-600 dark:text-red-400 mb-4">
                {props.error()}
              </div>
              <Button variant="secondary" size="sm" onClick={props.onRetry}>
                Retry
              </Button>
            </div>
          </Show>
        }
      >
        <Show when={props.dashboardData()}>
          {(data) => (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Watchers */}
              <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full mx-auto mb-3">
                  <svg
                    class="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <div class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {data().stats.totalWatchers}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Total Watchers
                </div>
              </div>

              {/* Active Watchers */}
              <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full mx-auto mb-3">
                  <svg
                    class="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                </div>
                <div class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {data().stats.activeWatchers}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Active Watchers
                </div>
              </div>

              {/* Total Syncs */}
              <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full mx-auto mb-3">
                  <svg
                    class="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {data().stats.totalSyncs}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Total Syncs
                </div>
              </div>

              {/* Last Sync */}
              <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-800 rounded-full mx-auto mb-3">
                  <svg
                    class="w-6 h-6 text-yellow-600 dark:text-yellow-400"
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
                <div class="text-xs font-medium text-gray-900 dark:text-gray-50 leading-tight">
                  {formatLastSync(data().stats.lastSyncTime)}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last Sync
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};
