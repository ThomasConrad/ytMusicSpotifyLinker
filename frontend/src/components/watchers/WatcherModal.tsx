import { Component, Show, createEffect, onMount } from 'solid-js';
import { Button } from '@/components/ui';
import { WatcherSummary, CreateWatcherRequest } from '@/types';
import { WatcherForm } from './WatcherForm';

export interface WatcherModalProps {
  isOpen: () => boolean;
  watcher?: () => WatcherSummary | undefined;
  isLoading: () => boolean;
  error: () => string | null;
  fieldErrors: () => Record<string, string>;
  onSubmit: (request: CreateWatcherRequest) => void;
  onClose: () => void;
}

export const WatcherModal: Component<WatcherModalProps> = (props) => {
  let modalRef: HTMLDivElement | undefined;
  let backdropRef: HTMLDivElement | undefined;

  // Handle escape key and backdrop clicks
  createEffect(() => {
    if (!props.isOpen()) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !props.isLoading()) {
        props.onClose();
      }
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === backdropRef && !props.isLoading()) {
        props.onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleBackdropClick);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleBackdropClick);
      document.body.style.overflow = '';
    };
  });

  // Focus trap
  onMount(() => {
    if (props.isOpen() && modalRef) {
      const focusableElements = modalRef.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => document.removeEventListener('keydown', handleTabKey);
    }
  });

  return (
    <Show when={props.isOpen()}>
      <div
        ref={backdropRef}
        class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          ref={modalRef}
          class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
            <h2 id="modal-title" class="text-xl font-semibold text-gray-900 dark:text-gray-50">
              {props.watcher() ? 'Edit Watcher' : 'Create New Watcher'}
            </h2>
            
            <button
              onClick={props.onClose}
              disabled={props.isLoading()}
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              aria-label="Close modal"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div class="p-6">
            <Show when={props.error()}>
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                {props.error()}
              </div>
            </Show>

            <WatcherForm
              watcher={props.watcher()}
              fieldErrors={props.fieldErrors()}
              isLoading={props.isLoading()}
              onSubmit={props.onSubmit}
              onCancel={props.onClose}
            />
          </div>
        </div>
      </div>
    </Show>
  );
};