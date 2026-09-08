'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import useCrackSubmit from '../_hooks/useCrackSubmit';

import SearchableDropdown, { DropdownOption } from '@/components/ui/searchable-dropdown';
import config from '@/config';

const CRACKER_FORM_STORAGE_KEY = 'hash-cracker:cracker-form-state';

interface PersistedCrackerFormState {
  title: string;
  hashInput: string;
  hashType: number;
  attackMode: string;
}

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
  const [title, setTitle] = useState('');
  const [isTitleInputVisible, setIsTitleInputVisible] = useState(false);
  const [attackMode, setAttackMode] = useState<string>('smart');
  const { error, submit } = useCrackSubmit({
    onCrackingStart: () => {
      setTitle('');
      setIsTitleInputVisible(false);
      onCrackingStart();
    },
  });
  const hasRestoredFromStorageRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasRestoredFromStorageRef.current) {
      return;
    }

    const state: PersistedCrackerFormState = {
      title,
      hashInput,
      hashType,
      attackMode,
    };

    try {
      window.localStorage.setItem(CRACKER_FORM_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage write failures.
    }
  }, [title, hashInput, hashType, attackMode]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CRACKER_FORM_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PersistedCrackerFormState>;

      if (typeof parsed.title === 'string') {
        setTitle(parsed.title);
        setIsTitleInputVisible(parsed.title.length > 0);
      }

      if (typeof parsed.hashInput === 'string') {
        setHashInput(parsed.hashInput);
      }

      if (typeof parsed.hashType === 'number' && Number.isFinite(parsed.hashType)) {
        setHashType(parsed.hashType);
      }

      if (
        typeof parsed.attackMode === 'string' &&
        Object.prototype.hasOwnProperty.call(config.hashcat.attackModes, parsed.attackMode)
      ) {
        setAttackMode(parsed.attackMode);
      }
    } catch {
      // Ignore malformed local data.
    } finally {
      queueMicrotask(() => {
        hasRestoredFromStorageRef.current = true;
      });
    }
  }, [setHashInput, setHashType]);

  useEffect(() => {
    if (isTitleInputVisible) {
      titleInputRef.current?.focus();
    }
  }, [isTitleInputVisible]);

  const handleAttackModeChange = (option: DropdownOption) => {
    setAttackMode(option.id as string);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit(hashInput, hashType, attackMode, title);
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
          <div className="flex min-h-8 flex-wrap items-center gap-3 mb-2">
            <label htmlFor="hash-input" className="text-gray-300">
              Enter Hash(es)
            </label>
            {isTitleInputVisible ? (
              <div className="relative w-56 max-w-full">
                <label htmlFor="job-title" className="sr-only">
                  Job name (optional)
                </label>
                <input
                  ref={titleInputRef}
                  id="job-title"
                  data-testid="job-title-input"
                  type="text"
                  value={title}
                  maxLength={120}
                  onChange={event => setTitle(event.target.value)}
                  onBlur={() => {
                    if (!title.trim()) {
                      setTitle('');
                      setIsTitleInputVisible(false);
                    }
                  }}
                  className="h-8 w-full bg-gray-900/50 rounded-lg border border-gray-700 pl-3 pr-9 text-sm"
                  placeholder="Job name (optional)"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setIsTitleInputVisible(false);
                  }}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-white transition-colors"
                  aria-label="Remove job name"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsTitleInputVisible(true)}
                className="h-8 text-sm text-gray-400 hover:text-white transition-colors"
                data-testid="add-job-title"
              >
                + Add name
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={openBenchmarkModal}
                className="h-8 bg-blue-600 hover:bg-blue-700 rounded-md px-3 text-sm font-medium transition-colors flex items-center gap-1"
                title="Run hashcat benchmark"
                data-testid="open-benchmark"
              >
                <Image src="/icons/speed.svg" alt="Benchmark" width={16} height={16} />
                Benchmark
              </button>
              <button
                type="button"
                onClick={openYoinkModal}
                className="h-8 bg-purple-600 hover:bg-purple-700 rounded-md px-3 text-sm font-medium transition-colors flex items-center gap-1"
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
