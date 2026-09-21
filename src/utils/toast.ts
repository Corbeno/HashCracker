export const TOAST_EVENT = 'app:toast';

export interface ToastOptions {
  type?: 'info' | 'success' | 'error';
  duration?: number;
}

export interface ToastMessage {
  message: string;
  type: NonNullable<ToastOptions['type']>;
  duration: number;
}

/** Show a global toast. Duration is in milliseconds; newer toasts replace older ones. */
export function showToast(message: string, options: ToastOptions = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastMessage>(TOAST_EVENT, {
      detail: { message, type: options.type ?? 'info', duration: options.duration ?? 1000 },
    })
  );
}
