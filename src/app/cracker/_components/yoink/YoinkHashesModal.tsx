'use client';

import Image from 'next/image';

import useYoinkHashes from '../../_hooks/useYoinkHashes';

import SearchableDropdown, { DropdownOption } from '@/components/ui/searchable-dropdown';

interface YoinkHashesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseHashes?: (hashes: string, hashTypeId: number) => void;
}

export default function YoinkHashesModal({ isOpen, onClose, onUseHashes }: YoinkHashesModalProps) {
  const {
    inputText,
    outputText,
    isLoading,
    hashTypeOptions,
    selectedHashType,
    isLoadingHashTypes,
    extractionResult,
    displayHashes,
    setInputText,
    setSelectedHashType,
    clearInput,
  } = useYoinkHashes(isOpen);

  const handleHashTypeChange = (option: DropdownOption) => {
    setSelectedHashType(option.id as number);
  };

  const handleUseHashes = () => {
    if (onUseHashes && selectedHashType !== null) {
      const hashesWithoutPasswords = displayHashes
        .filter(item => item.password === undefined)
        .map(item => item.hash)
        .join('\n');
      onUseHashes(hashesWithoutPasswords, selectedHashType);
      onClose();
    }
  };

  const handleCopyToClipboard = () => {
    const hashesOnly = displayHashes.map(item => item.hash).join('\n');
    void navigator.clipboard.writeText(hashesOnly);
  };

  const handleCopyAllToClipboard = () => {
    const allContent = displayHashes
      .map(item => (item.password !== undefined ? `${item.hash} → ${item.password}` : item.hash))
      .join('\n');
    void navigator.clipboard.writeText(allContent);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      data-testid="yoink-modal"
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Yoink Hashes from your logs!</h2>
            <p className="text-yellow-400 text-sm mt-1">
              This is experimental and the regexes are not perfect
            </p>
            {extractionResult.error && (
              <p className="text-red-400 text-xs mt-1">{extractionResult.error}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
            data-testid="yoink-close"
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
                  testId="yoink-hash-type"
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
                  onClick={clearInput}
                  className="px-2 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                  title="Clear input"
                >
                  Clear
                </button>
              </div>
              <textarea
                id="input-text"
                data-testid="yoink-input"
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
                  data-testid="yoink-output"
                >
                  {displayHashes.length === 0 ? (
                    <span className="text-gray-400">Extracted hashes will appear here...</span>
                  ) : (
                    displayHashes.map((item, index) => (
                      <div
                        key={`${item.hash}-${index}`}
                        className={`${item.password !== undefined ? 'text-green-400' : 'text-white'} mb-1`}
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
            data-testid="yoink-use-uncracked"
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
