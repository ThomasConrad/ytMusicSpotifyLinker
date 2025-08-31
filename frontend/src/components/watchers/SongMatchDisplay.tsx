import { Component, Show } from "solid-js";
import { SongResponse, SongFailure } from "../../services/watcherApi";

interface SongMatchDisplayProps {
  song?: SongResponse;
  failure?: SongFailure;
  type: "add" | "remove" | "failed";
}

const SongMatchDisplay: Component<SongMatchDisplayProps> = (props) => {
  const getTypeConfig = () => {
    switch (props.type) {
      case "add":
        return {
          bgClass: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          iconClass: "text-green-600 dark:text-green-400",
          textClass: "text-green-800 dark:text-green-200",
          icon: (
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
          ),
          label: "Will be added",
        };
      case "remove":
        return {
          bgClass: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
          iconClass: "text-orange-600 dark:text-orange-400",
          textClass: "text-orange-800 dark:text-orange-200",
          icon: (
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          ),
          label: "Will be removed",
        };
      case "failed":
        return {
          bgClass: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          iconClass: "text-red-600 dark:text-red-400",
          textClass: "text-red-800 dark:text-red-200",
          icon: (
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          ),
          label: "Failed to match",
        };
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return null;
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getServiceIcon = (service?: string) => {
    if (!service) return null;
    
    switch (service.toLowerCase()) {
      case "youtube_music":
        return (
          <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4.5L16 12l-5-3.5v7z"/>
          </svg>
        );
      case "spotify":
        return (
          <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.455c-.174.287-.544.378-.831.204-2.275-1.39-5.135-1.705-8.505-.935-.364.083-.729-.132-.812-.496-.083-.364.132-.729.496-.812 3.706-.847 6.936-.484 9.576 1.081.287.174.378.544.204.831zm1.188-2.64c-.218.36-.682.475-1.042.257-2.602-1.602-6.564-2.062-9.638-1.129-.432.131-.89-.111-1.021-.543-.131-.432.111-.89.543-1.021 3.528-1.069 7.925-.551 10.917 1.294.36.218.475.682.257 1.042z"/>
          </svg>
        );
      default:
        return (
          <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <div class={`border rounded-lg p-3 transition-all duration-200 ${typeConfig.bgClass}`}>
      <div class="flex items-start space-x-3">
        {/* Type Icon */}
        <div class={`flex-shrink-0 mt-0.5 ${typeConfig.iconClass}`}>
          {typeConfig.icon}
        </div>

        {/* Song Content */}
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between mb-1">
            <div class="flex-1 min-w-0">
              {/* Song Title */}
              <h4 class="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                <Show
                  when={props.song}
                  fallback={props.failure?.title || "Unknown"}
                >
                  {props.song!.title}
                </Show>
              </h4>
              
              {/* Artist & Album */}
              <div class="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <Show when={props.song?.artist || props.failure?.artist}>
                  <p class="truncate">
                    <span class="font-medium">Artist:</span>{" "}
                    {props.song?.artist || props.failure?.artist}
                  </p>
                </Show>
                
                <Show when={props.song?.album}>
                  <p class="truncate">
                    <span class="font-medium">Album:</span>{" "}
                    {props.song!.album}
                  </p>
                </Show>
              </div>
            </div>

            {/* Service & Duration */}
            <div class="flex flex-col items-end space-y-1">
              <Show when={props.song?.service}>
                <div class="flex items-center space-x-1">
                  {getServiceIcon(props.song!.service)}
                  <span class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {props.song!.service.replace("_", " ")}
                  </span>
                </div>
              </Show>
              
              <Show when={formatDuration(props.song?.duration_ms)}>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {formatDuration(props.song!.duration_ms)}
                </span>
              </Show>
            </div>
          </div>

          {/* Status Label */}
          <div class="flex items-center justify-between">
            <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bgClass.replace('bg-', 'bg-').replace('dark:bg-', 'dark:bg-')} ${typeConfig.textClass}`}>
              {typeConfig.label}
            </span>
            
            <Show when={props.song?.external_id}>
              <span class="text-xs text-gray-400 dark:text-gray-500 font-mono">
                ID: {props.song!.external_id.substring(0, 8)}...
              </span>
            </Show>
          </div>

          {/* Error Message for Failed Songs */}
          <Show when={props.failure?.error}>
            <div class="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-xs">
              <div class="flex items-start space-x-1">
                <svg class="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-red-700 dark:text-red-300 break-words">
                  <span class="font-medium">Error:</span> {props.failure!.error}
                </span>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default SongMatchDisplay;