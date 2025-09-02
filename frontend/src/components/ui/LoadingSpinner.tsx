import { Component } from 'solid-js';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'current';
  class?: string;
  label?: string;
}

export const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const colorClasses = {
    primary: 'border-primary-600',
    secondary: 'border-gray-600',
    current: 'border-current',
  };

  const size = props.size || 'md';
  const color = props.color || 'primary';
  const label = props.label || 'Loading';
  
  return (
    <div
      class={`animate-spin rounded-full border-2 border-transparent border-t-2 ${sizeClasses[size]} ${colorClasses[color]} ${props.class || ''}`}
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">{label}...</span>
    </div>
  );
};