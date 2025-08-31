import { Component, Show } from "solid-js";
import { UserDashboardData } from "../../services/userApi";

interface DashboardStatsProps {
  dashboardData: UserDashboardData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const DashboardStats: Component<DashboardStatsProps> = (props) => {
  const LoadingSpinner = () => (
    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
          class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
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

  return (
    <Show
      when={!props.isLoading && props.dashboardData}
      fallback={
        <div class="space-y-4">
          <Show when={props.error}>
            <ErrorDisplay />
          </Show>
          <Show when={props.isLoading}>
            <div class="flex items-center space-x-2">
              <LoadingSpinner />
              <span class="text-gray-600 dark:text-gray-400">
                Loading statistics...
              </span>
            </div>
          </Show>
        </div>
      }
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-center">
            <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <svg
                class="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                User ID
              </h3>
              <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {props.dashboardData?.profile.id}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-center">
            <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <svg
                class="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Watchers
              </h3>
              <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {props.dashboardData?.watcher_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex items-center">
            <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <svg
                class="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Connected Services
              </h3>
              <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {props.dashboardData?.service_connections.filter(
                  (c) => c.is_connected,
                ).length || 0}{" "}
                / 2
              </p>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default DashboardStats;