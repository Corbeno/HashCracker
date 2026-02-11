import { useState } from 'react';

import ShowMoreButton from '@/components/ui/ShowMoreButton';
import { compareHashes } from '@/utils/clientHashUtils';
import { CrackedHash } from '@/utils/hashUtils';

interface JobHashListProps {
  jobId: string;
  hashes: string[];
  crackedHashes: CrackedHash[];
}

const MAX_VISIBLE_HASHES = 15;

export default function JobHashList({ jobId, hashes, crackedHashes }: JobHashListProps) {
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set());

  const isExpanded = expandedHashes.has(jobId);
  const visibleHashes = hashes.slice(0, isExpanded ? undefined : MAX_VISIBLE_HASHES);

  const toggleHashesExpansion = () => {
    setExpandedHashes(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  return (
    <div className="font-mono text-sm space-y-1 mt-3">
      {visibleHashes.map((hash, i) => {
        const crackedHash = crackedHashes.find(ch => compareHashes(ch.hash, hash, true));

        return (
          <div
            key={`${hash}-${i}`}
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

      {hashes.length > MAX_VISIBLE_HASHES && (
        <ShowMoreButton
          expanded={isExpanded}
          toggleExpanded={toggleHashesExpansion}
          totalCount={hashes.length}
          visibleCount={isExpanded ? hashes.length : MAX_VISIBLE_HASHES}
          itemName="hashes"
        />
      )}
    </div>
  );
}
