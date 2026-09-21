'use client';

import { useEffect, useState } from 'react';

import config from '@/config';
import { HashVaultEntry } from '@/types/hashVault';
import { copyTextToClipboard } from '@/utils/clipboard';

interface SessionCrackedHashesModalProps {
  onClose: () => void;
}

export default function SessionCrackedHashesModal({ onClose }: SessionCrackedHashesModalProps) {
  const [crackedHashes, setCrackedHashes] = useState<HashVaultEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCrackedHashes() {
      try {
        const response = await fetch('/api/state', { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = (await response.json()) as { crackedHashes?: HashVaultEntry[] };
        setCrackedHashes(data.crackedHashes ?? []);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return;
        console.error('Error fetching cracked hashes:', fetchError);
        setError('Failed to load cracked hashes.');
      }
    }

    void fetchCrackedHashes();
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      data-testid="session-cracked-hashes-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-cracked-hashes-title"
    >
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 id="session-cracked-hashes-title" className="text-xl font-bold">
            Cracked Hashes
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
            data-testid="session-cracked-hashes-close"
          >
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
        <div className="p-4 overflow-auto flex-grow">
          {error ? (
            <div className="font-mono text-sm bg-gray-900 p-4 rounded-lg text-red-300">{error}</div>
          ) : crackedHashes === null ? (
            <div className="font-mono text-sm bg-gray-900 p-4 rounded-lg text-gray-400">
              Loading...
            </div>
          ) : crackedHashes.length === 0 ? (
            <div className="font-mono text-sm bg-gray-900 p-4 rounded-lg text-gray-400">
              No cracked hashes yet
            </div>
          ) : (
            <table className="w-full text-sm bg-gray-900 rounded-lg overflow-hidden">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Hash</th>
                  <th className="px-3 py-2">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800" data-testid="cracked-hashes-tbody">
                {crackedHashes.map(entry => {
                  const rowKey = `${entry.hashType}:${entry.hash}`;
                  const typeName =
                    config.hashcat.hashTypes[String(entry.hashType)]?.name ??
                    `Hash type ${entry.hashType}`;
                  return (
                    <tr key={rowKey} className="hover:bg-gray-800/40">
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                        {entry.hashType} - {typeName}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-300 break-all">{entry.hash}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void copyTextToClipboard(entry.password)}
                          className="font-mono text-white hover:text-blue-200 transition-colors"
                          title="Copy password"
                        >
                          {entry.password}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
