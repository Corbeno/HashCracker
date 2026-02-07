'use client';

import { useState } from 'react';

import ActiveJobsPanel from '@/app/components/ActiveJobsPanel';
import AppHeader from '@/app/components/AppHeader';
import BenchmarkModal from '@/app/components/BenchmarkModal';
import CrackedHashesPanel from '@/app/components/CrackedHashesPanel';
import CredentialVaultPanel from '@/app/components/CredentialVaultPanel';
import HashInputForm from '@/app/components/HashInputForm';
import PotfileModal from '@/app/components/PotfileModal';
import TabBar from '@/app/components/TabBar';
import YoinkHashesModal from '@/app/components/YoinkHashesModal';
import useConnection from '@/hooks/useConnection';
import useHashManagement from '@/hooks/useHashManagement';
import { Job } from '@/types/job';

const TABS = ['Cracker', 'Credential Vault'];

export default function Home() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [expandedJob, setExpandedJob] = useState<Job | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashType, setHashType] = useState<number>(0);
  const [isPotfileModalOpen, setIsPotfileModalOpen] = useState(false);
  const [isYoinkHashesModalOpen, setIsYoinkHashesModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  // This custom hook handles all data collection on initial load and live updates
  const { connectedStatus, jobs, crackedHashes, liveViewingEnabled, toggleLiveViewing } =
    useConnection();

  // Use the custom hook for hash management
  const { copyAllHashesToInput, copyNonCrackedHashesToInput } = useHashManagement({
    crackedHashes,
    setHashInput,
  });

  const openPotfileModal = () => {
    setIsPotfileModalOpen(true);
  };

  const openBenchmarkModal = () => {
    setIsBenchmarkModalOpen(true);
  };

  return (
    <main className="px-4 py-8 min-h-screen">
      <div className="container mx-auto max-w-4xl space-y-8">
        <AppHeader
          connectedStatus={connectedStatus as 'connected' | 'disconnected'}
          liveViewingEnabled={liveViewingEnabled}
          toggleLiveViewing={toggleLiveViewing}
        />

        <TabBar activeTab={activeTab} tabs={TABS} onTabChange={setActiveTab} />

        {activeTab === 'Cracker' && (
          <>
            <HashInputForm
              hashInput={hashInput}
              hashType={hashType}
              setHashType={setHashType}
              setHashInput={setHashInput}
              openYoinkModal={() => setIsYoinkHashesModalOpen(true)}
              openBenchmarkModal={openBenchmarkModal}
              onCrackingStart={() => setHashInput('')}
            />

            <CrackedHashesPanel crackedHashes={crackedHashes} onViewPotfile={openPotfileModal} />

            <ActiveJobsPanel
              jobs={jobs}
              crackedHashes={crackedHashes}
              expandedJob={expandedJob}
              setExpandedJob={setExpandedJob}
              copyAllHashesToInput={copyAllHashesToInput}
              copyNonCrackedHashesToInput={copyNonCrackedHashesToInput}
            />
          </>
        )}
      </div>

      {activeTab === 'Credential Vault' && (
        <div className="container mx-auto mt-8 max-w-[1800px]">
          <CredentialVaultPanel />
        </div>
      )}

      {/* Modals */}
      {isPotfileModalOpen && <PotfileModal onClose={() => setIsPotfileModalOpen(false)} />}
      <YoinkHashesModal
        isOpen={isYoinkHashesModalOpen}
        onClose={() => setIsYoinkHashesModalOpen(false)}
        onUseHashes={(hashes, hashTypeId) => {
          setHashInput(prev =>
            // If there's already content, add a newline before appending
            prev ? `${prev}\n${hashes}` : hashes
          );
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
