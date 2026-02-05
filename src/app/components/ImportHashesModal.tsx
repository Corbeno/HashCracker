'use client';

import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import SearchableDropdown, { DropdownOption } from './SearchableDropdown';

interface ImportHashesModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onImportComplete?: () => void;
}

interface HashTypeOption {
  id: number;
  name: string;
  description: string;
}

// Persist the last selected hash type across modal opens
let lastSelectedHashType: number | null = null;

export default function ImportHashesModal({
  isOpen,
  onClose,
  teamId,
  onImportComplete,
}: ImportHashesModalProps) {
  const [inputText, setInputText] = useState('');
  const [extractedHashes, setExtractedHashes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hashTypeOptions, setHashTypeOptions] = useState<HashTypeOption[]>([]);
  const [selectedHashType, setSelectedHashType] = useState<number | null>(lastSelectedHashType);
  const [isLoadingHashTypes, setIsLoadingHashTypes] = useState(false);
  const [result, setResult] = useState<{
    imported?: number;
    duplicates?: number;
    total?: number;
    message?: string;
  } | null>(null);

  // Fetch hash types with regex patterns
  useEffect(() => {
    if (isOpen) {
      fetchHashTypesWithRegex();
    }
  }, [isOpen]);

  const fetchHashTypesWithRegex = async () => {
    setIsLoadingHashTypes(true);
    try {
      const response = await fetch('/api/hash-types-with-regex');
      if (!response.ok) throw new Error('Failed to fetch hash types');

      const data = await response.json();
      const options = data.hashTypes.map((ht: any) => ({
        id: ht.id,
        name: `${ht.id} - ${ht.name}`,
        description: ht.category || 'Other',
      }));

      setHashTypeOptions(options);

      // Set default selection if needed
      if (selectedHashType === null && lastSelectedHashType === null && options.length > 0) {
        // Default to NTLM (1000) if available, otherwise first option
        const ntlmOption = options.find((o: HashTypeOption) => o.id === 1000);
        const defaultId = ntlmOption ? 1000 : options[0].id;
        setSelectedHashType(defaultId);
        lastSelectedHashType = defaultId;
      }
    } catch (error) {
      console.error('Error fetching hash types:', error);
    } finally {
      setIsLoadingHashTypes(false);
    }
  };

  // Debounced hash extraction
  const debouncedExtract = useCallback(
    debounce(async (text: string, hashType: number | null) => {
      if (!text.trim() || hashType === null) {
        setExtractedHashes([]);
        return;
      }

      setIsExtracting(true);
      try {
        const response = await fetch('/api/extract-hashes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, hashType }),
        });

        const data = await response.json();
        if (response.ok) {
          setExtractedHashes(data.hashes || []);
        } else {
          setExtractedHashes([]);
        }
      } catch (error) {
        console.error('Error extracting hashes:', error);
        setExtractedHashes([]);
      } finally {
        setIsExtracting(false);
      }
    }, 400),
    []
  );

  // Extract hashes when input or hash type changes
  useEffect(() => {
    debouncedExtract(inputText, selectedHashType);
    return () => debouncedExtract.cancel();
  }, [inputText, selectedHashType, debouncedExtract]);

  const handleHashTypeChange = (option: DropdownOption) => {
    const newType = option.id as number;
    setSelectedHashType(newType);
    lastSelectedHashType = newType;
  };

  const handleImport = async () => {
    if (!inputText.trim() || !teamId || selectedHashType === null) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          hashType: selectedHashType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);

      if (data.imported > 0 && onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setResult({ message: err.message || 'Import failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setExtractedHashes([]);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">Import Hashes</h2>
            <p className="text-sm text-gray-400 mt-0.5">Paste logs or text containing hashes</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-auto">
          {/* Hash type selector */}
          <div className="mb-4">
            {isLoadingHashTypes ? (
              <div className="bg-gray-700 p-3 rounded-lg text-gray-400 text-sm">
                Loading hash types...
              </div>
            ) : hashTypeOptions.length === 0 ? (
              <div className="bg-gray-700 p-3 rounded-lg text-yellow-400 text-sm">
                No hash types with regex patterns available
              </div>
            ) : (
              <SearchableDropdown
                options={hashTypeOptions}
                value={selectedHashType}
                onChange={handleHashTypeChange}
                label="Hash Type"
                placeholder="Select hash type..."
                searchPlaceholder="Search by name or ID..."
              />
            )}
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-300">Paste text or logs:</label>
                <button
                  onClick={() => setInputText('')}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Paste your logs here...

Any text containing hashes will work.
Non-matching lines are automatically ignored."
                className="flex-1 min-h-[280px] bg-gray-900/50 border border-gray-600 rounded-lg p-3 font-mono text-sm text-gray-300 resize-none focus:outline-none focus:border-gray-500 placeholder-gray-600"
              />
            </div>

            {/* Extracted preview */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-300">
                  Extracted hashes:
                  {isExtracting && <span className="text-blue-400 ml-2">extracting...</span>}
                </label>
                <span className="text-xs text-gray-500">{extractedHashes.length} found</span>
              </div>
              <div className="flex-1 min-h-[280px] bg-gray-900/50 border border-gray-600 rounded-lg p-3 font-mono text-xs text-gray-400 overflow-auto">
                {extractedHashes.length === 0 ? (
                  <span className="text-gray-600">
                    {inputText.trim() && selectedHashType !== null
                      ? 'No matching hashes found'
                      : 'Extracted hashes will appear here...'}
                  </span>
                ) : (
                  extractedHashes.slice(0, 100).map((hash, i) => (
                    <div key={i} className="py-0.5 truncate">
                      {hash}
                    </div>
                  ))
                )}
                {extractedHashes.length > 100 && (
                  <div className="text-gray-500 mt-2">
                    ...and {extractedHashes.length - 100} more
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result display */}
          {result && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                result.imported && result.imported > 0
                  ? 'bg-green-900/30 border border-green-800 text-green-300'
                  : result.message
                    ? 'bg-red-900/30 border border-red-800 text-red-300'
                    : 'bg-yellow-900/30 border border-yellow-800 text-yellow-300'
              }`}
            >
              {result.imported !== undefined && result.imported > 0 ? (
                <span>
                  Imported <strong>{result.imported}</strong> hashes
                  {result.duplicates ? ` (${result.duplicates} duplicates skipped)` : ''}
                </span>
              ) : result.message ? (
                <span>{result.message}</span>
              ) : (
                <span>No hashes were imported</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={extractedHashes.length === 0 || isLoading || selectedHashType === null}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isLoading ? 'Importing...' : `Import ${extractedHashes.length} Hashes`}
          </button>
        </div>
      </div>
    </div>
  );
}
