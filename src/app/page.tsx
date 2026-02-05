'use client';

import { useState } from 'react';

import ActiveJobsPanel from '@/app/components/ActiveJobsPanel';
import AppHeader from '@/app/components/AppHeader';
import BenchmarkModal from '@/app/components/BenchmarkModal';
import CrackedHashesPanel from '@/app/components/CrackedHashesPanel';
import EnhancedImportModal from '@/app/components/EnhancedImportModal';
import HashInputForm from '@/app/components/HashInputForm';
import PotfileModal from '@/app/components/PotfileModal';
import TeamVaultPanel from '@/app/components/TeamVaultPanel';
import YoinkHashesModal from '@/app/components/YoinkHashesModal';
import useConnection from '@/hooks/useConnection';
import useHashManagement from '@/hooks/useHashManagement';
import { Job } from '@/types/job';

export default function Home() {
  const [expandedJob, setExpandedJob] = useState<Job | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashType, setHashType] = useState<number>(0);
  const [isPotfileModalOpen, setIsPotfileModalOpen] = useState(false);
  const [isYoinkHashesModalOpen, setIsYoinkHashesModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [isCrackModalOpen, setIsCrackModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRefreshTrigger, setImportRefreshTrigger] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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

  // Handle cracking hashes from the team vault
  const handleCrackFromVault = (hashes: string[], hashTypeId: number) => {
    // Set the hashes in the input field
    setHashInput(hashes.join('\n'));
    // Set the hash type from the vault
    setHashType(hashTypeId);
    // Open crack modal
    setIsCrackModalOpen(true);
  };

  // Handle direct hash cracking from modal
  const handleDirectCrack = () => {
    setIsCrackModalOpen(true);
  };

  return (
    <main className="mx-auto px-4 lg:px-8 py-6 space-y-6 min-h-screen max-w-5xl">
      <AppHeader
        connectedStatus={connectedStatus as 'connected' | 'disconnected'}
        liveViewingEnabled={liveViewingEnabled}
        toggleLiveViewing={toggleLiveViewing}
      />

      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white pl-2">Team Vault</h1>
          <span className="text-gray-500">|</span>
          <span className="text-sm text-gray-400">CDC Credential Management</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <a
            href="/settings"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </a>

          {/* Direct Crack Button */}
          <button
            onClick={handleDirectCrack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Crack Hashes
          </button>
        </div>
      </div>

      {/* Main Content - Single Column Layout */}
      <div className="space-y-6">
        {/* Team Vault with set height and scrolling */}
        <div className="h-[600px] overflow-hidden">
          <div className="h-full overflow-y-auto">
            <TeamVaultPanel
              onCrackHashes={handleCrackFromVault}
              onTeamSelect={setSelectedTeamId}
              onImportClick={() => setIsImportModalOpen(true)}
              refreshTrigger={importRefreshTrigger}
            />
          </div>
        </div>

        {/* Cracked Hashes Section */}
        <CrackedHashesPanel crackedHashes={crackedHashes} onViewPotfile={openPotfileModal} />

        {/* Active Jobs Section */}
        <ActiveJobsPanel
          jobs={jobs}
          crackedHashes={crackedHashes}
          expandedJob={expandedJob}
          setExpandedJob={setExpandedJob}
          copyAllHashesToInput={copyAllHashesToInput}
          copyNonCrackedHashesToInput={copyNonCrackedHashesToInput}
        />
      </div>

      {/* Crack Modal */}
      {isCrackModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Crack Hashes</h2>
              <button
                onClick={() => setIsCrackModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <HashInputForm
                hashInput={hashInput}
                hashType={hashType}
                setHashType={setHashType}
                setHashInput={setHashInput}
                openYoinkModal={() => setIsYoinkHashesModalOpen(true)}
                openBenchmarkModal={openBenchmarkModal}
                onCrackingStart={() => {
                  setHashInput('');
                  setIsCrackModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isPotfileModalOpen && <PotfileModal onClose={() => setIsPotfileModalOpen(false)} />}
      <YoinkHashesModal
        isOpen={isYoinkHashesModalOpen}
        onClose={() => setIsYoinkHashesModalOpen(false)}
        onUseHashes={(hashes, hashTypeId) => {
          setHashInput(prev => (prev ? `${prev}\n${hashes}` : hashes));
          setHashType(hashTypeId);
          // Auto-open the Crack Hashes modal with the uncracked hashes
          setIsCrackModalOpen(true);
        }}
      />
      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
      />
      <EnhancedImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        teamId={selectedTeamId || ''}
        onImportComplete={() => {
          // Trigger refresh of team vault
          setImportRefreshTrigger(prev => prev + 1);
          setIsImportModalOpen(false);
        }}
      />
    </main>
  );
}
