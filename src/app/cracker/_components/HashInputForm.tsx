'use client';

import Image from 'next/image';
import React, { useMemo, useState } from 'react';

import useCrackSubmit from '../_hooks/useCrackSubmit';

import SearchableDropdown, { DropdownOption } from '@/components/ui/searchable-dropdown';
import config from '@/config';

interface HashInputFormProps {
  hashInput: string;
  hashType: number;
  setHashType: (value: number) => void;
  setHashInput: (value: string) => void;
  openYoinkModal: () => void;
  openBenchmarkModal: () => void;
  onCrackingStart: () => void;
}

export default function HashInputForm({
  hashInput,
  hashType,
  setHashType,
  setHashInput,
  openYoinkModal,
  openBenchmarkModal,
  onCrackingStart,
}: HashInputFormProps) {
  const [attackMode, setAttackMode] = useState<string>('smart');
  const { error, submit } = useCrackSubmit({ onCrackingStart });

  const handleAttackModeChange = (option: DropdownOption) => {
    setAttackMode(option.id as string);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit(hashInput, hashType, attackMode);
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openBenchmarkModal}
                className="bg-blue-600 hover:bg-blue-700 rounded-md py-1 px-3 text-sm font-medium transition-colors flex items-center gap-1"
                title="Run hashcat benchmark"
                data-testid="open-benchmark"
              >
                <Image src="/icons/speed.svg" alt="Benchmark" width={16} height={16} />
                Benchmark
              </button>
              <button
                type="button"
                onClick={openYoinkModal}
                className="bg-purple-600 hover:bg-purple-700 rounded-md py-1 px-3 text-sm font-medium transition-colors flex items-center gap-1"
                title="Extract hashes from text"
                data-testid="open-yoink"
              >
                Yoink
              </button>
            </div>
          </div>
          <textarea
            id="hash-input"
            data-testid="hash-input"
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
              testId="hash-type-dropdown"
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
              testId="attack-mode-dropdown"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              data-testid="start-cracking"
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
