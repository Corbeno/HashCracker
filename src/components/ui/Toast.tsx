'use client';

import { useEffect, useState } from 'react';

import { TOAST_EVENT, type ToastMessage } from '@/utils/toast';

const styles = {
  info: 'border-blue-400 bg-blue-950',
  success: 'border-green-400 bg-green-950',
  error: 'border-red-400 bg-red-950',
};

export default function Toast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const show = (event: Event) => {
      const detail = (event as CustomEvent<ToastMessage>).detail;
      setToast(detail);
      clearTimeout(timeout);
      timeout = setTimeout(() => setToast(null), detail.duration);
    };
    window.addEventListener(TOAST_EVENT, show);
    return () => {
      window.removeEventListener(TOAST_EVENT, show);
      clearTimeout(timeout);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex w-96 items-start gap-3 rounded-lg border p-4 text-sm text-white shadow-lg max-w-[calc(100vw-2rem)] ${styles[toast.type]}`}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Dismiss notification"
        className="ml-auto shrink-0 rounded px-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
      >
        x
      </button>
    </div>
  );
}
