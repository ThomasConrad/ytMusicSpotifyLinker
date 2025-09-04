import { Component, createSignal, Show } from 'solid-js';
import { Button, Input } from '@/components/ui';
import { SpotifyPlaylistSelector } from '@/components/spotify';
import { WatcherSummary, CreateWatcherRequest, ServiceType, SpotifyPlaylist } from '@/types';

export interface WatcherFormProps {
  watcher?: WatcherSummary;
  fieldErrors: () => Record<string, string>;
  isLoading: () => boolean;
  onSubmit: (request: CreateWatcherRequest) => void;
  onCancel: () => void;
}

export const WatcherForm: Component<WatcherFormProps> = (props) => {
  const [formData, setFormData] = createSignal<CreateWatcherRequest>({
    name: props.watcher?.name || '',
    sourceService: props.watcher?.sourceService || 'youtube_music',
    targetService: props.watcher?.targetService || 'spotify',
    sourcePlaylistId: '',
    createNewPlaylist: true,
    newPlaylistName: '',
  });

  const [localErrors, setLocalErrors] = createSignal<Record<string, string>>(
    {}
  );
  
  const [showSpotifySelector, setShowSpotifySelector] = createSignal(false);

  const updateField = <K extends keyof CreateWatcherRequest>(
    field: K,
    value: CreateWatcherRequest[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear local error when user starts typing
    if (localErrors()[field]) {
      setLocalErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const data = formData();

    if (!data.name.trim()) {
      errors.name = 'Watcher name is required';
    }

    if (!data.sourcePlaylistId.trim()) {
      errors.sourcePlaylistId = 'Source playlist ID is required';
    }

    if (data.createNewPlaylist) {
      if (!data.newPlaylistName?.trim()) {
        errors.newPlaylistName = 'New playlist name is required';
      }
    } else if (!data.targetPlaylistId?.trim()) {
      errors.targetPlaylistId = 'Target playlist ID is required';
    }

    if (data.sourceService === data.targetService) {
      errors.targetService =
        'Target service must be different from source service';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!validateForm()) return;

    props.onSubmit(formData());
  };

  const getError = (field: string) => {
    return props.fieldErrors()[field] || localErrors()[field] || '';
  };

  const handleSpotifyPlaylistSelect = (playlist: SpotifyPlaylist) => {
    updateField('sourcePlaylistId', playlist.id);
    setShowSpotifySelector(false);
  };

  const canUseSpotifySelector = () => {
    return formData().sourceService === 'spotify';
  };

  const serviceOptions: { value: ServiceType; label: string }[] = [
    { value: 'youtube_music', label: 'YouTube Music' },
    { value: 'spotify', label: 'Spotify' },
  ];

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* Watcher Name */}
      <Input
        type="text"
        label="Watcher Name"
        value={formData().name}
        onInput={(e) => updateField('name', e.currentTarget.value)}
        error={getError('name')}
        disabled={props.isLoading()}
        placeholder="e.g., My Favorites Sync"
        required
      />

      {/* Service Selection */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source Service
          </label>
          <select
            value={formData().sourceService}
            onChange={(e) =>
              updateField('sourceService', e.currentTarget.value as ServiceType)
            }
            disabled={props.isLoading()}
            class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-50 transition-colors duration-200"
            required
          >
            {serviceOptions.map((option) => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Service
          </label>
          <select
            value={formData().targetService}
            onChange={(e) =>
              updateField('targetService', e.currentTarget.value as ServiceType)
            }
            disabled={props.isLoading()}
            class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-50 transition-colors duration-200"
            required
          >
            {serviceOptions.map((option) => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>
          <Show when={getError('targetService')}>
            <p class="text-sm text-red-600 dark:text-red-400 mt-1">
              {getError('targetService')}
            </p>
          </Show>
        </div>
      </div>

      {/* Source Playlist */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Source Playlist
          </label>
          <Show when={canUseSpotifySelector()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSpotifySelector(!showSpotifySelector())}
              disabled={props.isLoading()}
            >
              {showSpotifySelector() ? 'Manual Entry' : 'Browse Playlists'}
            </Button>
          </Show>
        </div>

        <Show 
          when={showSpotifySelector() && canUseSpotifySelector()}
          fallback={
            <Input
              type="text"
              label="Playlist ID"
              value={formData().sourcePlaylistId}
              onInput={(e) => updateField('sourcePlaylistId', e.currentTarget.value)}
              error={getError('sourcePlaylistId')}
              disabled={props.isLoading()}
              placeholder={canUseSpotifySelector() ? 'Enter Spotify playlist ID or browse above' : 'Enter the playlist ID from the source service'}
              helperText={canUseSpotifySelector() 
                ? 'You can find this in the Spotify playlist URL or use the Browse Playlists button'
                : 'You can find this in the playlist URL or share link'
              }
              required
            />
          }
        >
          <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <SpotifyPlaylistSelector
              onSelect={handleSpotifyPlaylistSelect}
              selectedPlaylistId={formData().sourcePlaylistId}
            />
          </div>
        </Show>
      </div>

      {/* Target Configuration */}
      <div class="space-y-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Target Configuration
        </label>

        <div class="space-y-3">
          <label class="flex items-center">
            <input
              type="radio"
              name="targetType"
              checked={formData().createNewPlaylist}
              onChange={() => updateField('createNewPlaylist', true)}
              disabled={props.isLoading()}
              class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Create new playlist
            </span>
          </label>

          <Show when={formData().createNewPlaylist}>
            <div class="ml-6">
              <Input
                type="text"
                label="New Playlist Name"
                value={formData().newPlaylistName || ''}
                onInput={(e) =>
                  updateField('newPlaylistName', e.currentTarget.value)
                }
                error={getError('newPlaylistName')}
                disabled={props.isLoading()}
                placeholder="Enter name for the new playlist"
                required={formData().createNewPlaylist}
              />
            </div>
          </Show>

          <label class="flex items-center">
            <input
              type="radio"
              name="targetType"
              checked={!formData().createNewPlaylist}
              onChange={() => updateField('createNewPlaylist', false)}
              disabled={props.isLoading()}
              class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Use existing playlist
            </span>
          </label>

          <Show when={!formData().createNewPlaylist}>
            <div class="ml-6">
              <Input
                type="text"
                label="Target Playlist ID"
                value={formData().targetPlaylistId || ''}
                onInput={(e) =>
                  updateField('targetPlaylistId', e.currentTarget.value)
                }
                error={getError('targetPlaylistId')}
                disabled={props.isLoading()}
                placeholder="Enter existing playlist ID"
                helperText="The playlist must already exist on the target service"
                required={!formData().createNewPlaylist}
              />
            </div>
          </Show>
        </div>
      </div>

      {/* Form Actions */}
      <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
        <Button
          type="button"
          variant="secondary"
          onClick={props.onCancel}
          disabled={props.isLoading()}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          loading={props.isLoading()}
          disabled={props.isLoading()}
        >
          {props.watcher ? 'Update Watcher' : 'Create Watcher'}
        </Button>
      </div>
    </form>
  );
};
