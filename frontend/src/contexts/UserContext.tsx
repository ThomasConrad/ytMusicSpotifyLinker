import {
  createContext,
  createSignal,
  createEffect,
  useContext,
  ParentComponent,
} from 'solid-js';
import { useAuth } from './AuthContext';
import { userApi } from '@/services/userApi';
import { watcherApi } from '@/services/watcherApi';
import {
  DashboardData,
  ServiceConnection,
  SyncActivity,
  WatcherSummary,
  CreateWatcherRequest,
} from '@/types';

// User context interface
interface UserContextType {
  // Dashboard data
  dashboardData: () => DashboardData | null;
  isLoadingDashboard: () => boolean;
  dashboardError: () => string | null;

  // Watchers
  watchers: () => WatcherSummary[];
  isLoadingWatchers: () => boolean;
  watchersError: () => string | null;

  // Service connections
  serviceConnections: () => ServiceConnection[];
  isLoadingConnections: () => boolean;
  connectionsError: () => string | null;

  // Actions
  retryDashboard: () => void;
  retryWatchers: () => void;
  retryConnections: () => void;
  refreshAll: () => Promise<void>;
  disconnectService: (service: 'youtube_music' | 'spotify') => Promise<{ success: boolean; error?: string }>;
  startWatcher: (watcherName: string) => Promise<{ success: boolean; error?: string }>;
  stopWatcher: (watcherName: string) => Promise<{ success: boolean; error?: string }>;
  createWatcher: (request: CreateWatcherRequest) => Promise<{ success: boolean; error?: string; field_errors?: Record<string, string> }>;
}

const UserContext = createContext<UserContextType>();

export const UserProvider: ParentComponent = (props) => {
  const { isAuthenticated } = useAuth();

  // Dashboard state
  const [dashboardData, setDashboardData] = createSignal<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = createSignal(false);
  const [dashboardError, setDashboardError] = createSignal<string | null>(null);

  // Watchers state
  const [watchers, setWatchers] = createSignal<WatcherSummary[]>([]);
  const [isLoadingWatchers, setIsLoadingWatchers] = createSignal(false);
  const [watchersError, setWatchersError] = createSignal<string | null>(null);

  // Service connections state
  const [serviceConnections, setServiceConnections] = createSignal<ServiceConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = createSignal(false);
  const [connectionsError, setConnectionsError] = createSignal<string | null>(null);

  // Load dashboard data
  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);
    setDashboardError(null);
    try {
      const result = await userApi.getDashboard();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setDashboardError(result.error);
      }
    } catch (error) {
      setDashboardError('Failed to load dashboard data');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Load watchers
  const loadWatchers = async () => {
    setIsLoadingWatchers(true);
    setWatchersError(null);
    try {
      const result = await watcherApi.getWatchers();
      if (result.success) {
        setWatchers(result.data);
      } else {
        setWatchersError(result.error);
      }
    } catch (error) {
      setWatchersError('Failed to load watchers');
    } finally {
      setIsLoadingWatchers(false);
    }
  };

  // Load service connections
  const loadServiceConnections = async () => {
    setIsLoadingConnections(true);
    setConnectionsError(null);
    try {
      const result = await userApi.getServiceConnections();
      if (result.success) {
        setServiceConnections(result.data);
      } else {
        setConnectionsError(result.error);
      }
    } catch (error) {
      setConnectionsError('Failed to load service connections');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Retry functions
  const retryDashboard = () => loadDashboardData();
  const retryWatchers = () => loadWatchers();
  const retryConnections = () => loadServiceConnections();

  // Refresh all data
  const refreshAll = async () => {
    if (!isAuthenticated()) return;
    
    await Promise.all([
      loadDashboardData(),
      loadWatchers(),
      loadServiceConnections(),
    ]);
  };

  // Disconnect service
  const disconnectService = async (service: 'youtube_music' | 'spotify') => {
    try {
      const result = await userApi.disconnectService(service);
      if (result.success) {
        // Refresh service connections to reflect the change
        await loadServiceConnections();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to disconnect service' };
    }
  };

  // Start watcher
  const startWatcher = async (watcherName: string) => {
    try {
      const result = await watcherApi.startWatcher(watcherName);
      if (result.success) {
        // Refresh watchers and dashboard to reflect the change
        await Promise.all([loadWatchers(), loadDashboardData()]);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to start watcher' };
    }
  };

  // Stop watcher
  const stopWatcher = async (watcherName: string) => {
    try {
      const result = await watcherApi.stopWatcher(watcherName);
      if (result.success) {
        // Refresh watchers and dashboard to reflect the change
        await Promise.all([loadWatchers(), loadDashboardData()]);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to stop watcher' };
    }
  };

  // Create watcher
  const createWatcher = async (request: CreateWatcherRequest) => {
    try {
      const result = await watcherApi.createWatcher(request);
      if (result.success) {
        // Refresh watchers and dashboard to reflect the new watcher
        await Promise.all([loadWatchers(), loadDashboardData()]);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error,
          field_errors: result.field_errors 
        };
      }
    } catch (error) {
      return { success: false, error: 'Failed to create watcher' };
    }
  };

  // Load data when user becomes authenticated
  createEffect(() => {
    if (isAuthenticated()) {
      refreshAll();
    } else {
      // Clear data when user logs out
      setDashboardData(null);
      setWatchers([]);
      setServiceConnections([]);
      setDashboardError(null);
      setWatchersError(null);
      setConnectionsError(null);
    }
  });

  const contextValue: UserContextType = {
    dashboardData,
    isLoadingDashboard,
    dashboardError,
    watchers,
    isLoadingWatchers,
    watchersError,
    serviceConnections,
    isLoadingConnections,
    connectionsError,
    retryDashboard,
    retryWatchers,
    retryConnections,
    refreshAll,
    disconnectService,
    startWatcher,
    stopWatcher,
    createWatcher,
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
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};