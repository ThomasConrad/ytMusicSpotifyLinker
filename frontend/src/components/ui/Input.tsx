import { Component, JSX, splitProps, Show } from 'solid-js';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: Component<InputProps> = (props) => {
  const [local, inputProps] = splitProps(props, [
    'label',
    'error',
    'helperText',
    'class',
    'id',
  ]);

  const inputId =
    local.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!local.error;

  const baseClasses =
    'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent dark:bg-gray-800 dark:text-gray-50 transition-colors duration-200';

  const stateClasses = hasError
    ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
    : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500';

  const classes = `${baseClasses} ${stateClasses} ${local.class || ''}`;

  return (
    <div class="space-y-1">
      <Show when={local.label}>
        <label
          for={inputId}
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {local.label}
        </label>
      </Show>

      <input
        id={inputId}
        class={classes}
        aria-invalid={hasError}
        aria-describedby={
          local.error
            ? `${inputId}-error`
            : local.helperText
              ? `${inputId}-helper`
              : undefined
        }
        {...inputProps}
      />

      <Show when={local.error}>
        <p
          id={`${inputId}-error`}
          class="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {local.error}
        </p>
      </Show>

      <Show when={local.helperText && !local.error}>
        <p
          id={`${inputId}-helper`}
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          {local.helperText}
        </p>
      </Show>
    </div>
  );
};
