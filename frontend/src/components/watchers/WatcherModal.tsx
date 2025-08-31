import { Component, createSignal, Show, onMount, onCleanup } from "solid-js";
import { CreateWatcherRequest, WatcherSummary } from "../../services/watcherApi";
import WatcherForm from "./WatcherForm";

interface WatcherModalProps {
  isOpen: boolean;
  watcher?: WatcherSummary; // For editing existing watcher
  isLoading: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onSubmit: (request: CreateWatcherRequest) => void;
  onClose: () => void;
}

const WatcherModal: Component<WatcherModalProps> = (props) => {
  let modalRef: HTMLDivElement | undefined;

  // Handle escape key press
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.isOpen) {
      props.onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === modalRef) {
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
      toggleBodyScroll(false); // Cleanup on unmount
    };
  });

  onCleanup(() => {
    toggleBodyScroll(false);
  });

  // Update body scroll when modal state changes
  (() => {
    toggleBodyScroll(props.isOpen);
  })();

  const isEditing = () => !!props.watcher;

  return (
    <Show when={props.isOpen}>
      <div
        ref={modalRef}
        onClick={handleBackdropClick}
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
          {/* Modal Content */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-zoom-in overflow-hidden">
            {/* Modal Header */}
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">
                {isEditing() ? `Edit Watcher: ${props.watcher?.name}` : "Create New Watcher"}
              </h2>
              <button
                onClick={props.onClose}
                disabled={props.isLoading}
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
            <div class="p-6 max-h-[70vh] overflow-y-auto">
              <Show when={!isEditing()}>
                <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div class="flex items-start">
                    <svg
                      class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div>
                      <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Getting Started
                      </h3>
                      <p class="text-sm text-blue-700 dark:text-blue-300">
                        To create a watcher, you'll need to connect both services and obtain playlist IDs. 
                        Make sure you have the necessary permissions for both source and target services.
                      </p>
                    </div>
                  </div>
                </div>
              </Show>

              <WatcherForm
                watcher={props.watcher}
                isLoading={props.isLoading}
                error={props.error}
                fieldErrors={props.fieldErrors}
                onSubmit={props.onSubmit}
                onCancel={props.onClose}
              />
            </div>
          </div>

          {/* Loading Overlay */}
          <Show when={props.isLoading}>
            <div class="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg">
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
                  {isEditing() ? "Updating watcher..." : "Creating watcher..."}
                </p>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default WatcherModal;