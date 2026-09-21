'use client';

import { ReactNode } from 'react';

import Toast from '@/components/ui/Toast';
import { ConnectionProvider } from '@/contexts/ConnectionContext';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider>
      {children}
      <Toast />
    </ConnectionProvider>
  );
}
