'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import SearchableDropdown, { DropdownOption } from './SearchableDropdown';

import config from '@/config';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BenchmarkResult {
  hashType: number;
  hashName: string;
  speed: string;
  speedPerHash: number;
  unit: string;
}

export default function BenchmarkModal({ isOpen, onClose }: BenchmarkModalProps) {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [selectedHashType, setSelectedHashType] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hashTypeOptions, setHashTypeOptions] = useState<DropdownOption[]>([]);

  // Populate hash type options
  useEffect(() => {
    if (isOpen) {
      const options = Object.entries(config.hashcat.hashTypes).map(([id, hashType]) => ({
        id: parseInt(id),
        name: `${id} - ${hashType.name}`,
        description: hashType.category || 'Other',
      }));
      setHashTypeOptions(options);
    }
  }, [isOpen]);

  const handleHashTypeChange = (option: DropdownOption) => {
    setSelectedHashType(option.id as number);
  };

  const runBenchmark = async () => {
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
  };

  // Format a large number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Hashcat Benchmark</h2>
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

        <div className="p-4">
          <div className="mb-4 flex items-end gap-4">
            <div className="flex-1">
              <SearchableDropdown
                options={hashTypeOptions}
                value={selectedHashType}
                onChange={handleHashTypeChange}
                label="Hash Type (optional)"
                placeholder="Select hash type or benchmark all types..."
                searchPlaceholder="Search hash type by name or ID..."
              />
            </div>
            <button
              onClick={runBenchmark}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-10"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Running...
                </>
              ) : (
                <>
                  <Image src="/icons/speed.svg" alt="Run Benchmark" width={16} height={16} />
                  Run Benchmark
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 p-3 rounded-md text-red-300 mb-4">
              {error}
            </div>
          )}

          <div className="bg-gray-700/50 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/70">
                <tr>
                  <th className="px-6 py-3">Hash Type</th>
                  <th className="px-6 py-3">Speed</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr className="border-b border-gray-700">
                    <td colSpan={2} className="px-6 py-4 text-center text-gray-400">
                      {isLoading ? 'Running benchmark...' : 'Run a benchmark to see results'}
                    </td>
                  </tr>
                ) : (
                  results.map((result, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-700 ${
                        index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'
                      } hover:bg-gray-700/30`}
                    >
                      <td className="px-6 py-4 font-medium">
                        <div>{result.hashName}</div>
                        <div className="text-xs text-gray-400">Type {result.hashType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-yellow-400">{result.speed}</div>
                        <div className="text-xs text-gray-400">
                          {formatNumber(Math.round(result.speedPerHash))} hashes/second
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
