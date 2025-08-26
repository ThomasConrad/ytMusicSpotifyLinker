import { 
  createContext, 
  createSignal, 
  createEffect,
  useContext, 
  ParentComponent,
  onMount 
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { authApi, User, LoginRequest, RegisterRequest } from '../services/authApi';

// Authentication state and methods
interface AuthContextType {
  // State
  user: () => User | null;
  isAuthenticated: () => boolean;
  isLoading: () => boolean;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<LoginResult>;
  register: (userData: RegisterRequest) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Result types for better error handling
export interface LoginResult {
  success: boolean;
  error?: string;
  error_code?: string;
  field_errors?: Record<string, string>;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  error_code?: string;
  field_errors?: Record<string, string>;
}

const AuthContext = createContext<AuthContextType>();

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  // Check if user is authenticated
  const isAuthenticated = () => user() !== null;

  // Check authentication status on mount
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const result = await authApi.getCurrentUser();
      if (result.success) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (credentials: LoginRequest): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const result = await authApi.login(credentials);
      
      if (result.success) {
        setUser(result.data);
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
        error: error.message || 'Login failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterRequest): Promise<RegisterResult> => {
    setIsLoading(true);
    try {
      const result = await authApi.register(userData);
      
      if (result.success) {
        setUser(result.data);
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
        error: error.message || 'Registration failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear user state regardless of API result
      setUser(null);
      setIsLoading(false);
    }
  };

  // Check authentication on mount
  onMount(() => {
    checkAuth();
  });

  // Periodic session validation (every 5 minutes)
  createEffect(() => {
    if (!isAuthenticated()) return;

    const interval = setInterval(async () => {
      const isValid = await authApi.checkAuthentication();
      if (!isValid && user()) {
        console.warn('Session expired, clearing user state');
        setUser(null);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup on unmount or when user becomes unauthenticated
    return () => clearInterval(interval);
  });

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protecting routes
export interface ProtectedRouteProps {
  children: any;
  redirectTo?: string;
  fallback?: () => any;
}

export const ProtectedRoute: ParentComponent<ProtectedRouteProps> = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    // Wait for initial auth check to complete
    if (auth.isLoading()) return;

    // If not authenticated and no fallback provided, redirect
    if (!auth.isAuthenticated() && !props.fallback) {
      const redirectTo = props.redirectTo || '/login';
      navigate(redirectTo, { replace: true });
    }
  });

  // Show loading while checking authentication
  if (auth.isLoading()) {
    return (
      <div class="flex items-center justify-center min-h-screen">
        <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show fallback if not authenticated and fallback is provided
  if (!auth.isAuthenticated() && props.fallback) {
    return props.fallback();
  }

  // Show children if authenticated
  return auth.isAuthenticated() ? props.children : null;
};