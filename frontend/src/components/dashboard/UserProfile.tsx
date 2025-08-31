import { Component, Show } from "solid-js";
import { UserDashboardData } from "../../services/userApi";

interface UserProfileProps {
  dashboardData: UserDashboardData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const UserProfile: Component<UserProfileProps> = (props) => {
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
    <section>
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
                  Loading profile...
                </span>
              </div>
            </Show>
          </div>
        }
      >
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Welcome, {props.dashboardData?.profile.username}!
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
              <h3 class="font-medium text-gray-900 dark:text-gray-50">
                User ID
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {props.dashboardData?.profile.id}
              </p>
            </div>
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
              <h3 class="font-medium text-gray-900 dark:text-gray-50">
                Active Watchers
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {props.dashboardData?.watcher_count || 0}
              </p>
            </div>
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
              <h3 class="font-medium text-gray-900 dark:text-gray-50">
                Connected Services
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {props.dashboardData?.service_connections.filter(
                  (c) => c.is_connected,
                ).length || 0}{" "}
                / 2
              </p>
            </div>
          </div>
        </div>
      </Show>
    </section>
  );
};

export default UserProfile;