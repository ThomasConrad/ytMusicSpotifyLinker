import { Component, Show } from 'solid-js';
import { LoadingSpinner, Button } from '@/components/ui';
import { DashboardData } from '@/types';

export interface UserProfileProps {
  dashboardData: () => DashboardData | null;
  isLoading: () => boolean;
  error: () => string | null;
  onRetry: () => void;
}

export const UserProfile: Component<UserProfileProps> = (props) => {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
        Profile
      </h2>

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
            <div class="space-y-4">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <svg
                    class="w-6 h-6 text-primary-600 dark:text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50">
                    {data().user.username}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    User ID: {data().user.id}
                  </p>
                </div>
              </div>
              
              <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {data().stats.totalWatchers}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      Total Watchers
                    </div>
                  </div>
                  
                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                      {data().stats.activeWatchers}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      Active
                    </div>
                  </div>
                  
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data().stats.totalSyncs}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      Total Syncs
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};