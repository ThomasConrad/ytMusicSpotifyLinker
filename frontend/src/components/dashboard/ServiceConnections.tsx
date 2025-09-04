import { Component, Show, For, createSignal } from 'solid-js';
import { LoadingSpinner, Button } from '@/components/ui';
import { ServiceConnection } from '@/types';

export interface ServiceConnectionsProps {
  serviceConnections: () => ServiceConnection[];
  isLoading: () => boolean;
  error: () => string | null;
  onRetry: () => void;
  onDisconnect: (service: 'youtube_music' | 'spotify') => void;
}

export const ServiceConnections: Component<ServiceConnectionsProps> = (
  props
) => {
  const [disconnecting, setDisconnecting] = createSignal<string | null>(null);

  const handleDisconnect = async (service: 'youtube_music' | 'spotify') => {
    const confirmed = confirm(
      `Are you sure you want to disconnect from ${service === 'youtube_music' ? 'YouTube Music' : 'Spotify'}?`
    );
    if (!confirmed) return;

    setDisconnecting(service);
    try {
      await props.onDisconnect(service);
    } finally {
      setDisconnecting(null);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'youtube_music':
        return (
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        );
      case 'spotify':
        return (
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.746 3.808-.871 7.077-.496 9.712 1.115.295.18.387.563.207.857zm1.223-2.723c-.226.367-.706.482-1.073.256-2.687-1.652-6.785-2.131-9.965-1.166-.405.123-.834-.082-.957-.487-.123-.405.082-.834.487-.957 3.632-1.102 8.147-.568 11.252 1.327.367.226.482.706.256 1.073zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.485.148-.997-.126-1.145-.611-.148-.485.126-.997.611-1.145 3.532-1.073 9.404-.866 13.115 1.338.445.264.591.837.327 1.282-.264.445-.837.591-1.282.327z" />
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <section
      class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
      aria-label="Service Connections"
    >
      <div class="flex justify-between items-center mb-6">
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-50"
          id="connections-heading"
        >
          Service Connections
        </h2>

        <Show when={!props.isLoading() && !props.error()}>
          <Button variant="secondary" size="sm" onClick={props.onRetry}>
            Refresh
          </Button>
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
        <div class="space-y-4">
          <For
            each={props.serviceConnections()}
            fallback={
              <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                No service connections found
              </div>
            }
          >
            {(connection) => (
              <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div
                      class={`flex-shrink-0 ${
                        connection.service === 'youtube_music'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {getServiceIcon(connection.service)}
                    </div>

                    <div class="flex-1">
                      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50">
                        {getServiceName(connection.service)}
                      </h3>

                      <div class="flex items-center space-x-2 mt-1">
                        <div
                          class={`w-2 h-2 rounded-full ${
                            connection.connected ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span
                          class={`text-sm font-medium ${
                            connection.connected
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {connection.connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>

                      <Show when={connection.connected && connection.username}>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Connected as: {connection.username}
                        </p>
                      </Show>

                      <Show when={connection.connectedAt}>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Connected: {formatDate(connection.connectedAt)}
                        </p>
                      </Show>

                      <Show when={connection.lastRefresh}>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          Last refresh: {formatDate(connection.lastRefresh)}
                        </p>
                      </Show>
                    </div>
                  </div>

                  <div class="flex-shrink-0">
                    <Show
                      when={connection.connected}
                      fallback={
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            // In a real implementation, this would trigger OAuth flow
                            alert(
                              `Connect to ${getServiceName(connection.service)} - OAuth flow would start here`
                            );
                          }}
                        >
                          Connect
                        </Button>
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        loading={disconnecting() === connection.service}
                        onClick={() => handleDisconnect(connection.service)}
                      >
                        Disconnect
                      </Button>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>

          {/* Add placeholder services if none exist */}
          <Show when={props.serviceConnections().length === 0}>
            <div class="space-y-4">
              {['youtube_music', 'spotify'].map((service) => (
                <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div
                        class={`flex-shrink-0 text-gray-400 ${
                          service === 'youtube_music'
                            ? 'dark:text-gray-500'
                            : 'dark:text-gray-500'
                        }`}
                      >
                        {getServiceIcon(service)}
                      </div>

                      <div class="flex-1">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50">
                          {getServiceName(service)}
                        </h3>

                        <div class="flex items-center space-x-2 mt-1">
                          <div class="w-2 h-2 rounded-full bg-red-500" />
                          <span class="text-sm font-medium text-red-600 dark:text-red-400">
                            Not Connected
                          </span>
                        </div>

                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Connect your {getServiceName(service)} account to
                          start syncing playlists
                        </p>
                      </div>
                    </div>

                    <div class="flex-shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          alert(
                            `Connect to ${getServiceName(service)} - OAuth flow would start here`
                          );
                        }}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Show>
        </div>
      </Show>
    </section>
  );
};
