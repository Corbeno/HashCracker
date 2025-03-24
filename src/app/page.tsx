'use client';

import { useState } from 'react';

import ActiveJobsPanel from '@/app/components/ActiveJobsPanel';
import AppHeader from '@/app/components/AppHeader';
import CrackedHashesPanel from '@/app/components/CrackedHashesPanel';
import HashInputForm from '@/app/components/HashInputForm';
import PotfileModal from '@/app/components/PotfileModal';
import YoinkHashesModal from '@/app/components/YoinkHashesModal';
import useConnection from '@/hooks/useConnection';
import { HashJob } from '@/utils/jobQueue';

export default function Home() {
  const [expandedJob, setExpandedJob] = useState<HashJob | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashType, setHashType] = useState<number>(0);
  const [isPotfileModalOpen, setIsPotfileModalOpen] = useState(false);
  const [isYoinkHashesModalOpen, setIsYoinkHashesModalOpen] = useState(false);

  // This custom hook handles all data collection on initial load and live updates
  const { connectedStatus, jobs, crackedHashes, liveViewingEnabled, toggleLiveViewing } =
    useConnection();

  // Copy all uncracked hashes from a job to the input field (replacing current input)
  const copyAllHashesToInput = (hashes: string[]) => {
    // Filter out hashes that have been cracked
    const nonCrackedHashes = hashes.filter(
      hash => !crackedHashes.some(crackedHash => crackedHash.hash === hash)
    );
    setHashInput(nonCrackedHashes.join('\n'));
  };

  // Append only non-cracked hashes from a job to the input field
  const copyNonCrackedHashesToInput = (hashes: string[]) => {
    // Filter out hashes that have been cracked
    const nonCrackedHashes = hashes.filter(
      hash => !crackedHashes.some(crackedHash => crackedHash.hash === hash)
    );

    // Append to existing input
    setHashInput(prev => {
      // If there's already content, add a newline before appending
      return prev ? `${prev}\n${nonCrackedHashes.join('\n')}` : nonCrackedHashes.join('\n');
    });
  };

  const openPotfileModal = () => {
    setIsPotfileModalOpen(true);
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-8 max-w-4xl min-h-screen">
      <AppHeader
        connectedStatus={connectedStatus}
        liveViewingEnabled={liveViewingEnabled}
        toggleLiveViewing={toggleLiveViewing}
      />

      <HashInputForm
        hashInput={hashInput}
        hashType={hashType}
        setHashType={setHashType}
        setHashInput={setHashInput}
        openYoinkModal={() => setIsYoinkHashesModalOpen(true)}
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
    </main>
  );
}
