'use client';

import { useEffect, useRef, useState } from 'react';

import ShowMoreButton from '@/components/ui/ShowMoreButton';
import config from '@/config';
import { HashVaultEntry } from '@/types/hashVault';

interface CrackedHashesPanelProps {
  crackedHashes: HashVaultEntry[];
  onViewPotfile: () => void;
}

export default function CrackedHashesPanel({
  crackedHashes,
  onViewPotfile,
}: CrackedHashesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const MAX_VISIBLE_HASHES = 15;

  const visibleHashes = expanded ? crackedHashes : crackedHashes.slice(0, MAX_VISIBLE_HASHES);

  const copyPassword = (key: string, password: string) => {
    void navigator.clipboard.writeText(password);
    setCopiedKey(key);

    if (toastTimeoutRef.current != null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setCopiedKey(null);
      toastTimeoutRef.current = null;
    }, 1100);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current != null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Cracked Hashes</h2>
        <button
          onClick={onViewPotfile}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          View Potfile
        </button>
      </div>
      <div className="overflow-auto">
        {crackedHashes.length === 0 ? (
          <div className="font-mono text-sm whitespace-pre-wrap break-all bg-gray-900 p-4 rounded-lg text-gray-400">
            No cracked hashes yet
          </div>
        ) : (
          <table className="w-full text-sm bg-gray-900 rounded-lg overflow-hidden">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-400 bg-gray-900">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Hash</th>
                <th className="px-3 py-2">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {visibleHashes.map(entry => {
                const typeName =
                  config.hashcat.hashTypes[String(entry.hashType)]?.name ??
                  `Hash type ${entry.hashType}`;
                const rowKey = `${entry.hashType}:${entry.hash}`;
                return (
                  <tr key={rowKey} className="hover:bg-gray-800/40">
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                      {entry.hashType} - {typeName}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 break-all">{entry.hash}</td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => copyPassword(rowKey, entry.password)}
                          className="w-full text-left font-mono text-white hover:text-blue-200 transition-colors"
                          title="Copy password"
                        >
                          {entry.password}
                        </button>
                        {copiedKey === rowKey && (
                          <span
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-green-600/90 px-2 py-0.5 text-xs font-sans font-medium text-white shadow-lg"
                            aria-live="polite"
                          >
                            Copied!
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {crackedHashes.length > MAX_VISIBLE_HASHES && (
          <ShowMoreButton
            expanded={expanded}
            toggleExpanded={() => setExpanded(!expanded)}
            totalCount={crackedHashes.length}
            visibleCount={visibleHashes.length}
            itemName="cracked hashes"
          />
        )}
      </div>
    </div>
  );
}
