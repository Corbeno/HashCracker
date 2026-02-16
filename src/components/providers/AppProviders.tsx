'use client';

import { ReactNode } from 'react';

import { ConnectionProvider } from '@/contexts/ConnectionContext';

export default function AppProviders({ children }: { children: ReactNode }) {
  return <ConnectionProvider>{children}</ConnectionProvider>;
}
