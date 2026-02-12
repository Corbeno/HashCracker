'use client';

import { CrackJobDraft } from './grid/selection';

import SearchableDropdown, { DropdownOption } from '@/components/ui/searchable-dropdown';

interface CrackSelectedModalProps {
  isOpen: boolean;
  attackMode: string;
  attackModeOptions: DropdownOption[];
  crackJobDrafts: CrackJobDraft[];
  hashTypeNameById: Map<number, string>;
  isQueueing: boolean;
  queueError: string | null;
  queueStatus: string | null;
  onAttackModeChange: (mode: string) => void;
  onClose: () => void;
  onQueueJobs: () => Promise<void>;
}

export default function CrackSelectedModal({
  isOpen,
  attackMode,
  attackModeOptions,
  crackJobDrafts,
  hashTypeNameById,
  isQueueing,
  queueError,
  queueStatus,
  onAttackModeChange,
  onClose,
  onQueueJobs,
}: CrackSelectedModalProps) {
  if (!isOpen) return null;

  const totalRows = crackJobDrafts.reduce((sum, job) => sum + job.rowCount, 0);
  const totalUniqueHashes = crackJobDrafts.reduce((sum, job) => sum + job.hashes.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Queue Crack Jobs</h2>
            <p className="text-sm text-gray-300 mt-1">
              Review grouped jobs, choose one attack mode, then queue everything in Hash Cracker.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <SearchableDropdown
            options={attackModeOptions}
            value={attackMode}
            onChange={option => onAttackModeChange(String(option.id))}
            label="Attack Mode (applies to all jobs)"
            placeholder="Select attack mode..."
            searchPlaceholder="Search attack mode..."
          />

          <div className="bg-gray-900/40 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200">
            Jobs: {crackJobDrafts.length} | Rows: {totalRows} | Unique hashes: {totalUniqueHashes}
          </div>

          <div className="max-h-72 overflow-y-auto border border-gray-700 rounded-md divide-y divide-gray-700">
            {crackJobDrafts.map(job => (
              <div key={job.hashType} className="p-3 bg-gray-900/30">
                <div className="text-sm text-white font-medium">
                  {hashTypeNameById.get(job.hashType) ?? `${job.hashType}`}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {job.rowCount} selected row{job.rowCount === 1 ? '' : 's'} | {job.hashes.length}{' '}
                  unique hash{job.hashes.length === 1 ? '' : 'es'}
                </div>
              </div>
            ))}
          </div>

          {queueError && (
            <div className="bg-red-900/30 border border-red-700 p-3 rounded-md text-sm text-red-200">
              {queueError}
            </div>
          )}

          {queueStatus && (
            <div className="bg-teal-900/20 border border-teal-700/60 p-3 rounded-md text-sm text-teal-100">
              {queueStatus}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isQueueing}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onQueueJobs}
            disabled={crackJobDrafts.length === 0 || isQueueing}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isQueueing ? 'Queueing...' : 'Queue Jobs'}
          </button>
        </div>
      </div>
    </div>
  );
}
