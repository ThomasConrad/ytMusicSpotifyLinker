import { Component, Show, For } from "solid-js";
import { ServiceConnectionsResponse } from "../../services/userApi";

interface ServiceConnectionsProps {
  serviceConnections: ServiceConnectionsResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDisconnect: (service: "youtube_music" | "spotify") => void;
}

const ServiceConnections: Component<ServiceConnectionsProps> = (props) => {
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

  const handleDisconnect = (service: "youtube_music" | "spotify") => {
    const confirmed = confirm(
      `Are you sure you want to disconnect from ${service.replace("_", " ")}?`,
    );
    if (confirmed) {
      props.onDisconnect(service);
    }
  };

  return (
    <section>
      <h2 class="heading-2 mb-4">Service Connections</h2>
      <Show
        when={!props.isLoading && props.serviceConnections}
        fallback={
          <div class="space-y-4">
            <Show when={props.error}>
              <ErrorDisplay />
            </Show>
            <Show when={props.isLoading}>
              <div class="flex items-center space-x-2">
                <LoadingSpinner />
                <span class="text-gray-600 dark:text-gray-400">
                  Loading service connections...
                </span>
              </div>
            </Show>
          </div>
        }
      >
        <div class="grid gap-4 md:grid-cols-2">
          <For each={props.serviceConnections?.connections}>
            {(connection) => (
              <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-50 capitalize">
                    {connection.service.replace("_", " ")}
                  </h3>
                  <div class="flex items-center space-x-2">
                    <span
                      class={`px-2 py-1 rounded-full text-xs font-medium ${
                        connection.is_connected
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {connection.is_connected ? "Connected" : "Disconnected"}
                    </span>
                    {connection.requires_reauth && (
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Reauth Required
                      </span>
                    )}
                  </div>
                </div>
                <Show when={connection.is_connected}>
                  <div class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <Show when={connection.last_successful_auth}>
                      <p>
                        Last auth:{" "}
                        {new Date(
                          connection.last_successful_auth!,
                        ).toLocaleDateString()}
                      </p>
                    </Show>
                    <Show when={connection.expires_at}>
                      <p>
                        Expires:{" "}
                        {new Date(
                          connection.expires_at!,
                        ).toLocaleDateString()}
                      </p>
                    </Show>
                    <button
                      onClick={() =>
                        handleDisconnect(
                          connection.service as "youtube_music" | "spotify",
                        )
                      }
                      class="mt-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm transition-colors duration-200"
                    >
                      Disconnect
                    </button>
                  </div>
                </Show>
                <Show when={!connection.is_connected}>
                  <div class="mt-2">
                    <button class="btn btn-primary text-sm">
                      Connect {connection.service.replace("_", " ")}
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
};

export default ServiceConnections;