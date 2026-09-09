'use client';

import { useState } from 'react';

import ActiveJobsPanel from '@/app/cracker/_components/ActiveJobsPanel';
import BenchmarkModal from '@/app/cracker/_components/BenchmarkModal';
import HashInputForm from '@/app/cracker/_components/HashInputForm';
import YoinkHashesModal from '@/app/cracker/_components/yoink/YoinkHashesModal';
import AppHeader from '@/components/app-shell/AppHeader';
import TabBar from '@/components/app-shell/TabBar';
import { useConnection } from '@/contexts/ConnectionContext';
import useHashManagement from '@/hooks/useHashManagement';
import { Job } from '@/types/job';

const APP_TABS = [
  { label: 'Hash Cracker', href: '/cracker' },
  { label: 'Credential Vault', href: '/vault' },
];

export default function CrackerPage() {
  const [expandedJob, setExpandedJob] = useState<Job | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashType, setHashType] = useState<number>(0);
  const [isYoinkHashesModalOpen, setIsYoinkHashesModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  const { connectedStatus, jobs, crackedHashes, liveViewingEnabled, toggleLiveViewing } =
    useConnection();

  const { copyAllHashesToInput, copyNonCrackedHashesToInput } = useHashManagement({
    crackedHashes,
    setHashInput,
  });

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

        <ActiveJobsPanel
          jobs={jobs}
          crackedHashes={crackedHashes}
          expandedJob={expandedJob}
          setExpandedJob={setExpandedJob}
          copyAllHashesToInput={copyAllHashesToInput}
          copyNonCrackedHashesToInput={copyNonCrackedHashesToInput}
        />
      </div>

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
