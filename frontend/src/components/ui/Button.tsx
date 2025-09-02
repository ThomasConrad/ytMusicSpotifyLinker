import { Component, JSX, splitProps } from 'solid-js';
import { createAccessibleButton } from '@/utils/accessibility';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: any;
  // Accessibility props
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, buttonProps] = splitProps(props, [
    'variant', 
    'size', 
    'loading', 
    'children', 
    'class',
    'aria-label',
    'aria-describedby',
    'aria-pressed',
    'aria-expanded',
    'aria-haspopup',
    'aria-controls'
  ]);

  const variant = local.variant || 'primary';
  const size = local.size || 'md';

  // Enhanced focus styles for better accessibility
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 shadow-md hover:shadow-lg focus:ring-primary-500 focus:ring-opacity-50',
    secondary: 'bg-primary-100 text-primary-800 hover:bg-primary-200 dark:bg-primary-800 dark:text-primary-50 dark:hover:bg-primary-700 shadow-sm hover:shadow focus:ring-primary-500 focus:ring-opacity-50',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/10 focus:ring-primary-500 focus:ring-opacity-50',
    ghost: 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/10 focus:ring-primary-500 focus:ring-opacity-50',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[2rem]',
    md: 'px-4 py-2 text-base min-h-[2.5rem]',
    lg: 'px-6 py-3 text-lg min-h-[3rem]',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${local.class || ''}`;

  return (
    <button
      class={classes}
      disabled={local.loading || buttonProps.disabled}
      aria-disabled={local.loading || buttonProps.disabled}
      aria-label={local.loading ? `Loading... ${local['aria-label'] || ''}`.trim() : local['aria-label']}
      aria-describedby={local['aria-describedby']}
      aria-pressed={local['aria-pressed']}
      aria-expanded={local['aria-expanded']}
      aria-haspopup={local['aria-haspopup']}
      aria-controls={local['aria-controls']}
      {...buttonProps}
    >
      {local.loading && (
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
          role="img"
          aria-label="Loading spinner"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {local.children}
    </button>
  );
};