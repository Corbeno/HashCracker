'use client';

import Image from 'next/image';
import { useState } from 'react';

import DebugPanel from '@/app/components/DebugPanel';
import JobProgressBar from '@/app/components/JobProgressBar';
import ShowMoreButton from '@/app/components/ShowMoreButton';
import { compareHashes } from '@/utils/clientHashUtils';
import { CrackedHash } from '@/utils/hashUtils';
import { HashJob } from '@/utils/jobQueue';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'running':
      return 'text-blue-400';
    case 'queued':
      return 'text-yellow-400';
    case 'cancelled':
      return 'text-gray-400';
    case 'exhausted':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'running':
      return 'Running';
    case 'pending':
      return 'Queued';
    case 'cancelled':
      return 'Cancelled';
    case 'exhausted':
      return 'Exhausted';
    default:
      return status;
  }
};

interface ActiveJobsPanelProps {
  jobs: HashJob[];
  crackedHashes: CrackedHash[];
  expandedJob: HashJob | null;
  setExpandedJob: (job: HashJob | null) => void;
  copyAllHashesToInput: (hashes: string[]) => void;
  copyNonCrackedHashesToInput: (hashes: string[]) => void;
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
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set());
  
  const MAX_VISIBLE_HASHES = 15;

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
  
  const toggleHashesExpansion = (jobId: string) => {
    setExpandedHashes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700">
      <h2 className="text-2xl font-bold mb-4">Active Jobs</h2>
      {error && <span className="text-red-400 ml-2">{error}</span>}
      <div className="space-y-4">
        {jobs.map(job => (
          <div
            key={job.id}
            className="p-4 rounded-xl bg-gray-900/50 border border-gray-700 relative overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-medium ${getStatusColor(job.status)}`}>
                  {getStatusText(job.status)}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(job.startTime).toLocaleTimeString()}
                </span>
                {/* Copy buttons with tooltips */}
                <button
                  onClick={() => copyAllHashesToInput(job.hashes)}
                  className="text-blue-400 hover:text-blue-300 transition-colors p-1.5 rounded-md hover:bg-gray-700/50"
                  title="Replace input with all uncracked hashes"
                >
                  <Image
                    src="/icons/replace.svg"
                    alt="Replace input with all uncracked hashes"
                    width={16}
                    height={16}
                  />
                </button>
                <button
                  onClick={() => copyNonCrackedHashesToInput(job.hashes)}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors p-1.5 rounded-md hover:bg-gray-700/50"
                  title="Append all non-cracked hashes to input"
                >
                  <Image
                    src="/icons/append.svg"
                    alt="Append non-cracked hashes"
                    width={16}
                    height={16}
                  />
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
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="font-mono text-sm space-y-1 mt-3">
              {job.hashes
                .slice(0, expandedHashes.has(job.id) ? undefined : MAX_VISIBLE_HASHES)
                .map((hash, i) => {
                  // Use the job's isCaseSensitive property if available, otherwise default to true
                  const isCaseSensitive = job.isCaseSensitive !== undefined ? job.isCaseSensitive : true;
                  
                  // Check if this hash has been cracked, considering case sensitivity
                  const crackedHash = crackedHashes.find(ch => 
                    compareHashes(ch.hash, hash, isCaseSensitive)
                  );
                  
                  return (
                    <div
                      key={i}
                      className={`break-all py-1 ${crackedHash ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      {hash}
                      {crackedHash && (
                        <span>
                          <span className="text-gray-500 mx-1">-&gt;</span>
                          <span className="text-white">{crackedHash.password}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              
              {job.hashes.length > MAX_VISIBLE_HASHES && (
                <ShowMoreButton
                  expanded={expandedHashes.has(job.id)}
                  toggleExpanded={() => toggleHashesExpansion(job.id)}
                  totalCount={job.hashes.length}
                  visibleCount={expandedHashes.has(job.id) ? job.hashes.length : MAX_VISIBLE_HASHES}
                  itemName="hashes"
                />
              )}
            </div>

            {expandedJob?.id === job.id && job.debugInfo && <DebugPanel job={job} />}

            <button
              onClick={() => setExpandedJob(expandedJob?.id === job.id ? null : job)}
              className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
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
