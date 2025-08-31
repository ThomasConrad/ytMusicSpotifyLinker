import { Component, Show } from "solid-js";
import { SyncOperationSummary } from "../../services/watcherApi";

interface SyncActivityItemProps {
  operation: SyncOperationSummary;
  watcherName?: string;
  showWatcherName?: boolean;
}

const SyncActivityItem: Component<SyncActivityItemProps> = (props) => {
  const getStatusConfig = () => {
    switch (props.operation.status.toLowerCase()) {
      case "completed":
      case "success":
        return {
          color: "green",
          bgClass: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          iconClass: "text-green-600 dark:text-green-400",
          textClass: "text-green-800 dark:text-green-200",
          icon: (
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          ),
        };
      case "failed":
      case "error":
        return {
          color: "red",
          bgClass: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          iconClass: "text-red-600 dark:text-red-400",
          textClass: "text-red-800 dark:text-red-200",
          icon: (
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          ),
        };
      case "running":
      case "in_progress":
        return {
          color: "blue",
          bgClass: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
          iconClass: "text-blue-600 dark:text-blue-400",
          textClass: "text-blue-800 dark:text-blue-200",
          icon: (
            <svg class="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ),
        };
      default:
        return {
          color: "gray",
          bgClass: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          iconClass: "text-gray-600 dark:text-gray-400",
          textClass: "text-gray-800 dark:text-gray-200",
          icon: (
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          ),
        };
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDuration = () => {
    if (!props.operation.started_at || !props.operation.completed_at) {
      return null;
    }

    const start = new Date(props.operation.started_at);
    const end = new Date(props.operation.completed_at);
    const durationMs = end.getTime() - start.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    } else if (durationSeconds < 3600) {
      return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
    } else {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getTotalSongs = () => {
    return props.operation.songs_added + props.operation.songs_removed + props.operation.songs_failed;
  };

  const getOperationTitle = () => {
    const type = props.operation.operation_type;
    switch (type.toLowerCase()) {
      case "sync":
        return "Playlist Sync";
      case "full_sync":
        return "Full Sync";
      case "partial_sync":
        return "Partial Sync";
      default:
        return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div class={`border rounded-lg p-4 transition-all duration-200 hover:shadow-sm ${statusConfig.bgClass}`}>
      <div class="flex items-start space-x-3">
        {/* Status Icon */}
        <div class={`flex-shrink-0 mt-0.5 ${statusConfig.iconClass}`}>
          {statusConfig.icon}
        </div>

        {/* Content */}
        <div class="flex-1 min-w-0">
          {/* Header */}
          <div class="flex items-center justify-between mb-2">
            <div>
              <h4 class={`text-sm font-medium ${statusConfig.textClass}`}>
                {getOperationTitle()}
                <Show when={props.showWatcherName && props.watcherName}>
                  <span class="text-gray-500 dark:text-gray-400 font-normal">
                    {" "}• {props.watcherName}
                  </span>
                </Show>
              </h4>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {formatDateTime(props.operation.started_at)}
                <Show when={formatDuration()}>
                  <span> • Duration: {formatDuration()}</span>
                </Show>
              </p>
            </div>
            <div class="text-right">
              <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                statusConfig.color === "green"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : statusConfig.color === "red"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : statusConfig.color === "blue"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
              }`}>
                {props.operation.status.charAt(0).toUpperCase() + props.operation.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div class="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <Show when={props.operation.songs_added > 0}>
              <div class="flex items-center space-x-1">
                <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                <span>{props.operation.songs_added} added</span>
              </div>
            </Show>

            <Show when={props.operation.songs_removed > 0}>
              <div class="flex items-center space-x-1">
                <svg class="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                <span>{props.operation.songs_removed} removed</span>
              </div>
            </Show>

            <Show when={props.operation.songs_failed > 0}>
              <div class="flex items-center space-x-1">
                <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                <span>{props.operation.songs_failed} failed</span>
              </div>
            </Show>

            <Show when={getTotalSongs() > 0}>
              <div class="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                <span>{getTotalSongs()} total</span>
              </div>
            </Show>
          </div>

          {/* Error Message */}
          <Show when={props.operation.error_message}>
            <div class="mt-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              <div class="flex items-start space-x-1">
                <svg class="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span class="break-words">{props.operation.error_message}</span>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default SyncActivityItem;