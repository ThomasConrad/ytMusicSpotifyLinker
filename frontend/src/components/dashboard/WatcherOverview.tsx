import { Component, Show, For, createSignal } from 'solid-js';
import { LoadingSpinner, Button } from '@/components/ui';
import { WatcherSummary } from '@/types';

export interface WatcherOverviewProps {
  watchers: () => WatcherSummary[];
  isLoading: () => boolean;
  error: () => string | null;
  onRetry: () => void;
  onStartWatcher: (watcherName: string) => void;
  onStopWatcher: (watcherName: string) => void;
  onEditWatcher: (watcher: WatcherSummary) => void;
  onPreviewWatcher: (watcherName: string) => void;
  onCreateWatcher: () => void;
}

export const WatcherOverview: Component<WatcherOverviewProps> = (props) => {
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);

  const handleWatcherAction = async (
    action: () => void,
    watcherName: string
  ) => {
    setActionLoading(watcherName);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'idle':
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
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
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m2-7V8a3 3 0 00-3-3H9a3 3 0 00-3 3v1m2.172 10.172a4 4 0 010-5.656m0 5.656a4 4 0 010-5.656m4.828 0a4 4 0 010 5.656m0-5.656a4 4 0 010 5.656"
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'idle':
      default:
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
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'youtube_music':
        return (
          <svg
            class="w-5 h-5 text-red-600 dark:text-red-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        );
      case 'spotify':
        return (
          <svg
            class="w-5 h-5 text-green-600 dark:text-green-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.746 3.808-.871 7.077-.496 9.712 1.115.295.18.387.563.207.857zm1.223-2.723c-.226.367-.706.482-1.073.256-2.687-1.652-6.785-2.131-9.965-1.166-.405.123-.834-.082-.957-.487-.123-.405.082-.834.487-.957 3.632-1.102 8.147-.568 11.252 1.327.367.226.482.706.256 1.073zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.485.148-.997-.126-1.145-.611-.148-.485.126-.997.611-1.145 3.532-1.073 9.404-.866 13.115 1.338.445.264.591.837.327 1.282-.264.445-.837.591-1.282.327z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatLastSync = (lastSyncTime?: string) => {
    if (!lastSyncTime) return 'Never';
    try {
      const date = new Date(lastSyncTime);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return 'Less than an hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <section
      class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
      aria-label="Watchers Management"
    >
      <div class="flex justify-between items-center mb-6">
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-50"
          id="watchers-heading"
        >
          Watchers
        </h2>

        <div class="flex space-x-2">
          <Show when={!props.isLoading() && !props.error()}>
            <Button variant="secondary" size="sm" onClick={props.onRetry}>
              Refresh
            </Button>
          </Show>
          <Button variant="primary" size="sm" onClick={props.onCreateWatcher}>
            Create Watcher
          </Button>
        </div>
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
        <Show
          when={props.watchers().length > 0}
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
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
                No watchers yet
              </h3>
              <p class="text-gray-500 dark:text-gray-400 mb-4">
                Create your first watcher to start syncing playlists between
                your music services.
              </p>
              <Button variant="primary" onClick={props.onCreateWatcher}>
                Create Your First Watcher
              </Button>
            </div>
          }
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={props.watchers()}>
              {(watcher) => (
                <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  {/* Header with name and status */}
                  <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 truncate pr-2">
                      {watcher.name}
                    </h3>

                    <div
                      class={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(watcher.status)}`}
                    >
                      {getStatusIcon(watcher.status)}
                      <span class="capitalize">{watcher.status}</span>
                    </div>
                  </div>

                  {/* Service flow */}
                  <div class="flex items-center justify-center mb-4 space-x-2">
                    <div class="flex items-center space-x-1">
                      {getServiceIcon(watcher.sourceService)}
                      <span class="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {watcher.sourceService === 'youtube_music' ? 'YouTube Music' : 'Spotify'}
                      </span>
                    </div>

                    <svg
                      class="w-4 h-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>

                    <div class="flex items-center space-x-1">
                      {getServiceIcon(watcher.targetService)}
                      <span class="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {watcher.targetService === 'youtube_music' ? 'YouTube Music' : 'Spotify'}
                      </span>
                    </div>
                  </div>

                  {/* Playlist info */}
                  <div class="mb-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Playlist:{' '}
                      <span class="font-medium">{watcher.playlistName}</span>
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">
                      Last sync: {formatLastSync(watcher.lastSyncTime)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div class="flex space-x-2">
                    <Show
                      when={watcher.status === 'running'}
                      fallback={
                        <Button
                          variant="primary"
                          size="sm"
                          class="flex-1"
                          loading={actionLoading() === watcher.name}
                          onClick={() =>
                            handleWatcherAction(
                              () => props.onStartWatcher(watcher.name),
                              watcher.name
                            )
                          }
                        >
                          Start
                        </Button>
                      }
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        class="flex-1"
                        loading={actionLoading() === watcher.name}
                        onClick={() =>
                          handleWatcherAction(
                            () => props.onStopWatcher(watcher.name),
                            watcher.name
                          )
                        }
                      >
                        Stop
                      </Button>
                    </Show>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onPreviewWatcher(watcher.name)}
                    >
                      Preview
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => props.onEditWatcher(watcher)}
                      class="px-2"
                    >
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
};
