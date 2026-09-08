'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import JobHashList from './active-jobs/JobHashList';
import { getStatusColor, getStatusText } from './active-jobs/status';
import DebugPanel from './DebugPanel';
import JobProgressBar from './JobProgressBar';

import { HashVaultEntry } from '@/types/hashVault';
import { Job } from '@/types/job';
import { normalizeHashForType } from '@/utils/hashNormalization';

interface ActiveJobsPanelProps {
  jobs: Job[];
  crackedHashes: HashVaultEntry[];
  expandedJob: Job | null;
  setExpandedJob: (job: Job | null) => void;
  copyAllHashesToInput: (hashes: string[], hashTypeId: number) => void;
  copyNonCrackedHashesToInput: (hashes: string[], hashTypeId: number) => void;
}

export default function ActiveJobsPanel({
  jobs,
  crackedHashes,
  expandedJob,
  setExpandedJob,
  copyAllHashesToInput,
  copyNonCrackedHashesToInput,
}: ActiveJobsPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const crackedByType = useMemo(() => {
    const byType = new Map<number, Map<string, string>>();
    for (const entry of crackedHashes) {
      const key = normalizeHashForType(entry.hashType, entry.hash);
      if (!key) continue;
      let byHash = byType.get(entry.hashType);
      if (!byHash) {
        byHash = new Map<string, string>();
        byType.set(entry.hashType, byHash);
      }
      if (!byHash.has(key)) byHash.set(key, entry.password);
    }
    return byType;
  }, [crackedHashes]);

  const copyJobText = async (job: Job) => {
    const crackedByHash = crackedByType.get(job.type.id);
    const text = job.hashes
      .map(hash => {
        const password = crackedByHash?.get(normalizeHashForType(job.type.id, hash));
        return password == null ? hash : `${hash}->${password}`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error copying job:', error);
      setError('Failed to copy job. See console for details.');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/crack?jobId=${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.success) {
        setError(`Failed to cancel job: ${data.error}`);
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      setError('Failed to cancel job. See console for details.');
    }
  };

  return (
    <div
      className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700"
      data-testid="active-jobs-panel"
    >
      <h2 className="text-2xl font-bold mb-4">Active Jobs</h2>
      {error && <span className="text-red-400 ml-2">{error}</span>}
      <div className="space-y-4">
        {jobs.map(job => (
          <div
            key={job.id}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-700 relative overflow-hidden"
            data-testid="job-card"
          >
            <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {job.title && (
                  <>
                    <h3 className="text-lg font-semibold text-white" data-testid="job-title">
                      {job.title}
                    </h3>
                    <span className="text-gray-600" aria-hidden="true">
                      |
                    </span>
                  </>
                )}
                <span
                  className={`font-medium ${getStatusColor(job.status)}`}
                  data-testid="job-status"
                >
                  {getStatusText(job.status)}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(job.startTime).toLocaleTimeString()}
                </span>
                {/* Copy buttons with tooltips */}
                <button
                  onClick={() => copyAllHashesToInput(job.hashes, job.type.id)}
                  className="text-blue-400 hover:text-blue-300 transition-colors p-1.5 rounded-md hover:bg-gray-700/50"
                  title="Replace input with all uncracked hashes"
                  aria-label="Replace input with all uncracked hashes"
                  data-testid="job-replace-input"
                >
                  <Image
                    src="/icons/replace.svg"
                    alt="Replace input with all uncracked hashes"
                    width={16}
                    height={16}
                  />
                </button>
                <button
                  onClick={() => copyNonCrackedHashesToInput(job.hashes, job.type.id)}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors p-1.5 rounded-md hover:bg-gray-700/50"
                  title="Append all non-cracked hashes to input"
                  aria-label="Append all non-cracked hashes to input"
                  data-testid="job-append-input"
                >
                  <Image
                    src="/icons/append.svg"
                    alt="Append non-cracked hashes"
                    width={16}
                    height={16}
                  />
                </button>
                <button
                  onClick={() => void copyJobText(job)}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-gray-700/50"
                  title="Copy job hashes"
                  aria-label="Copy job hashes"
                  data-testid="job-copy"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">
                  Type: {job.type.name}
                </span>
                <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">
                  Mode: {job.mode.name}
                </span>
                {(job.status === 'running' || job.status === 'pending') && (
                  <button
                    onClick={() => handleCancelJob(job.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    data-testid="job-cancel"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <JobHashList
              jobId={job.id}
              hashes={job.hashes}
              crackedByHash={crackedByType.get(job.type.id)}
              hashTypeId={job.type.id}
            />

            {expandedJob?.id === job.id && job.debugInfo && <DebugPanel job={job} />}

            <button
              onClick={() => setExpandedJob(expandedJob?.id === job.id ? null : job)}
              className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
              data-testid="job-toggle-details"
            >
              {expandedJob?.id === job.id ? 'Hide Details' : 'Show Details'}
            </button>
            {/* Progress bar at the bottom */}
            {job.debugInfo?.statusJson?.progress && job.status === 'running' && (
              <JobProgressBar
                progress={
                  [job.debugInfo.statusJson.progress[0], job.debugInfo.statusJson.progress[1]] as [
                    number,
                    number,
                  ]
                }
                estimatedStopTime={job.debugInfo.statusJson.estimated_stop}
              />
            )}
          </div>
        ))}
        {jobs.length === 0 && <div className="text-center text-gray-500 py-4">No active jobs</div>}
      </div>
    </div>
  );
}
