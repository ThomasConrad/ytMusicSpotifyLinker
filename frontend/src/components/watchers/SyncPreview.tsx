import {
  Component,
  Show,
  For,
  createSignal,
  createEffect,
  onMount,
} from 'solid-js';
import { Button, LoadingSpinner } from '@/components/ui';
import { watcherApi } from '@/services/watcherApi';
import { SyncPreview as SyncPreviewType, SyncPreviewItem } from '@/types';

export interface SyncPreviewProps {
  isOpen: () => boolean;
  watcherName: () => string;
  onClose: () => void;
  onExecuteSync: (watcherName: string) => void;
}

export const SyncPreview: Component<SyncPreviewProps> = (props) => {
  const [previewData, setPreviewData] = createSignal<SyncPreviewType | null>(
    null
  );
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isExecuting, setIsExecuting] = createSignal(false);

  let modalRef: HTMLDivElement | undefined;
  let backdropRef: HTMLDivElement | undefined;

  // Load preview data when modal opens
  createEffect(() => {
    if (props.isOpen() && props.watcherName()) {
      loadPreviewData();
    }
  });

  const loadPreviewData = async () => {
    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const result = await watcherApi.getSyncPreview(props.watcherName());
      if (result.success) {
        setPreviewData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load sync preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    setIsExecuting(true);
    try {
      await props.onExecuteSync(props.watcherName());
      props.onClose(); // Close modal after successful execution
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    if (!isExecuting()) {
      props.onClose();
    }
  };

  // Handle escape key and backdrop clicks
  createEffect(() => {
    if (!props.isOpen()) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExecuting()) {
        handleClose();
      }
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === backdropRef && !isExecuting()) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleBackdropClick);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleBackdropClick);
      document.body.style.overflow = '';
    };
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add':
        return (
          <svg
            class="w-4 h-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        );
      case 'skip':
        return (
          <svg
            class="w-4 h-4 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'conflict':
        return (
          <svg
            class="w-4 h-4 text-red-600"
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
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'add':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'skip':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'conflict':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
    }
  };

  return (
    <Show when={props.isOpen()}>
      <div
        ref={backdropRef}
        class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        <div
          ref={modalRef}
          class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
            <h2
              id="preview-modal-title"
              class="text-xl font-semibold text-gray-900 dark:text-gray-50"
            >
              Sync Preview: {props.watcherName()}
            </h2>

            <button
              onClick={handleClose}
              disabled={isExecuting()}
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              aria-label="Close modal"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto">
            <Show
              when={!isLoading() && !error() && previewData()}
              fallback={
                <div class="p-8">
                  <Show
                    when={error()}
                    fallback={
                      <div class="flex flex-col items-center justify-center py-12">
                        <LoadingSpinner size="lg" />
                        <p class="text-gray-600 dark:text-gray-400 mt-4">
                          Loading sync preview...
                        </p>
                      </div>
                    }
                  >
                    <div class="text-center py-12">
                      <div class="text-red-600 dark:text-red-400 mb-4">
                        {error()}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={loadPreviewData}
                      >
                        Retry
                      </Button>
                    </div>
                  </Show>
                </div>
              }
            >
              {(data) => (
                <div class="p-6">
                  {/* Summary */}
                  <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-3">
                      Sync Summary
                    </h3>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {data().summary.totalSongs}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                          Total Songs
                        </div>
                      </div>

                      <div>
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                          {data().summary.toAdd}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                          To Add
                        </div>
                      </div>

                      <div>
                        <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {data().summary.toSkip}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                          To Skip
                        </div>
                      </div>

                      <div>
                        <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                          {data().summary.conflicts}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                          Conflicts
                        </div>
                      </div>
                    </div>

                    <div class="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                      <strong>From:</strong> {data().sourcePlaylist} →{' '}
                      <strong>To:</strong> {data().targetPlaylist}
                    </div>
                  </div>

                  {/* Song List */}
                  <div class="space-y-2">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-3">
                      Detailed Changes
                    </h3>

                    <Show
                      when={data().items.length > 0}
                      fallback={
                        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                          No changes to preview
                        </div>
                      }
                    >
                      <div class="max-h-96 overflow-y-auto space-y-2">
                        <For each={data().items}>
                          {(item) => (
                            <div
                              class={`flex items-center space-x-3 p-3 rounded-lg border ${getActionColor(item.action)}`}
                            >
                              <div class="flex-shrink-0">
                                {getActionIcon(item.action)}
                              </div>

                              <div class="flex-1 min-w-0">
                                <p class="font-medium text-gray-900 dark:text-gray-50 truncate">
                                  {item.title}
                                </p>
                                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {item.artist}
                                </p>
                                <Show when={item.reason}>
                                  <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {item.reason}
                                  </p>
                                </Show>
                              </div>

                              <div class="flex-shrink-0">
                                <span
                                  class={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                    item.action === 'add'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : item.action === 'skip'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {item.action}
                                </span>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </Show>
          </div>

          {/* Footer */}
          <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isExecuting()}
            >
              Cancel
            </Button>

            <Show when={previewData() && !error()}>
              <Button
                variant="primary"
                loading={isExecuting()}
                onClick={handleExecuteSync}
                disabled={isExecuting() || isLoading()}
              >
                Execute Sync
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
