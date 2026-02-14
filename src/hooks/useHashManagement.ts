import { useCallback } from 'react';

import { HashVaultEntry } from '@/types/hashVault';
import { normalizeHashForType } from '@/utils/hashNormalization';

interface UseHashManagementProps {
  crackedHashes: HashVaultEntry[];
  setHashInput: (value: string | ((prev: string) => string)) => void;
}

export default function useHashManagement({ crackedHashes, setHashInput }: UseHashManagementProps) {
  // Copy all uncracked hashes from a job to the input field (replacing current input)
  const copyAllHashesToInput = useCallback(
    (hashes: string[], hashTypeId: number) => {
      const crackedSet = new Set(
        crackedHashes
          .filter(entry => entry.hashType === hashTypeId)
          .map(entry => normalizeHashForType(hashTypeId, entry.hash))
          .filter(Boolean)
      );

      const nonCrackedHashes = hashes.filter(hash => {
        const key = normalizeHashForType(hashTypeId, hash);
        return !key || !crackedSet.has(key);
      });
      setHashInput(nonCrackedHashes.join('\n'));
    },
    [crackedHashes, setHashInput]
  );

  // Append only non-cracked hashes from a job to the input field
  const copyNonCrackedHashesToInput = useCallback(
    (hashes: string[], hashTypeId: number) => {
      const crackedSet = new Set(
        crackedHashes
          .filter(entry => entry.hashType === hashTypeId)
          .map(entry => normalizeHashForType(hashTypeId, entry.hash))
          .filter(Boolean)
      );

      const nonCrackedHashes = hashes.filter(hash => {
        const key = normalizeHashForType(hashTypeId, hash);
        return !key || !crackedSet.has(key);
      });

      // Append to existing input
      setHashInput(prev => {
        // If there's already content, add a newline before appending
        return prev ? `${prev}\n${nonCrackedHashes.join('\n')}` : nonCrackedHashes.join('\n');
      });
    },
    [crackedHashes, setHashInput]
  );

  return {
    copyAllHashesToInput,
    copyNonCrackedHashesToInput,
  };
}
