'use client';

import AppHeader from '@/app/components/AppHeader';
import CredentialVaultPanel from '@/app/components/CredentialVaultPanel';
import TabBar from '@/app/components/TabBar';
import useConnection from '@/hooks/useConnection';

const APP_TABS = [
  { label: 'Cracker', href: '/cracker' },
  { label: 'Credential Vault', href: '/vault' },
];

export default function VaultPage() {
  const { connectedStatus, liveViewingEnabled, toggleLiveViewing } = useConnection();

  return (
    <main className="px-4 py-8 min-h-screen flex flex-col">
      <div className="container mx-auto max-w-4xl space-y-8">
        <AppHeader
          connectedStatus={connectedStatus as 'connected' | 'disconnected'}
          liveViewingEnabled={liveViewingEnabled}
          toggleLiveViewing={toggleLiveViewing}
        />

        <TabBar activePath="/vault" tabs={APP_TABS} />
      </div>

      <div className="container mx-auto mt-8 max-w-[1800px] h-[calc(100vh-240px)] min-h-[500px]">
        <CredentialVaultPanel />
      </div>
    </main>
  );
}
