'use client';

import { debounce } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { compareHashes } from '@/utils/clientHashUtils';
import SearchableDropdown, { DropdownOption } from './SearchableDropdown';

interface YoinkHashesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseHashes?: (hashes: string, hashTypeId: number) => void;
}

interface HashTypeOption {
  id: number;
  name: string;
  description: string;
}

interface CrackedHashData {
  password: string;
  isCaseSensitive: boolean;
}

// Keep track of the last selected hash type outside the component to persist it
let lastSelectedHashType: number | null = null;

export default function YoinkHashesModal({ isOpen, onClose, onUseHashes }: YoinkHashesModalProps) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hashTypeOptions, setHashTypeOptions] = useState<HashTypeOption[]>([]);
  const [selectedHashType, setSelectedHashType] = useState<number | null>(null);
  const [isLoadingHashTypes, setIsLoadingHashTypes] = useState(false);
  const [extractionResult, setExtractionResult] = useState<{
    hashType?: string;
    count?: number;
    error?: string;
  }>({});
  const [crackedHashes, setCrackedHashes] = useState<Record<string, CrackedHashData>>({});
  const [displayHashes, setDisplayHashes] = useState<Array<{ hash: string; password?: string; isCaseSensitive: boolean }>>(
    []
  );

  // Fetch hash types with regex patterns
  useEffect(() => {
    if (isOpen) {
      fetchHashTypesWithRegex();
      fetchCrackedHashes();
    }
  }, [isOpen]);

  const fetchHashTypesWithRegex = async () => {
    setIsLoadingHashTypes(true);
    try {
      const response = await fetch('/api/hash-types-with-regex');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const options = data.hashTypes.map((hashType: any) => ({
        id: hashType.id,
        name: `${hashType.id} - ${hashType.name}`,
        description: hashType.regex
          ? `${hashType.category || 'Other'} - Regex: ${hashType.regex}`
          : hashType.category || 'Other',
      }));

      setHashTypeOptions(options);

      // Set default selection if no previous selection and options are available
      if (selectedHashType === null && options.length > 0) {
        setSelectedHashType(options[0].id as number);
        lastSelectedHashType = options[0].id as number;
      }
    } catch (error) {
      console.error('Error fetching hash types with regex:', error);
    } finally {
      setIsLoadingHashTypes(false);
    }
  };

  const fetchCrackedHashes = async () => {
    try {
      const response = await fetch('/api/cracked-hashes');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setCrackedHashes(data.crackedHashes || {});
    } catch (error) {
      console.error('Error fetching cracked hashes:', error);
    }
  };

  // Debounced function to fetch extracted hashes
  const debouncedFetchHashes = useCallback(
    debounce(async (text: string, hashType: number | null) => {
      if (!text.trim() || hashType === null) {
        setOutputText('');
        setExtractionResult({});
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/extract-hashes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, hashType }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Error: ${response.status}`);
        }

        setOutputText(data.hashes.join('\n'));
        setExtractionResult({
          hashType: data.hashType,
          count: data.count,
        });
      } catch (error) {
        console.error('Error extracting hashes:', error);
        setOutputText('');
        setExtractionResult({
          error:
            error instanceof Error ? error.message : 'Error extracting hashes. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  // Call the debounced function when input or hash type changes
  useEffect(() => {
    if (selectedHashType !== null) {
      debouncedFetchHashes(inputText, selectedHashType);
    }

    // Cleanup
    return () => {
      debouncedFetchHashes.cancel();
    };
  }, [inputText, selectedHashType, debouncedFetchHashes]);

  // Update display hashes when output text or cracked hashes change
  useEffect(() => {
    if (outputText) {
      const hashes = outputText.split('\n').filter(hash => hash.trim() !== '');
      const newDisplayHashes = hashes.map(hash => {
        // Handle case-sensitivity when comparing hashes
        let matchedHash = hash;
        let password: string | undefined = undefined;
        let isCaseSensitive = false;
        
        // First try direct lookup
        if (crackedHashes[hash]) {
          matchedHash = hash;
          password = crackedHashes[hash].password;
          isCaseSensitive = crackedHashes[hash].isCaseSensitive;
        } else {
          // If not found, try case-insensitive lookup for non-case-sensitive hashes
          const matchedEntry = Object.entries(crackedHashes).find(([crackedHash, data]) => {
            // Only do case-insensitive comparison for hashes that are not case-sensitive
            return compareHashes(crackedHash, hash, data.isCaseSensitive);
          });
          
          if (matchedEntry) {
            [matchedHash, { password, isCaseSensitive }] = matchedEntry;
          }
        }
        
        return {
          hash,
          password,
          isCaseSensitive
        };
      });
      setDisplayHashes(newDisplayHashes);
    } else {
      setDisplayHashes([]);
    }
  }, [outputText, crackedHashes]);

  const handleHashTypeChange = (option: DropdownOption) => {
    const newHashType = option.id as number;
    setSelectedHashType(newHashType);
    lastSelectedHashType = newHashType;
  };

  const handleClearInput = () => {
    setInputText('');
  };

  const handleUseHashes = () => {
    if (onUseHashes && selectedHashType !== null) {
      // Only pass the hash values without the cracked status or passwords
      const hashesWithoutPasswords = displayHashes
        .filter(item => item.password === undefined)
        .map(item => item.hash)
        .join('\n');
      console.log(displayHashes);
      onUseHashes(hashesWithoutPasswords, selectedHashType);
      onClose();
    }
  };

  const handleCopyToClipboard = () => {
    // Only copy the hash values without the cracked status or passwords
    const hashesOnly = displayHashes.map(item => item.hash).join('\n');
    navigator.clipboard.writeText(hashesOnly);
  };

  const handleCopyAllToClipboard = () => {
    // Copy both hashes and passwords (if available)
    const allContent = displayHashes.map(item => {
      return item.password !== undefined
        ? `${item.hash} → ${item.password}`
        : item.hash;
    }).join('\n');
    navigator.clipboard.writeText(allContent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Yoink Hashes from your logs!</h2>
            <p className="text-yellow-400 text-sm mt-1">
              This is experimental and the regexes aren't perfect
            </p>
          </div>
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
          <div className="mb-4">
            <div className="relative">
              {isLoadingHashTypes ? (
                <div className="bg-gray-700 p-3 rounded-md text-gray-400">
                  Loading hash types...
                </div>
              ) : hashTypeOptions.length === 0 ? (
                <div className="bg-gray-700 p-3 rounded-md text-yellow-400">
                  No hash types with regex patterns available
                </div>
              ) : (
                <SearchableDropdown
                  options={hashTypeOptions}
                  value={selectedHashType !== null ? selectedHashType : null}
                  onChange={handleHashTypeChange}
                  label="Hash Type"
                  placeholder="Select hash type..."
                  searchPlaceholder="Search hash type by name or ID..."
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="input-text" className="text-gray-300">
                  Paste text containing hashes:
                </label>
                <button
                  onClick={handleClearInput}
                  className="px-2 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                  title="Clear input"
                >
                  Clear
                </button>
              </div>
              <textarea
                id="input-text"
                className="bg-gray-700 text-white p-3 rounded-md h-80 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Paste your text here..."
              />
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="output-text"
                className="text-gray-300 mb-2 flex justify-between items-center"
              >
                <span>Extracted hashes:</span>
                {isLoading && <span className="text-blue-400 text-sm">Processing...</span>}
              </label>
              <div className="flex flex-col h-80">
                <textarea id="output-text" className="hidden" value={outputText} readOnly />
                <div
                  className="bg-gray-700 text-white p-3 rounded-md flex-1 overflow-auto font-mono text-sm"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {displayHashes.length === 0 ? (
                    <span className="text-gray-400">Extracted hashes will appear here...</span>
                  ) : (
                    displayHashes.map((item, index) => (
                      <div
                        key={index}
                        className={`${
                          item.password !== undefined ? 'text-green-400' : 'text-white'
                        } mb-1`}
                      >
                        {item.hash}
                        {item.password !== undefined && (
                          <span className="ml-2 text-gray-400">
                            → <span className="text-yellow-300">{item.password || '(empty)'}</span>
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={handleUseHashes}
            disabled={!outputText}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Image src="/icons/hash.svg" alt="Use hashes" width={16} height={16} />
            Use Uncracked Hashes
          </button>
          <button
            onClick={handleCopyAllToClipboard}
            disabled={!outputText}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Copy all
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={!outputText}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Copy hashes
          </button>
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
