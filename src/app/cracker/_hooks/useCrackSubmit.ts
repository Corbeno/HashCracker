import { useCallback, useState } from 'react';

interface UseCrackSubmitArgs {
  onCrackingStart: () => void;
}

interface UseCrackSubmitResult {
  error: string | null;
  submit: (hashInput: string, hashType: number, attackMode: string) => Promise<void>;
}

export default function useCrackSubmit({
  onCrackingStart,
}: UseCrackSubmitArgs): UseCrackSubmitResult {
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (hashInput: string, hashType: number, attackMode: string) => {
      try {
        if (!hashInput.trim()) {
          setError('Please enter at least one hash');
          return;
        }

        const hashes = hashInput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        const response = await fetch('/api/crack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hashes,
            type: hashType,
            mode: attackMode,
          }),
        });

        const data = await response.json();
        if (data.error) {
          setError(`Failed to start cracking: ${data.error}`);
          return;
        }

        setError(null);
        onCrackingStart();
      } catch (error) {
        console.error('Error submitting crack request:', error);
        setError('Failed to submit request. See console for details.');
      }
    },
    [onCrackingStart]
  );

  return {
    error,
    submit,
  };
}
