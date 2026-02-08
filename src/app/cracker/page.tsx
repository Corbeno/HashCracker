'use client';

import { useEffect, useState } from 'react';

import ActiveJobsPanel from '@/app/components/ActiveJobsPanel';
import AppHeader from '@/app/components/AppHeader';
import BenchmarkModal from '@/app/components/BenchmarkModal';
import CrackedHashesPanel from '@/app/components/CrackedHashesPanel';
import HashInputForm from '@/app/components/HashInputForm';
import PotfileModal from '@/app/components/PotfileModal';
import TabBar from '@/app/components/TabBar';
import YoinkHashesModal from '@/app/components/YoinkHashesModal';
import useConnection from '@/hooks/useConnection';
import useHashManagement from '@/hooks/useHashManagement';
import { Job } from '@/types/job';

const APP_TABS = [
  { label: 'Hash Cracker', href: '/cracker' },
  { label: 'Credential Vault', href: '/vault' },
];
const PENDING_CRACKER_TRANSFER_KEY = 'pendingCrackerVaultTransfer';

interface PendingCrackerVaultTransfer {
  hashes: string[];
  hashType: number;
}

function parsePendingCrackerTransfer(raw: string): PendingCrackerVaultTransfer | null {
  const parsed = JSON.parse(raw) as {
    hashes?: unknown;
    hashType?: unknown;
  };

  if (parsed.hashType == null) return null;

  const hashType = Number(parsed.hashType);
  if (!Number.isFinite(hashType)) return null;

  const hashes = Array.isArray(parsed.hashes)
    ? parsed.hashes.map(hash => String(hash ?? '').trim()).filter(Boolean)
    : [];
  if (hashes.length === 0) return null;

  return {
    hashes,
    hashType,
  };
}

export default function CrackerPage() {
  const [expandedJob, setExpandedJob] = useState<Job | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashType, setHashType] = useState<number>(0);
  const [isPotfileModalOpen, setIsPotfileModalOpen] = useState(false);
  const [isYoinkHashesModalOpen, setIsYoinkHashesModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  const { connectedStatus, jobs, crackedHashes, liveViewingEnabled, toggleLiveViewing } =
    useConnection();

  const { copyAllHashesToInput, copyNonCrackedHashesToInput } = useHashManagement({
    crackedHashes,
    setHashInput,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_CRACKER_TRANSFER_KEY);
      if (raw == null) return;

      const payload = parsePendingCrackerTransfer(raw);
      if (payload == null) return;

      setHashType(payload.hashType);
      setHashInput(payload.hashes.join('\n'));
    } catch {
      // Ignore malformed transfer payloads.
    } finally {
      localStorage.removeItem(PENDING_CRACKER_TRANSFER_KEY);
    }
  }, []);

  return (
    <main className="px-4 py-8 min-h-screen flex flex-col">
      <div className="container mx-auto max-w-4xl space-y-8">
        <AppHeader
          connectedStatus={connectedStatus as 'connected' | 'disconnected'}
          liveViewingEnabled={liveViewingEnabled}
          toggleLiveViewing={toggleLiveViewing}
        />

        <TabBar activePath="/cracker" tabs={APP_TABS} />

        <HashInputForm
          hashInput={hashInput}
          hashType={hashType}
          setHashType={setHashType}
          setHashInput={setHashInput}
          openYoinkModal={() => setIsYoinkHashesModalOpen(true)}
          openBenchmarkModal={() => setIsBenchmarkModalOpen(true)}
          onCrackingStart={() => setHashInput('')}
        />

        <CrackedHashesPanel
          crackedHashes={crackedHashes}
          onViewPotfile={() => setIsPotfileModalOpen(true)}
        />

        <ActiveJobsPanel
          jobs={jobs}
          crackedHashes={crackedHashes}
          expandedJob={expandedJob}
          setExpandedJob={setExpandedJob}
          copyAllHashesToInput={copyAllHashesToInput}
          copyNonCrackedHashesToInput={copyNonCrackedHashesToInput}
        />
      </div>

      {isPotfileModalOpen && <PotfileModal onClose={() => setIsPotfileModalOpen(false)} />}
      <YoinkHashesModal
        isOpen={isYoinkHashesModalOpen}
        onClose={() => setIsYoinkHashesModalOpen(false)}
        onUseHashes={(hashes, hashTypeId) => {
          setHashInput(prev => (prev ? `${prev}\n${hashes}` : hashes));
          setHashType(hashTypeId);
        }}
      />
      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
      />
    </main>
  );
}
