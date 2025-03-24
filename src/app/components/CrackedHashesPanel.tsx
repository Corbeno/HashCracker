'use client';

import React from 'react';

import { CrackedHash } from '@/utils/hashUtils';

interface CrackedHashesPanelProps {
  crackedHashes: CrackedHash[];
  onViewPotfile: () => void;
}

export default function CrackedHashesPanel({
  crackedHashes,
  onViewPotfile,
}: CrackedHashesPanelProps) {
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
        <pre className="font-mono text-sm whitespace-pre-wrap break-all bg-gray-900 p-4 rounded-lg">
          {crackedHashes.length > 0
            ? crackedHashes.map(result => `${result.hash}:${result.password}`).join('\n')
            : 'No cracked hashes yet'}
        </pre>
      </div>
    </div>
  );
}
