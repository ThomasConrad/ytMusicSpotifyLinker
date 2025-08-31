import { Component, createSignal, Show } from "solid-js";
import { CreateWatcherRequest, WatcherSummary } from "../../services/watcherApi";

interface WatcherFormProps {
  watcher?: WatcherSummary; // For editing existing watcher
  isLoading: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onSubmit: (request: CreateWatcherRequest) => void;
  onCancel: () => void;
}

const WatcherForm: Component<WatcherFormProps> = (props) => {
  // Form state
  const [name, setName] = createSignal(props.watcher?.name || "");
  const [sourceService, setSourceService] = createSignal(props.watcher?.source_service || "");
  const [sourcePlaylistId, setSourcePlaylistId] = createSignal(props.watcher?.source_playlist_id || "");
  const [targetService, setTargetService] = createSignal(props.watcher?.target_service || "");
  const [targetPlaylistId, setTargetPlaylistId] = createSignal(props.watcher?.target_playlist_id || "");
  const [syncFrequency, setSyncFrequency] = createSignal(props.watcher?.sync_frequency || 24);

  // Local validation errors
  const [localErrors, setLocalErrors] = createSignal<Record<string, string>>({});

  const services = [
    { value: "youtube_music", label: "YouTube Music" },
    { value: "spotify", label: "Spotify" },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name().trim()) {
      errors.name = "Watcher name is required";
    } else if (name().trim().length < 3) {
      errors.name = "Watcher name must be at least 3 characters";
    }

    if (!sourceService()) {
      errors.source_service = "Source service is required";
    }

    if (!sourcePlaylistId().trim()) {
      errors.source_playlist_id = "Source playlist ID is required";
    }

    if (!targetService()) {
      errors.target_service = "Target service is required";
    }

    if (sourceService() === targetService()) {
      errors.target_service = "Target service must be different from source service";
    }

    if (syncFrequency() < 1 || syncFrequency() > 168) {
      errors.sync_frequency = "Sync frequency must be between 1 and 168 hours";
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const request: CreateWatcherRequest = {
      name: name().trim(),
      source_service: sourceService(),
      source_playlist_id: sourcePlaylistId().trim(),
      target_service: targetService(),
      target_playlist_id: targetPlaylistId().trim() || undefined,
      sync_frequency: syncFrequency(),
    };

    props.onSubmit(request);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return props.fieldErrors[fieldName] || localErrors()[fieldName];
  };

  const isEditing = () => !!props.watcher;

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* General error message */}
      <Show when={props.error}>
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg animate-shake">
          {props.error}
        </div>
      </Show>

      {/* Watcher Name */}
      <div>
        <label
          for="watcher-name"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Watcher Name *
        </label>
        <input
          type="text"
          id="watcher-name"
          value={name()}
          onInput={(e) => {
            setName(e.currentTarget.value);
            setLocalErrors({ ...localErrors(), name: "" });
          }}
          class={`input transition-all duration-300 ${
            getFieldError("name")
              ? "border-red-500 focus:border-red-500"
              : ""
          }`}
          placeholder="e.g., My Favorites Sync"
          disabled={props.isLoading}
          required
        />
        <Show when={getFieldError("name")}>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake">
            {getFieldError("name")}
          </p>
        </Show>
        <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
          A descriptive name for this watcher
        </p>
      </div>

      {/* Source Service */}
      <div>
        <label
          for="source-service"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Source Service *
        </label>
        <select
          id="source-service"
          value={sourceService()}
          onChange={(e) => {
            setSourceService(e.currentTarget.value);
            setLocalErrors({ ...localErrors(), source_service: "", target_service: "" });
          }}
          class={`input transition-all duration-300 ${
            getFieldError("source_service")
              ? "border-red-500 focus:border-red-500"
              : ""
          }`}
          disabled={props.isLoading || isEditing()}
          required
        >
          <option value="">Select source service</option>
          {services.map((service) => (
            <option value={service.value}>{service.label}</option>
          ))}
        </select>
        <Show when={getFieldError("source_service")}>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake">
            {getFieldError("source_service")}
          </p>
        </Show>
        <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
          The service to sync FROM
        </p>
      </div>

      {/* Source Playlist ID */}
      <div>
        <label
          for="source-playlist-id"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Source Playlist ID *
        </label>
        <input
          type="text"
          id="source-playlist-id"
          value={sourcePlaylistId()}
          onInput={(e) => {
            setSourcePlaylistId(e.currentTarget.value);
            setLocalErrors({ ...localErrors(), source_playlist_id: "" });
          }}
          class={`input transition-all duration-300 ${
            getFieldError("source_playlist_id")
              ? "border-red-500 focus:border-red-500"
              : ""
          }`}
          placeholder="Playlist ID from the source service"
          disabled={props.isLoading || isEditing()}
          required
        />
        <Show when={getFieldError("source_playlist_id")}>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake">
            {getFieldError("source_playlist_id")}
          </p>
        </Show>
        <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
          The ID of the playlist to sync from
        </p>
      </div>

      {/* Target Service */}
      <div>
        <label
          for="target-service"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Target Service *
        </label>
        <select
          id="target-service"
          value={targetService()}
          onChange={(e) => {
            setTargetService(e.currentTarget.value);
            setLocalErrors({ ...localErrors(), target_service: "" });
          }}
          class={`input transition-all duration-300 ${
            getFieldError("target_service")
              ? "border-red-500 focus:border-red-500"
              : ""
          }`}
          disabled={props.isLoading || isEditing()}
          required
        >
          <option value="">Select target service</option>
          {services.map((service) => (
            <option 
              value={service.value} 
              disabled={service.value === sourceService()}
            >
              {service.label}
            </option>
          ))}
        </select>
        <Show when={getFieldError("target_service")}>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake">
            {getFieldError("target_service")}
          </p>
        </Show>
        <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
          The service to sync TO
        </p>
      </div>

      {/* Target Playlist ID */}
      <div>
        <label
          for="target-playlist-id"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Target Playlist ID
        </label>
        <input
          type="text"
          id="target-playlist-id"
          value={targetPlaylistId()}
          onInput={(e) => setTargetPlaylistId(e.currentTarget.value)}
          class="input transition-all duration-300"
          placeholder="Leave empty to create a new playlist"
          disabled={props.isLoading}
        />
        <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
          Optional: Specify a playlist ID, or leave empty to create a new one
        </p>
      </div>

      {/* Sync Frequency */}
      <div>
        <label
          for="sync-frequency"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Sync Frequency (hours) *
        </label>
        <input
          type="number"
          id="sync-frequency"
          min="1"
          max="168"
          value={syncFrequency()}
          onInput={(e) => {
            setSyncFrequency(parseInt(e.currentTarget.value) || 24);
            setLocalErrors({ ...localErrors(), sync_frequency: "" });
          }}
          class={`input transition-all duration-300 ${
            getFieldError("sync_frequency")
              ? "border-red-500 focus:border-red-500"
              : ""
          }`}
          disabled={props.isLoading}
          required
        />
        <Show when={getFieldError("sync_frequency")}>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake">
            {getFieldError("sync_frequency")}
          </p>
        </Show>
        <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
          How often to check for changes (1-168 hours)
        </p>
      </div>

      {/* Form Actions */}
      <div class="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.isLoading}
          class="btn btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={props.isLoading}
          class={`btn btn-primary flex-1 transition-all duration-300 ${
            props.isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Show
            when={!props.isLoading}
            fallback={
              <div class="flex items-center justify-center">
                <svg
                  class="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {isEditing() ? "Updating..." : "Creating..."}
              </div>
            }
          >
            {isEditing() ? "Update Watcher" : "Create Watcher"}
          </Show>
        </button>
      </div>
    </form>
  );
};

export default WatcherForm;