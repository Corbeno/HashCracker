import { memo, useState } from 'react';

import ShowMoreButton from '@/components/ui/ShowMoreButton';
import { normalizeHashForType } from '@/utils/hashNormalization';

interface JobHashListProps {
  jobId: string;
  hashes: string[];
  crackedByHash?: Map<string, string>;
  hashTypeId: number;
}

const MAX_VISIBLE_HASHES = 15;

function JobHashList({ jobId, hashes, crackedByHash, hashTypeId }: JobHashListProps) {
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
        const password = crackedByHash?.get(normalizeHashForType(hashTypeId, hash));

        return (
          <div
            key={`${hash}-${i}`}
            className={`break-all py-1 ${password ? 'text-green-400' : 'text-gray-400'}`}
            data-testid="job-hash"
          >
            {hash}
            {password && (
              <span>
                <span className="text-gray-500 mx-1">-&gt;</span>
                <span className="text-white">{password}</span>
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

export default memo(JobHashList);
