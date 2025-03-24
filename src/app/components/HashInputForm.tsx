'use client';

import React, { useMemo, useState } from 'react';

import SearchableDropdown, { DropdownOption } from '@/app/components/SearchableDropdown';
import config from '@/config';

interface HashInputFormProps {
  hashInput: string;
  hashType: number;
  setHashType: (value: number) => void;
  setHashInput: (value: string) => void;
  openYoinkModal: () => void;
  onCrackingStart: () => void;
}

export default function HashInputForm({
  hashInput,
  hashType,
  setHashType,
  setHashInput,
  openYoinkModal,
  onCrackingStart,
}: HashInputFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [attackMode, setAttackMode] = useState<string>('rockyou');

  const handleAttackModeChange = (option: DropdownOption) => {
    setAttackMode(option.id as string);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      // Validate input
      if (!hashInput.trim()) {
        setError('Please enter at least one hash');
        return;
      }

      // Split input by newlines and filter out empty lines
      const hashes = hashInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Prepare request body
      const requestBody = {
        hashes,
        type: hashType,
        mode: attackMode,
      };

      // Send request to API
      const response = await fetch('/api/crack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.error) {
        setError(`Failed to start cracking: ${data.error}`);
      } else {
        onCrackingStart();
      }
    } catch (error) {
      console.error('Error submitting crack request:', error);
      setError('Failed to submit request. See console for details.');
    }
  };

  // Get available hash types from config
  const hashTypeOptions = useMemo(() => {
    return Object.entries(config.hashcat.hashTypes).map(
      ([id, hashType]) =>
        ({
          id: parseInt(id),
          name: `${id} - ${hashType.name}`,
          description: hashType.category || 'Other',
        }) as DropdownOption
    );
  }, []);

  // Get available attack modes from config
  const attackModeOptions = useMemo(() => {
    return Object.entries(config.hashcat.attackModes).map(
      ([id, mode]) =>
        ({
          id,
          name: mode.name,
          description: mode.description,
        }) as DropdownOption
    );
  }, []);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="hash-input" className="text-gray-300">
              Enter Hash(es)
            </label>
            <button
              type="button"
              onClick={openYoinkModal}
              className="bg-purple-600 hover:bg-purple-700 rounded-md py-1 px-3 text-sm font-medium transition-colors flex items-center gap-1"
              title="Extract hashes from text"
            >
              Yoink
            </button>
          </div>
          <textarea
            id="hash-input"
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            className="w-full h-32 bg-gray-900/50 rounded-xl border border-gray-700 p-3 font-mono text-sm"
            placeholder="Enter one or more hashes (one per line)"
          />
          {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchableDropdown
              options={hashTypeOptions}
              value={hashType}
              onChange={option => setHashType(option.id as number)}
              label="Hash Type"
              placeholder="Select hash type..."
              searchPlaceholder="Search hash type by name or ID..."
            />
          </div>

          <div className="relative">
            <SearchableDropdown
              options={attackModeOptions}
              value={attackMode}
              onChange={handleAttackModeChange}
              label="Attack Mode"
              placeholder="Select attack mode..."
              searchPlaceholder="Search attack mode..."
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-medium transition-colors"
            >
              Start Cracking
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
