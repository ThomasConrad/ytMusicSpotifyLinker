import { Component, createSignal, Show, For, onMount } from "solid-js";
import { watcherApi, SyncHistoryResponse, SyncOperationSummary } from "../../services/watcherApi";
import SyncActivityItem from "../watchers/SyncActivityItem";

interface SyncHistoryProps {
  watcherId?: number; // If provided, shows history for specific watcher
  limit?: number; // Number of items per page, default 10
  showWatcherNames?: boolean; // Whether to show watcher names (for global history)
}

const SyncHistory: Component<SyncHistoryProps> = (props) => {
  const [syncHistory, setSyncHistory] = createSignal<SyncHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [statusFilter, setStatusFilter] = createSignal<string>("all");

  const perPage = () => props.limit || 10;

  const loadSyncHistory = async (page: number = 1) => {
    if (!props.watcherId) return; // For now, we need a specific watcher ID

    setIsLoading(true);
    setError(null);

    try {
      const result = await watcherApi.getWatcherSyncHistory(
        props.watcherId,
        page,
        perPage()
      );

      if (result.success) {
        setSyncHistory(result.data);
        setCurrentPage(page);
      } else {
        setError(result.error || "Failed to load sync history");
      }
    } catch (err: any) {
      setError("Failed to load sync history");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOperations = (): SyncOperationSummary[] => {
    if (!syncHistory()) return [];
    
    const operations = syncHistory()!.operations;
    if (statusFilter() === "all") {
      return operations;
    }
    
    return operations.filter(op => 
      op.status.toLowerCase() === statusFilter().toLowerCase()
    );
  };

  const handlePageChange = (page: number) => {
    loadSyncHistory(page);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    // Note: In a real implementation, we might want to filter on the server side
    // For now, we'll filter client-side within the current page
  };

  onMount(() => {
    if (props.watcherId) {
      loadSyncHistory(1);
    }
  });

  const LoadingSpinner = () => (
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  const ErrorDisplay = () => (
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center justify-between">
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
          <p class="text-red-800 dark:text-red-200">{error()}</p>
        </div>
        <button
          onClick={() => loadSyncHistory(currentPage())}
          class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div class="text-center py-8">
      <svg
        class="w-12 h-12 text-gray-400 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
        No sync history
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        {statusFilter() === "all" 
          ? "This watcher hasn't performed any sync operations yet."
          : `No ${statusFilter()} sync operations found.`
        }
      </p>
    </div>
  );

  const Pagination = () => {
    const history = syncHistory();
    if (!history?.pagination || history.pagination.total_pages <= 1) return null;

    const { page, total_pages } = history.pagination;
    const pages = [];
    
    // Simple pagination: show current page and neighbors
    const start = Math.max(1, page - 2);
    const end = Math.min(total_pages, page + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Showing page {page} of {total_pages} ({history.pagination.total_count} total operations)
        </div>
        <div class="flex space-x-1">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isLoading()}
            class="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Previous
          </button>
          <For each={pages}>
            {(pageNum) => (
              <button
                onClick={() => handlePageChange(pageNum)}
                disabled={isLoading()}
                class={`px-3 py-1 rounded text-sm border transition-colors duration-200 ${
                  pageNum === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {pageNum}
              </button>
            )}
          </For>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === total_pages || isLoading()}
            class="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="heading-2">Recent Activity</h2>
        
        {/* Status Filter */}
        <div class="flex items-center space-x-2">
          <label class="text-sm text-gray-600 dark:text-gray-400">Filter:</label>
          <select
            value={statusFilter()}
            onChange={(e) => handleFilterChange(e.currentTarget.value)}
            class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            disabled={isLoading()}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      <Show
        when={!isLoading()}
        fallback={<LoadingSpinner />}
      >
        <Show
          when={!error()}
          fallback={<ErrorDisplay />}
        >
          <Show
            when={filteredOperations().length > 0}
            fallback={<EmptyState />}
          >
            <div class="space-y-3">
              <For each={filteredOperations()}>
                {(operation) => (
                  <SyncActivityItem
                    operation={operation}
                    watcherName={props.showWatcherNames ? syncHistory()?.watcher_name : undefined}
                    showWatcherName={props.showWatcherNames}
                  />
                )}
              </For>
            </div>
            <Pagination />
          </Show>
        </Show>
      </Show>

      <Show when={!props.watcherId}>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div class="flex items-start">
            <svg
              class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3"
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
              <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Watcher Required
              </h3>
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                Please select a watcher to view its sync history.
              </p>
            </div>
          </div>
        </div>
      </Show>
    </section>
  );
};

export default SyncHistory;