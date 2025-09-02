// User and dashboard related types

import { User } from './auth';

export interface DashboardData {
  user: User;
  stats: {
    totalWatchers: number;
    activeWatchers: number;
    totalSyncs: number;
    lastSyncTime?: string;
  };
}

export interface ServiceConnection {
  service: 'youtube_music' | 'spotify';
  connected: boolean;
  username?: string;
  connectedAt?: string;
  lastRefresh?: string;
}

export interface SyncActivity {
  id: number;
  watcherId: number;
  watcherName: string;
  timestamp: string;
  status: 'success' | 'error' | 'partial';
  songsAdded: number;
  songsSkipped: number;
  error?: string;
}

// API operation result types
export type UserResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      error_code?: string;
    };