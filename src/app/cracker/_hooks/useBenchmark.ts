import { useCallback, useState } from 'react';

export interface BenchmarkResult {
  hashType: number;
  hashName: string;
  speed: string;
  speedPerHash: number;
  unit: string;
}

interface UseBenchmarkResult {
  results: BenchmarkResult[];
  isLoading: boolean;
  error: string | null;
  runBenchmark: (selectedHashType: number | null) => Promise<void>;
}

export default function useBenchmark(): UseBenchmarkResult {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = useCallback(async (selectedHashType: number | null) => {
    setIsLoading(true);
    setError(null);

    try {
      const url =
        selectedHashType !== null
          ? `/api/benchmark?hashType=${selectedHashType}`
          : '/api/benchmark';

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run benchmark');
      }

      setResults(data.results);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    results,
    isLoading,
    error,
    runBenchmark,
  };
}
