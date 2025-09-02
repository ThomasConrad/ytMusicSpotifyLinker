// Accessibility utilities and constants

/**
 * Common ARIA attributes and roles
 */
export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  COMPLEMENTARY: 'complementary',
  SEARCH: 'search',
  FORM: 'form',
  DIALOG: 'dialog',
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  STATUS: 'status',
  PROGRESSBAR: 'progressbar',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  MENUBAR: 'menubar',
  LISTBOX: 'listbox',
  OPTION: 'option',
  COMBOBOX: 'combobox',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  ROW: 'row',
  COLUMNHEADER: 'columnheader',
  ROWHEADER: 'rowheader',
  TREE: 'tree',
  TREEITEM: 'treeitem',
} as const;

/**
 * Common ARIA states and properties
 */
export const ARIA_STATES = {
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  HIDDEN: 'aria-hidden',
  DISABLED: 'aria-disabled',
  PRESSED: 'aria-pressed',
  CURRENT: 'aria-current',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant',
  BUSY: 'aria-busy',
  INVALID: 'aria-invalid',
  REQUIRED: 'aria-required',
} as const;

/**
 * ARIA live region politeness levels
 */
export const ARIA_LIVE = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const;

/**
 * Common keyboard event key codes
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Generates a unique ID for accessibility purposes
 */
export function generateId(prefix: string = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates accessible form field attributes
 */
export interface AccessibleFieldProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-labelledby'?: string;
}

export function createAccessibleField(options: {
  id?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
}): AccessibleFieldProps {
  const id = options.id || generateId('field');
  
  const props: AccessibleFieldProps = { id };
  
  if (options.required) {
    props['aria-required'] = true;
  }
  
  if (options.invalid) {
    props['aria-invalid'] = true;
  }
  
  if (options.describedBy) {
    props['aria-describedby'] = options.describedBy;
  }
  
  if (options.labelledBy) {
    props['aria-labelledby'] = options.labelledBy;
  }
  
  return props;
}

/**
 * Creates accessible button attributes
 */
export interface AccessibleButtonProps {
  role?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function createAccessibleButton(options: {
  pressed?: boolean;
  expanded?: boolean;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  controls?: string;
  describedBy?: string;
  label?: string;
  labelledBy?: string;
}): AccessibleButtonProps {
  const props: AccessibleButtonProps = {};
  
  if (options.pressed !== undefined) {
    props['aria-pressed'] = options.pressed;
  }
  
  if (options.expanded !== undefined) {
    props['aria-expanded'] = options.expanded;
  }
  
  if (options.hasPopup !== undefined) {
    props['aria-haspopup'] = options.hasPopup;
  }
  
  if (options.controls) {
    props['aria-controls'] = options.controls;
  }
  
  if (options.describedBy) {
    props['aria-describedby'] = options.describedBy;
  }
  
  if (options.label) {
    props['aria-label'] = options.label;
  }
  
  if (options.labelledBy) {
    props['aria-labelledby'] = options.labelledBy;
  }
  
  return props;
}

/**
 * Keyboard navigation helpers
 */
export function handleKeyboardNavigation(
  event: KeyboardEvent,
  handlers: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
  }
): void {
  switch (event.key) {
    case KEYBOARD_KEYS.ENTER:
      event.preventDefault();
      handlers.onEnter?.();
      break;
    case KEYBOARD_KEYS.SPACE:
      event.preventDefault();
      handlers.onSpace?.();
      break;
    case KEYBOARD_KEYS.ESCAPE:
      event.preventDefault();
      handlers.onEscape?.();
      break;
    case KEYBOARD_KEYS.ARROW_UP:
      event.preventDefault();
      handlers.onArrowUp?.();
      break;
    case KEYBOARD_KEYS.ARROW_DOWN:
      event.preventDefault();
      handlers.onArrowDown?.();
      break;
    case KEYBOARD_KEYS.ARROW_LEFT:
      event.preventDefault();
      handlers.onArrowLeft?.();
      break;
    case KEYBOARD_KEYS.ARROW_RIGHT:
      event.preventDefault();
      handlers.onArrowRight?.();
      break;
    case KEYBOARD_KEYS.HOME:
      event.preventDefault();
      handlers.onHome?.();
      break;
    case KEYBOARD_KEYS.END:
      event.preventDefault();
      handlers.onEnd?.();
      break;
  }
}

/**
 * Focus management utilities
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
  );
  
  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== KEYBOARD_KEYS.TAB) return;
    
    if (event.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  
  // Focus the first element
  firstFocusableElement?.focus();
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Announces content to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Checks if an element is visible and focusable
 */
export function isElementFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Gets the accessible name of an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) {
      return labelElement.textContent || labelElement.innerText || '';
    }
  }
  
  // Check associated label for form controls
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    const labels = element.labels;
    if (labels && labels.length > 0) {
      return labels[0].textContent || labels[0].innerText || '';
    }
  }
  
  // Fall back to element text content
  return element.textContent || element.innerText || '';
}

/**
 * Color contrast utilities for accessibility
 */
export function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified implementation
  // In a real app, you'd use a proper color contrast calculation library
  const getLuminance = (color: string): number => {
    // Simplified luminance calculation
    // This would need a proper implementation for production use
    return 0.5; // Placeholder
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}