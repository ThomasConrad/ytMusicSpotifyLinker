import { Component, createSignal, Show, For, onMount, onCleanup } from "solid-js";
import { watcherApi, SyncPreviewResponse } from "../../services/watcherApi";
import SongMatchDisplay from "./SongMatchDisplay";

interface SyncPreviewProps {
  isOpen: boolean;
  watcherName: string;
  onClose: () => void;
  onExecuteSync: (watcherName: string) => void;
}

const SyncPreview: Component<SyncPreviewProps> = (props) => {
  const [previewData, setPreviewData] = createSignal<SyncPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isExecuting, setIsExecuting] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"add" | "remove" | "failed">("add");

  let modalRef: HTMLDivElement | undefined;

  // Handle escape key press
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.isOpen && !isExecuting()) {
      props.onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === modalRef && !isExecuting()) {
      props.onClose();
    }
  };

  // Prevent body scrolling when modal is open
  const toggleBodyScroll = (disable: boolean) => {
    if (disable) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      toggleBodyScroll(false);
    };
  });

  onCleanup(() => {
    toggleBodyScroll(false);
  });

  // Update body scroll when modal state changes
  (() => {
    toggleBodyScroll(props.isOpen);
  })();

  // Load preview data when modal opens
  const loadPreview = async () => {
    if (!props.watcherName) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await watcherApi.previewSync(props.watcherName);
      
      if (result.success) {
        setPreviewData(result.data);
        // Set active tab to the first non-empty category
        if (result.data.songs_to_add.length > 0) {
          setActiveTab("add");
        } else if (result.data.songs_to_remove.length > 0) {
          setActiveTab("remove");
        } else if (result.data.songs_failed.length > 0) {
          setActiveTab("failed");
        }
      } else {
        setError(result.error || "Failed to load sync preview");
      }
    } catch (err: any) {
      setError("Failed to load sync preview");
    } finally {
      setIsLoading(false);
    }
  };

  // Load preview when modal opens
  (() => {
    if (props.isOpen && props.watcherName) {
      loadPreview();
    }
  })();

  const handleExecuteSync = async () => {
    setIsExecuting(true);
    try {
      await props.onExecuteSync(props.watcherName);
      props.onClose();
    } finally {
      setIsExecuting(false);
    }
  };

  const getTotalChanges = () => {
    if (!previewData()) return 0;
    const data = previewData()!;
    return data.songs_to_add.length + data.songs_to_remove.length;
  };

  const getTabData = (tab: "add" | "remove" | "failed") => {
    const data = previewData();
    if (!data) return [];
    
    switch (tab) {
      case "add":
        return data.songs_to_add;
      case "remove":
        return data.songs_to_remove;
      case "failed":
        return data.songs_failed;
    }
  };

  const getTabCount = (tab: "add" | "remove" | "failed") => {
    return getTabData(tab).length;
  };

  const hasAnyChanges = () => {
    return getTotalChanges() > 0;
  };

  return (
    <Show when={props.isOpen}>
      <div
        ref={modalRef}
        onClick={handleBackdropClick}
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
          {/* Modal Content */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-zoom-in overflow-hidden">
            {/* Modal Header */}
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">
                  Sync Preview
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {props.watcherName}
                </p>
              </div>
              <button
                onClick={props.onClose}
                disabled={isExecuting()}
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label="Close modal"
              >
                <svg
                  class="w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div class="flex flex-col max-h-[70vh]">
              <Show
                when={!isLoading()}
                fallback={
                  <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                      <svg
                        class="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2"
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
                      <p class="text-gray-600 dark:text-gray-400">
                        Loading sync preview...
                      </p>
                    </div>
                  </div>
                }
              >
                <Show
                  when={!error()}
                  fallback={
                    <div class="p-6">
                      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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
                          <div>
                            <p class="text-red-800 dark:text-red-200">{error()}</p>
                            <button
                              onClick={loadPreview}
                              class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm mt-1"
                            >
                              Try again
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                >
                  {/* Summary */}
                  <div class="p-6 border-b border-gray-200 dark:border-gray-600">
                    <Show when={previewData()?.message}>
                      <p class="text-gray-600 dark:text-gray-400 mb-4">
                        {previewData()!.message}
                      </p>
                    </Show>
                    
                    <Show
                      when={hasAnyChanges()}
                      fallback={
                        <div class="text-center py-4">
                          <svg
                            class="w-12 h-12 text-green-500 mx-auto mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50">
                            No changes needed
                          </h3>
                          <p class="text-gray-600 dark:text-gray-400 mt-1">
                            Your playlists are already in sync!
                          </p>
                        </div>
                      }
                    >
                      <div class="grid grid-cols-3 gap-4">
                        <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                            {getTabCount("add")}
                          </p>
                          <p class="text-sm text-green-800 dark:text-green-200">
                            Songs to add
                          </p>
                        </div>
                        <div class="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {getTabCount("remove")}
                          </p>
                          <p class="text-sm text-orange-800 dark:text-orange-200">
                            Songs to remove
                          </p>
                        </div>
                        <div class="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p class="text-2xl font-bold text-red-600 dark:text-red-400">
                            {getTabCount("failed")}
                          </p>
                          <p class="text-sm text-red-800 dark:text-red-200">
                            Failed matches
                          </p>
                        </div>
                      </div>
                    </Show>
                  </div>

                  {/* Tabs */}
                  <Show when={hasAnyChanges() || getTabCount("failed") > 0}>
                    <div class="border-b border-gray-200 dark:border-gray-600">
                      <nav class="flex space-x-8 px-6" aria-label="Tabs">
                        <button
                          onClick={() => setActiveTab("add")}
                          class={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab() === "add"
                              ? "border-green-500 text-green-600 dark:text-green-400"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                          disabled={getTabCount("add") === 0}
                        >
                          Add ({getTabCount("add")})
                        </button>
                        <button
                          onClick={() => setActiveTab("remove")}
                          class={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab() === "remove"
                              ? "border-orange-500 text-orange-600 dark:text-orange-400"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                          disabled={getTabCount("remove") === 0}
                        >
                          Remove ({getTabCount("remove")})
                        </button>
                        <button
                          onClick={() => setActiveTab("failed")}
                          class={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab() === "failed"
                              ? "border-red-500 text-red-600 dark:text-red-400"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                          disabled={getTabCount("failed") === 0}
                        >
                          Failed ({getTabCount("failed")})
                        </button>
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div class="flex-1 overflow-y-auto p-6">
                      <div class="space-y-3 max-h-80">
                        <Show when={activeTab() === "add"}>
                          <For each={previewData()?.songs_to_add}>
                            {(song) => (
                              <SongMatchDisplay song={song} type="add" />
                            )}
                          </For>
                        </Show>
                        <Show when={activeTab() === "remove"}>
                          <For each={previewData()?.songs_to_remove}>
                            {(song) => (
                              <SongMatchDisplay song={song} type="remove" />
                            )}
                          </For>
                        </Show>
                        <Show when={activeTab() === "failed"}>
                          <For each={previewData()?.songs_failed}>
                            {(failure) => (
                              <SongMatchDisplay failure={failure} type="failed" />
                            )}
                          </For>
                        </Show>
                      </div>
                    </div>
                  </Show>
                </Show>
              </Show>
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                <Show when={hasAnyChanges()}>
                  {getTotalChanges()} changes will be applied
                </Show>
              </div>
              <div class="flex space-x-3">
                <button
                  onClick={props.onClose}
                  disabled={isExecuting()}
                  class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancel
                </button>
                <Show when={hasAnyChanges()}>
                  <button
                    onClick={handleExecuteSync}
                    disabled={isExecuting()}
                    class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Show
                      when={!isExecuting()}
                      fallback={
                        <div class="flex items-center">
                          <svg
                            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Syncing...
                        </div>
                      }
                    >
                      Execute Sync
                    </Show>
                  </button>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SyncPreview;