import {
  createContext,
  createSignal,
  createEffect,
  useContext,
  ParentComponent,
  onMount,
} from "solid-js";
import {
  userApi,
  UserProfile,
  UserDashboardData,
  ServiceConnectionsResponse,
  UpdateProfileRequest,
} from "../services/userApi";
import {
  watcherApi,
  WatcherSummary,
  Watcher,
  CreateWatcherRequest,
} from "../services/watcherApi";

// User context state and methods
interface UserContextType {
  // Dashboard data state
  dashboardData: () => UserDashboardData | null;
  isLoadingDashboard: () => boolean;
  dashboardError: () => string | null;

  // Watchers state
  watchers: () => WatcherSummary[];
  isLoadingWatchers: () => boolean;
  watchersError: () => string | null;

  // Service connections state
  serviceConnections: () => ServiceConnectionsResponse | null;
  isLoadingConnections: () => boolean;
  connectionsError: () => string | null;

  // Actions
  loadDashboard: () => Promise<DashboardResult>;
  loadWatchers: () => Promise<WatchersResult>;
  loadServiceConnections: () => Promise<ConnectionsResult>;
  updateProfile: (
    updates: UpdateProfileRequest,
  ) => Promise<ProfileUpdateResult>;
  createWatcher: (request: CreateWatcherRequest) => Promise<WatcherResult>;
  startWatcher: (watcherName: string) => Promise<WatcherActionResult>;
  stopWatcher: (watcherName: string) => Promise<WatcherActionResult>;
  disconnectService: (
    service: "youtube_music" | "spotify",
  ) => Promise<ServiceResult>;

  // Retry mechanisms
  retryDashboard: () => Promise<void>;
  retryWatchers: () => Promise<void>;
  retryConnections: () => Promise<void>;

  // Refresh all data
  refreshAll: () => Promise<void>;
}

// Result types for better error handling
export interface DashboardResult {
  success: boolean;
  error?: string;
  error_code?: string;
}

export interface WatchersResult {
  success: boolean;
  error?: string;
  error_code?: string;
}

export interface ConnectionsResult {
  success: boolean;
  error?: string;
  error_code?: string;
}

export interface ProfileUpdateResult {
  success: boolean;
  error?: string;
  error_code?: string;
  field_errors?: Record<string, string>;
}

export interface WatcherResult {
  success: boolean;
  data?: Watcher;
  error?: string;
  error_code?: string;
  field_errors?: Record<string, string>;
}

export interface WatcherActionResult {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
}

export interface ServiceResult {
  success: boolean;
  error?: string;
  error_code?: string;
}

const UserContext = createContext<UserContextType>();

export const UserProvider: ParentComponent = (props) => {
  // Dashboard data signals
  const [dashboardData, setDashboardData] =
    createSignal<UserDashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = createSignal(false);
  const [dashboardError, setDashboardError] = createSignal<string | null>(null);

  // Watchers signals
  const [watchers, setWatchers] = createSignal<WatcherSummary[]>([]);
  const [isLoadingWatchers, setIsLoadingWatchers] = createSignal(false);
  const [watchersError, setWatchersError] = createSignal<string | null>(null);

  // Service connections signals
  const [serviceConnections, setServiceConnections] =
    createSignal<ServiceConnectionsResponse | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = createSignal(false);
  const [connectionsError, setConnectionsError] = createSignal<string | null>(
    null,
  );

  // Load dashboard data
  const loadDashboard = async (): Promise<DashboardResult> => {
    setIsLoadingDashboard(true);
    setDashboardError(null);

    try {
      const result = await userApi.getDashboardData();

      if (result.success) {
        setDashboardData(result.data);
        return { success: true };
      } else {
        setDashboardError(result.error);
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
        };
      }
    } catch (error: any) {
      const errorMessage = "Failed to load dashboard data";
      setDashboardError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Load enhanced watchers data
  const loadWatchers = async (): Promise<WatchersResult> => {
    setIsLoadingWatchers(true);
    setWatchersError(null);

    try {
      const result = await watcherApi.getEnhancedWatchers();

      if (result.success) {
        setWatchers(result.data);
        return { success: true };
      } else {
        setWatchersError(result.error);
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
        };
      }
    } catch (error: any) {
      const errorMessage = "Failed to load watchers";
      setWatchersError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoadingWatchers(false);
    }
  };

  // Load service connections
  const loadServiceConnections = async (): Promise<ConnectionsResult> => {
    setIsLoadingConnections(true);
    setConnectionsError(null);

    try {
      const result = await userApi.getServiceConnections();

      if (result.success) {
        setServiceConnections(result.data);
        return { success: true };
      } else {
        setConnectionsError(result.error);
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
        };
      }
    } catch (error: any) {
      const errorMessage = "Failed to load service connections";
      setConnectionsError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Update user profile
  const updateProfile = async (
    updates: UpdateProfileRequest,
  ): Promise<ProfileUpdateResult> => {
    try {
      const result = await userApi.updateProfile(updates);

      if (result.success) {
        // Update dashboard data with new profile info
        const currentDashboard = dashboardData();
        if (currentDashboard) {
          setDashboardData({
            ...currentDashboard,
            profile: result.data,
          });
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
          field_errors: result.field_errors,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to update profile",
      };
    }
  };

  // Create a new watcher
  const createWatcher = async (
    request: CreateWatcherRequest,
  ): Promise<WatcherResult> => {
    try {
      const result = await watcherApi.createWatcher(request);

      if (result.success) {
        // Refresh watchers list after creation
        await loadWatchers();
        // Also refresh dashboard to update watcher count
        await loadDashboard();

        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
          field_errors: result.field_errors,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to create watcher",
      };
    }
  };

  // Start a watcher
  const startWatcher = async (
    watcherName: string,
  ): Promise<WatcherActionResult> => {
    try {
      const result = await watcherApi.startWatcher(watcherName);

      if (result.success) {
        // Refresh watchers to show updated status
        await loadWatchers();
        return {
          success: true,
          message: result.data.message,
        };
      } else {
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to start watcher",
      };
    }
  };

  // Stop a watcher
  const stopWatcher = async (
    watcherName: string,
  ): Promise<WatcherActionResult> => {
    try {
      const result = await watcherApi.stopWatcher(watcherName);

      if (result.success) {
        // Refresh watchers to show updated status
        await loadWatchers();
        return {
          success: true,
          message: result.data.message,
        };
      } else {
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to stop watcher",
      };
    }
  };

  // Disconnect from a service
  const disconnectService = async (
    service: "youtube_music" | "spotify",
  ): Promise<ServiceResult> => {
    try {
      const result = await userApi.disconnectService(service);

      if (result.success) {
        // Refresh service connections and dashboard
        await Promise.all([loadServiceConnections(), loadDashboard()]);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error,
          error_code: result.error_code,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to disconnect service",
      };
    }
  };

  // Retry mechanisms with exponential backoff
  const retryDashboard = async () => {
    await loadDashboard();
  };

  const retryWatchers = async () => {
    await loadWatchers();
  };

  const retryConnections = async () => {
    await loadServiceConnections();
  };

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      loadDashboard(),
      loadWatchers(),
      loadServiceConnections(),
    ]);
  };

  // Load initial data on mount
  onMount(() => {
    refreshAll();
  });

  // Auto-refresh data every 5 minutes
  createEffect(() => {
    const interval = setInterval(
      () => {
        // Only refresh if there are no current loading states
        if (
          !isLoadingDashboard() &&
          !isLoadingWatchers() &&
          !isLoadingConnections()
        ) {
          refreshAll();
        }
      },
      5 * 60 * 1000, // 5 minutes
    );

    // Cleanup on unmount
    return () => clearInterval(interval);
  });

  const contextValue: UserContextType = {
    // State getters
    dashboardData,
    isLoadingDashboard,
    dashboardError,
    watchers,
    isLoadingWatchers,
    watchersError,
    serviceConnections,
    isLoadingConnections,
    connectionsError,

    // Actions
    loadDashboard,
    loadWatchers,
    loadServiceConnections,
    updateProfile,
    createWatcher,
    startWatcher,
    stopWatcher,
    disconnectService,

    // Retry mechanisms
    retryDashboard,
    retryWatchers,
    retryConnections,

    // Refresh all
    refreshAll,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {props.children}
    </UserContext.Provider>
  );
};

// Custom hook for using user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
