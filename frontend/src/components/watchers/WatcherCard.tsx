import { Component, Show } from "solid-js";
import { WatcherSummary } from "../../services/watcherApi";
import WatcherStatus from "./WatcherStatus";

interface WatcherCardProps {
  watcher: WatcherSummary;
  onStart?: (watcherName: string) => void;
  onStop?: (watcherName: string) => void;
  onEdit?: (watcher: WatcherSummary) => void;
  onPreview?: (watcherName: string) => void;
}

const WatcherCard: Component<WatcherCardProps> = (props) => {
  const formatService = (service: string) => {
    return service.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "youtube_music":
        return (
          <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4.5L16 12l-5-3.5v7z"/>
          </svg>
        );
      case "spotify":
        return (
          <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.455c-.174.287-.544.378-.831.204-2.275-1.39-5.135-1.705-8.505-.935-.364.083-.729-.132-.812-.496-.083-.364.132-.729.496-.812 3.706-.847 6.936-.484 9.576 1.081.287.174.378.544.204.831zm1.188-2.64c-.218.36-.682.475-1.042.257-2.602-1.602-6.564-2.062-9.638-1.129-.432.131-.89-.111-1.021-.543-.131-.432.111-.89.543-1.021 3.528-1.069 7.925-.551 10.917 1.294.36.218.475.682.257 1.042zm.102-2.748C14.146 8.78 8.903 8.565 5.747 9.724c-.518.19-1.089-.076-1.279-.594-.19-.518.076-1.089.594-1.279 3.619-1.33 9.418-1.078 13.15 1.315.423.271.546.842.275 1.265-.271.423-.842.546-1.265.275z"/>
          </svg>
        );
      default:
        return (
          <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
    }
  };

  const handleToggleWatcher = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (props.watcher.is_active && props.onStop) {
      props.onStop(props.watcher.name);
    } else if (!props.watcher.is_active && props.onStart) {
      props.onStart(props.watcher.name);
    }
  };

  const handleEdit = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.onEdit?.(props.watcher);
  };

  const handlePreview = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.onPreview?.(props.watcher.name);
  };

  return (
    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-200 dark:border-gray-700">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 dark:text-gray-50 truncate">
            {props.watcher.name}
          </h3>
          <div class="flex items-center space-x-2 mt-1">
            <div class="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
              {getServiceIcon(props.watcher.source_service)}
              <span>{formatService(props.watcher.source_service)}</span>
            </div>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <div class="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
              {getServiceIcon(props.watcher.target_service)}
              <span>{formatService(props.watcher.target_service)}</span>
            </div>
          </div>
        </div>
        
        <WatcherStatus
          isActive={props.watcher.is_active}
          lastSyncStatus={props.watcher.last_sync_status}
          lastSyncAt={props.watcher.last_sync_at}
          syncSuccessRate={props.watcher.sync_success_rate}
          size="sm"
        />
      </div>

      <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <Show when={props.watcher.total_songs !== undefined}>
          <div class="flex items-center justify-between">
            <span class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>Songs synced:</span>
            </span>
            <span class="font-medium">{props.watcher.total_songs}</span>
          </div>
        </Show>

        <div class="flex items-center justify-between">
          <span class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Frequency:</span>
          </span>
          <span class="font-medium">{props.watcher.sync_frequency}h</span>
        </div>

        <Show when={props.watcher.last_sync_at}>
          <div class="flex items-center justify-between">
            <span class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Created:</span>
            </span>
            <span class="font-medium">
              {new Date(props.watcher.created_at).toLocaleDateString()}
            </span>
          </div>
        </Show>
      </div>

      <div class="flex items-center justify-between pt-3 mt-3 border-t border-gray-200 dark:border-gray-600">
        <div class="flex space-x-2">
          <button
            onClick={handleToggleWatcher}
            class={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
              props.watcher.is_active
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            }`}
          >
            {props.watcher.is_active ? "Stop" : "Start"}
          </button>

          <Show when={props.onPreview && props.watcher.is_active}>
            <button
              onClick={handlePreview}
              class="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors duration-200"
            >
              Preview
            </button>
          </Show>
        </div>

        <button
          onClick={handleEdit}
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
          title="Edit watcher"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WatcherCard;