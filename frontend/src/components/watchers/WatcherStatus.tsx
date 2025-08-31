import { Component, Show } from "solid-js";

interface WatcherStatusProps {
  isActive: boolean;
  lastSyncStatus?: string;
  lastSyncAt?: string;
  syncSuccessRate?: number;
  size?: "sm" | "md" | "lg";
}

const WatcherStatus: Component<WatcherStatusProps> = (props) => {
  const size = () => props.size || "md";
  
  const getStatusConfig = () => {
    if (!props.isActive) {
      return {
        color: "gray",
        text: "Inactive",
        bgClass: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        icon: (
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM8 15a1 1 0 112 0 1 1 0 01-2 0z"
              clip-rule="evenodd"
            />
          </svg>
        ),
      };
    }

    if (props.lastSyncStatus === "completed") {
      return {
        color: "green",
        text: "Active",
        bgClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: (
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
        ),
      };
    }

    if (props.lastSyncStatus === "failed") {
      return {
        color: "red",
        text: "Error",
        bgClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: (
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        ),
      };
    }

    if (props.lastSyncStatus === "running") {
      return {
        color: "blue",
        text: "Syncing",
        bgClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: (
          <svg class="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ),
      };
    }

    return {
      color: "yellow",
      text: "Pending",
      bgClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      icon: (
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
      ),
    };
  };

  const getSizeClasses = () => {
    switch (size()) {
      case "sm":
        return "px-2 py-1 text-xs";
      case "lg":
        return "px-3 py-2 text-sm";
      default:
        return "px-2 py-1 text-xs";
    }
  };

  const formatLastSync = () => {
    if (!props.lastSyncAt) return null;
    
    const lastSync = new Date(props.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return lastSync.toLocaleDateString();
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div class="flex flex-col space-y-1">
      <span
        class={`inline-flex items-center gap-1 rounded-full font-medium ${getSizeClasses()} ${statusConfig.bgClass}`}
      >
        {statusConfig.icon}
        {statusConfig.text}
      </span>
      
      <Show when={props.lastSyncAt && props.isActive}>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Last sync: {formatLastSync()}
        </div>
      </Show>

      <Show when={props.syncSuccessRate !== undefined && props.isActive}>
        <div class="flex items-center space-x-1">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Success: {Math.round(props.syncSuccessRate!)}%
          </div>
          <div class="w-16 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div
              class={`h-1.5 rounded-full ${
                props.syncSuccessRate! >= 90
                  ? "bg-green-600"
                  : props.syncSuccessRate! >= 70
                  ? "bg-yellow-600"
                  : "bg-red-600"
              }`}
              style={{ width: `${props.syncSuccessRate}%` }}
            ></div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default WatcherStatus;