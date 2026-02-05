'use client';

import { useCallback, useEffect, useState } from 'react';

import VmBadge from './VmBadge';

import { ParsedCredential, ParserInfo, VM, TeamCredential } from '@/types/teamVault';

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onImportComplete?: () => void;
}

interface ParseResult {
  credentials: ParsedCredential[];
  parser: string;
  count: number;
  filtered?: {
    machineAccounts: number;
    emptyHashes: number;
    duplicates: number;
  };
}

export default function EnhancedImportModal({
  isOpen,
  onClose,
  teamId,
  onImportComplete,
}: EnhancedImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [parsers, setParsers] = useState<ParserInfo[]>([]);
  const [selectedParser, setSelectedParser] = useState<string>('auto');
  const [vms, setVms] = useState<VM[]>([]);
  const [selectedVmIds, setSelectedVmIds] = useState<string[]>([]);
  const [credentialType, setCredentialType] = useState<'shared' | 'tsi'>('tsi');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCredentials, setExistingCredentials] = useState<TeamCredential[]>([]);
  const [autoLinkEnabled, setAutoLinkEnabled] = useState(true);

  // Fetch available parsers
  useEffect(() => {
    if (isOpen) {
      fetch('/api/parsers')
        .then(res => res.json())
        .then(data => setParsers(data.parsers || []))
        .catch(console.error);
    }
  }, [isOpen]);

  // Fetch VMs for the team
  useEffect(() => {
    if (isOpen && teamId) {
      fetch(`/api/vms/for-team/${teamId}`)
        .then(res => res.json())
        .then(data => setVms(data.vms || []))
        .catch(console.error);
    }
  }, [isOpen, teamId]);

  // Fetch existing credentials for auto-link matching
  useEffect(() => {
    if (isOpen && teamId) {
      fetch(`/api/teams/${teamId}`)
        .then(res => res.json())
        .then(data => {
          if (data.vault?.credentials) {
            setExistingCredentials(data.vault.credentials);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, teamId]);

  // Parse text when input or parser changes
  const handleParse = useCallback(async () => {
    if (!inputText.trim()) {
      setParseResult(null);
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const endpoint = selectedParser === 'auto' ? '/api/parsers/auto-parse' : '/api/parsers/parse';

      const body =
        selectedParser === 'auto'
          ? { text: inputText }
          : { parserId: selectedParser, text: inputText };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse');
      }

      const result = await response.json();
      setParseResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to parse text');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  }, [inputText, selectedParser]);

  // Debounced parse
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText.trim()) {
        handleParse();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputText, selectedParser, handleParse]);

  // Check if a credential will be auto-linked to an existing one
  const willBeLinked = useCallback(
    (cred: ParsedCredential): boolean => {
      if (!autoLinkEnabled || !cred.username) return false;
      const key = `${cred.username.toLowerCase()}:${cred.hashTypeId}`;
      return existingCredentials.some(
        existing =>
          existing.username && `${existing.username.toLowerCase()}:${existing.hashTypeId}` === key
      );
    },
    [existingCredentials, autoLinkEnabled]
  );

  // Handle import
  const handleImport = async () => {
    if (!parseResult || parseResult.credentials.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: parseResult.credentials,
          vmIds: selectedVmIds,
          credentialType,
          autoLink: autoLinkEnabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import');
      }

      const result = await response.json();

      // Reset and close
      setInputText('');
      setParseResult(null);
      setSelectedVmIds([]);
      onImportComplete?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import credentials');
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle VM selection
  const toggleVm = (vmId: string) => {
    setSelectedVmIds(prev =>
      prev.includes(vmId) ? prev.filter(id => id !== vmId) : [...prev, vmId]
    );
  };

  // Select all VMs
  const selectAllVms = () => {
    setSelectedVmIds(vms.map(vm => vm.id));
  };

  // Clear all VM selections
  const clearVmSelection = () => {
    setSelectedVmIds([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-[95vw] xl:max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Import Credentials</h2>
            <p className="text-sm text-gray-400">
              Parse log files and import credentials with VM assignment
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left side - Input & Options */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Parser Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Parser</label>
              <select
                value={selectedParser}
                onChange={e => setSelectedParser(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="auto">Auto-detect (Recommended)</option>
                {parsers.map(parser => (
                  <option key={parser.id} value={parser.id}>
                    {parser.name} - {parser.description}
                  </option>
                ))}
              </select>
              {selectedParser !== 'auto' && (
                <p className="text-xs text-gray-500 mt-1">
                  {parsers.find(p => p.id === selectedParser)?.description}
                </p>
              )}
            </div>

            {/* Input Text */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Paste Log Text</label>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Paste pwdump, mimikatz, or other log output here..."
                rows={8}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {inputText.length.toLocaleString()} characters
                </span>
                <button
                  onClick={() => setInputText('')}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* VM Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Assign to VMs</label>
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto">
                {vms.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No VMs configured. Add VMs in VM Manager first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={selectAllVms}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Select All
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        onClick={clearVmSelection}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    {vms.map(vm => (
                      <label
                        key={vm.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVmIds.includes(vm.id)}
                          onChange={() => toggleVm(vm.id)}
                          className="rounded border-gray-600"
                        />
                        <VmBadge vm={vm} size="sm" showTooltip={false} />
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedVmIds.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {selectedVmIds.length} VM{selectedVmIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Credential Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Credential Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="credentialType"
                    value="tsi"
                    checked={credentialType === 'tsi'}
                    onChange={e => setCredentialType(e.target.value as 'tsi')}
                    className="border-gray-600"
                  />
                  <span className="text-sm text-gray-300">TSI (Team-Specific)</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-900/60 text-orange-200">
                    TSI
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="credentialType"
                    value="shared"
                    checked={credentialType === 'shared'}
                    onChange={e => setCredentialType(e.target.value as 'shared')}
                    className="border-gray-600"
                  />
                  <span className="text-sm text-gray-300">Shared (All Teams)</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-900/60 text-purple-200">
                    Shared
                  </span>
                </label>
              </div>
            </div>

            {/* Auto-link option */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLinkEnabled}
                  onChange={e => setAutoLinkEnabled(e.target.checked)}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-gray-300">Auto-link matching usernames</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, credentials with matching usernames will update existing records
                instead of creating duplicates
              </p>
            </div>
          </div>

          {/* Right side - Preview */}
          <div className="flex-1 p-6 bg-gray-900/30 border-l border-gray-700 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300">
                Preview
                {isParsing && <span className="ml-2 text-blue-400">(Parsing...)</span>}
              </h3>
              {parseResult && (
                <div className="text-xs text-gray-400">
                  <span className="text-green-400 font-medium">
                    {parseResult.credentials.filter(c => !willBeLinked(c)).length}
                  </span>{' '}
                  new,{' '}
                  <span className="text-blue-400 font-medium">
                    {parseResult.credentials.filter(c => willBeLinked(c)).length}
                  </span>{' '}
                  will be linked
                  {parseResult.filtered && parseResult.filtered.machineAccounts > 0 && (
                    <span className="ml-2 text-gray-500">
                      ({parseResult.filtered.machineAccounts} machine accounts filtered)
                    </span>
                  )}
                </div>
              )}
            </div>

            {!parseResult ? (
              <div className="text-center py-12 text-gray-500">
                <p>Enter text to see preview</p>
                <p className="text-sm mt-1">Supported formats: pwdump, NetNTLMv2</p>
              </div>
            ) : parseResult.credentials.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No credentials found</p>
                <p className="text-sm mt-1">Try a different parser or check your input</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseResult.credentials.map((cred, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-200">
                            {cred.username || 'No username'}
                          </span>
                          {willBeLinked(cred) ? (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900/60 text-blue-200">
                              Links to existing
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-900/60 text-green-200">
                              New
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                            {cred.hashTypeName}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-gray-500 mt-1 whitespace-nowrap overflow-x-auto max-w-full scrollbar-thin">
                          {cred.hash}
                        </div>
                        {cred.metadata && (
                          <div className="text-xs text-gray-600 mt-1">
                            {cred.metadata.rid && <span>RID: {cred.metadata.rid}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Statistics */}
                {parseResult.filtered && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="text-xs font-medium text-gray-400 mb-2">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {parseResult.filtered.machineAccounts > 0 && (
                        <div className="text-gray-500">
                          Machine accounts filtered:{' '}
                          <span className="text-yellow-500">
                            {parseResult.filtered.machineAccounts}
                          </span>
                        </div>
                      )}
                      {parseResult.filtered.duplicates > 0 && (
                        <div className="text-gray-500">
                          Duplicates filtered:{' '}
                          <span className="text-yellow-500">{parseResult.filtered.duplicates}</span>
                        </div>
                      )}
                      <div className="text-gray-500">
                        Parser used: <span className="text-blue-400">{parseResult.parser}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parseResult || parseResult.credentials.length === 0 || isImporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Import {parseResult ? `${parseResult.count} Credentials` : 'Credentials'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
