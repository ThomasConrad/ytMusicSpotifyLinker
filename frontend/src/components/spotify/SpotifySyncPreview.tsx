import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { LoadingSpinner, Button } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { 
  SpotifySyncPreviewResponse, 
  SpotifySongPreview, 
  SpotifySongFailure,
  SpotifySyncOperationResponse 
} from '@/types';

export interface SpotifySyncPreviewProps {
  watcherId?: number;
  sourcePlaylistId?: string;
  targetPlaylistId?: string;
  sourceService: 'youtube_music' | 'spotify';
  targetService: 'youtube_music' | 'spotify';
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (result: SpotifySyncOperationResponse) => void;
}

export const SpotifySyncPreview: Component<SpotifySyncPreviewProps> = (props) => {
  const userContext = useUser();
  const [isLoadingPreview, setIsLoadingPreview] = createSignal(false);
  const [previewData, setPreviewData] = createSignal<SpotifySyncPreviewResponse | null>(null);
  const [previewError, setPreviewError] = createSignal<string | null>(null);
  const [isExecutingSync, setIsExecutingSync] = createSignal(false);
  const [syncProgress, setSyncProgress] = createSignal<{
    current: number;
    total: number;
    stage: string;
  } | null>(null);

  // Load preview when modal opens
  createEffect(() => {
    if (props.isOpen && (props.sourcePlaylistId || props.watcherId)) {
      loadPreview();
    }
  });

  const loadPreview = async () => {
    if (!props.sourcePlaylistId && !props.watcherId) return;

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      // This would call the backend sync preview API
      // For now, we'll create mock data
      const mockPreview: SpotifySyncPreviewResponse = {
        success: true,
        preview: {
          songs_to_add: [
            {
              id: 1,
              service: props.sourceService,
              external_id: 'track_1',
              title: 'Example Song 1',
              artist: 'Example Artist 1',
              album: 'Example Album 1',
              duration_ms: 180000
            },
            {
              id: 2,
              service: props.sourceService,
              external_id: 'track_2',
              title: 'Example Song 2',
              artist: 'Example Artist 2',
              album: 'Example Album 2',
              duration_ms: 210000
            }
          ],
          songs_to_remove: [
            {
              id: 3,
              service: props.targetService,
              external_id: 'track_3',
              title: 'Old Song',
              artist: 'Old Artist',
              album: 'Old Album',
              duration_ms: 190000
            }
          ],
          songs_failed: [
            {
              id: 4,
              service: props.sourceService,
              external_id: 'track_4',
              title: 'Failed Song',
              artist: 'Failed Artist',
              album: 'Failed Album',
              duration_ms: 200000,
              error_reason: 'Song not available in target service'
            }
          ]
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPreviewData(mockPreview);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load sync preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const executeSync = async () => {
    if (!previewData()?.success || !props.watcherId) return;

    setIsExecutingSync(true);
    setSyncProgress({ current: 0, total: 100, stage: 'Preparing sync...' });

    try {
      // Simulate sync progress
      const stages = [
        'Analyzing source playlist...',
        'Matching songs...',
        'Adding new songs...',
        'Removing old songs...',
        'Finalizing sync...'
      ];

      for (let i = 0; i < stages.length; i++) {
        setSyncProgress({ 
          current: (i + 1) * 20, 
          total: 100, 
          stage: stages[i] 
        });
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Mock successful sync result
      const syncResult: SpotifySyncOperationResponse = {
        success: true,
        operation: {
          id: Date.now(),
          operation_type: 'sync',
          status: 'completed',
          songs_added: previewData()?.preview?.songs_to_add.length || 0,
          songs_removed: previewData()?.preview?.songs_to_remove.length || 0,
          songs_failed: previewData()?.preview?.songs_failed.length || 0,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        }
      };

      props.onSyncComplete?.(syncResult);
      props.onClose();
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsExecutingSync(false);
      setSyncProgress(null);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'youtube_music':
        return (
          <svg class="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        );
      case 'spotify':
        return (
          <svg class="w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.746 3.808-.871 7.077-.496 9.712 1.115.295.18.387.563.207.857zm1.223-2.723c-.226.367-.706.482-1.073.256-2.687-1.652-6.785-2.131-9.965-1.166-.405.123-.834-.082-.957-.487-.123-.405.082-.834.487-.957 3.632-1.102 8.147-.568 11.252 1.327.367.226.482.706.256 1.073zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.485.148-.997-.126-1.145-.611-.148-.485.126-.997.611-1.145 3.532-1.073 9.404-.866 13.115 1.338.445.264.591.837.327 1.282-.264.445-.837.591-1.282.327z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const SongList: Component<{ 
    songs: SpotifySongPreview[]; 
    title: string; 
    iconColor: string;
    emptyMessage: string;
  }> = (listProps) => (
    <div class="space-y-3">
      <h4 class={`text-sm font-medium ${listProps.iconColor}`}>
        {listProps.title} ({listProps.songs.length})
      </h4>
      <Show 
        when={listProps.songs.length > 0}
        fallback={
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">
            {listProps.emptyMessage}
          </p>
        }
      >
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <For each={listProps.songs}>
            {(song) => (
              <div class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="flex-shrink-0">
                  {getServiceIcon(song.service)}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                    {song.title}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {song.artist} {song.album && `• ${song.album}`}
                  </p>
                </div>
                <div class="flex-shrink-0 text-sm text-gray-400">
                  {formatDuration(song.duration_ms)}
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );

  const FailureList: Component<{ failures: SpotifySongFailure[] }> = (failProps) => (
    <div class="space-y-3">
      <h4 class="text-sm font-medium text-red-600 dark:text-red-400">
        Failed Songs ({failProps.failures.length})
      </h4>
      <Show 
        when={failProps.failures.length > 0}
        fallback={
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">
            No songs failed to sync
          </p>
        }
      >
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <For each={failProps.failures}>
            {(failure) => (
              <div class="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div class="flex-shrink-0 mt-1">
                  <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                    {failure.title}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {failure.artist} {failure.album && `• ${failure.album}`}
                  </p>
                  <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                    {failure.error_reason}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );

  if (!props.isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Sync Preview
          </h2>
          <button
            onClick={props.onClose}
            disabled={isExecutingSync()}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <Show 
            when={!isLoadingPreview()}
            fallback={
              <div class="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span class="ml-3 text-gray-600 dark:text-gray-400">
                  Loading sync preview...
                </span>
              </div>
            }
          >
            <Show 
              when={!previewError()}
              fallback={
                <div class="text-center py-12">
                  <div class="text-red-600 dark:text-red-400 mb-4">
                    {previewError()}
                  </div>
                  <Button variant="secondary" onClick={loadPreview}>
                    Retry
                  </Button>
                </div>
              }
            >
              <Show when={previewData()?.success}>
                {(() => {
                  const preview = previewData()?.preview;
                  if (!preview) return null;

                  return (
                    <div class="space-y-6">
                      {/* Summary */}
                      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                          Sync Summary
                        </h3>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div class="text-center">
                            <p class="font-medium text-green-600 dark:text-green-400">
                              {preview.songs_to_add.length}
                            </p>
                            <p class="text-gray-600 dark:text-gray-400">To Add</p>
                          </div>
                          <div class="text-center">
                            <p class="font-medium text-orange-600 dark:text-orange-400">
                              {preview.songs_to_remove.length}
                            </p>
                            <p class="text-gray-600 dark:text-gray-400">To Remove</p>
                          </div>
                          <div class="text-center">
                            <p class="font-medium text-red-600 dark:text-red-400">
                              {preview.songs_failed.length}
                            </p>
                            <p class="text-gray-600 dark:text-gray-400">Failed</p>
                          </div>
                        </div>
                      </div>

                      {/* Songs to Add */}
                      <SongList
                        songs={preview.songs_to_add}
                        title="Songs to Add"
                        iconColor="text-green-600 dark:text-green-400"
                        emptyMessage="No songs to add"
                      />

                      {/* Songs to Remove */}
                      <SongList
                        songs={preview.songs_to_remove}
                        title="Songs to Remove"
                        iconColor="text-orange-600 dark:text-orange-400"
                        emptyMessage="No songs to remove"
                      />

                      {/* Failed Songs */}
                      <FailureList failures={preview.songs_failed} />
                    </div>
                  );
                })()}
              </Show>
            </Show>
          </Show>

          {/* Sync Progress */}
          <Show when={syncProgress()}>
            <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
              <div class="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
                <div class="text-center">
                  <LoadingSpinner size="lg" class="mb-4" />
                  <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
                    Syncing Playlist
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {syncProgress()?.stage}
                  </p>
                  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress()?.current || 0}%` }}
                    />
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {syncProgress()?.current}% complete
                  </p>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Footer */}
        <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-600">
          <Button
            variant="secondary"
            onClick={props.onClose}
            disabled={isExecutingSync()}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={executeSync}
            loading={isExecutingSync()}
            disabled={isLoadingPreview() || !!previewError() || !previewData()?.success}
          >
            Execute Sync
          </Button>
        </div>
      </div>
    </div>
  );
};