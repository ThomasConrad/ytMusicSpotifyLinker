import {
  createContext,
  createSignal,
  createEffect,
  useContext,
  ParentComponent,
  onMount,
} from 'solid-js';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: () => Theme;
  resolvedTheme: () => ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>();

const STORAGE_KEY = 'yt-music-spotify-linker-theme';

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setThemeSignal] = createSignal<Theme>('system');
  const [resolvedTheme, setResolvedTheme] =
    createSignal<ResolvedTheme>('light');

  // Get system theme preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  // Resolve theme based on current setting
  const resolveTheme = (currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // Apply theme to document
  const applyTheme = (resolvedTheme: ResolvedTheme) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeSignal(newTheme);

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    const currentTheme = theme();
    const currentResolved = resolvedTheme();

    if (currentTheme === 'system') {
      // If currently system, switch to opposite of current resolved theme
      setTheme(currentResolved === 'dark' ? 'light' : 'dark');
    } else {
      // If currently light/dark, switch to the other
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
  };

  // Initialize theme from localStorage on mount
  onMount(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeSignal(savedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Only update resolved theme if current theme is 'system'
        if (theme() === 'system') {
          const newResolvedTheme = getSystemTheme();
          setResolvedTheme(newResolvedTheme);
          applyTheme(newResolvedTheme);
        }
      };

      mediaQuery.addEventListener('change', handleChange);

      // Cleanup listener
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  });

  // Update resolved theme when theme changes
  createEffect(() => {
    const currentTheme = theme();
    const newResolvedTheme = resolveTheme(currentTheme);
    setResolvedTheme(newResolvedTheme);
    applyTheme(newResolvedTheme);
  });

  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {props.children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
