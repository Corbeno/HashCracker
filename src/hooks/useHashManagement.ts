import { useCallback } from 'react';

import { CrackedHash } from '@/utils/hashUtils';

interface UseHashManagementProps {
  crackedHashes: CrackedHash[];
  setHashInput: (value: string | ((prev: string) => string)) => void;
}

export default function useHashManagement({ crackedHashes, setHashInput }: UseHashManagementProps) {
  // Copy all uncracked hashes from a job to the input field (replacing current input)
  const copyAllHashesToInput = useCallback(
    (hashes: string[]) => {
      // Filter out hashes that have been cracked
      const nonCrackedHashes = hashes.filter(
        hash => !crackedHashes.some(crackedHash => crackedHash.hash === hash)
      );
      setHashInput(nonCrackedHashes.join('\n'));
    },
    [crackedHashes, setHashInput]
  );

  // Append only non-cracked hashes from a job to the input field
  const copyNonCrackedHashesToInput = useCallback(
    (hashes: string[]) => {
      // Filter out hashes that have been cracked
      const nonCrackedHashes = hashes.filter(
        hash => !crackedHashes.some(crackedHash => crackedHash.hash === hash)
      );

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
