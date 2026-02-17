'use client';

import { useMemo, useState } from 'react';

import { LogImportResult, LogImportType } from '@/types/logImport';

interface LogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (logType: LogImportType, rawLog: string) => Promise<LogImportResult | null>;
}

interface LogTypeOption {
  id: LogImportType;
  label: string;
  enabled: boolean;
}

const LOG_TYPE_OPTIONS: LogTypeOption[] = [
  { id: 'impacket-ntlm', label: 'Impacket - SAM NTLM', enabled: true },
  { id: 'mimikatz', label: 'Mimikatz - sekurlsa::logonpasswords', enabled: true },
  { id: 'impacket-cached-domain', label: 'Impacket - Cached Domain (coming soon)', enabled: false },
];

export default function LogImportModal({ isOpen, onClose, onImport }: LogImportModalProps) {
  const [selectedType, setSelectedType] = useState<LogImportType>('impacket-ntlm');
  const [rawLog, setRawLog] = useState('');
  const [result, setResult] = useState<LogImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIsEnabled = useMemo(
    () => LOG_TYPE_OPTIONS.some(option => option.id === selectedType && option.enabled),
    [selectedType]
  );

  const handleClose = () => {
    setError(null);
    setResult(null);
    setRawLog('');
    setSelectedType('impacket-ntlm');
    onClose();
  };

  const handleImport = async () => {
    if (!rawLog.trim() || !selectedIsEnabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const importResult = await onImport(selectedType, rawLog);
      if (!importResult) {
        setError('Import failed. Try again.');
        return;
      }
      setResult(importResult);
    } catch {
      setError('Import failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Log Import</h2>
            <p className="text-sm text-gray-300 mt-1">
              Import and merge credentials into the selected vault tab.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
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

        <div className="p-4 space-y-4">
          <div>
            <label
              htmlFor="log-import-type"
              className="block text-sm font-medium text-gray-200 mb-2"
            >
              Log Type
            </label>
            <select
              id="log-import-type"
              value={selectedType}
              onChange={event => setSelectedType(event.target.value as LogImportType)}
              className="w-full bg-gray-900 text-gray-100 rounded-xl border border-gray-600 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
            >
              {LOG_TYPE_OPTIONS.map(option => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.enabled}
                  className={
                    option.enabled ? 'bg-gray-900 text-gray-100' : 'bg-gray-900 text-gray-500'
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="log-import-raw"
              className="block text-sm font-medium text-gray-200 mb-2"
            >
              Paste raw log output
            </label>
            <textarea
              id="log-import-raw"
              value={rawLog}
              onChange={event => setRawLog(event.target.value)}
              placeholder="Paste impacket output here..."
              className="w-full h-72 bg-gray-900/50 rounded-xl border border-gray-700 p-3 font-mono text-sm resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 p-3 rounded-md text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-md p-3 text-sm text-gray-200">
              Parsed: {result.parsedCount} | Created: {result.createdCount} | Updated:{' '}
              {result.updatedCount} | Shared: {result.sharedCount} | Skipped: {result.skippedCount}{' '}
              | Conflicts: {result.conflictCount}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={handleImport}
            disabled={!rawLog.trim() || !selectedIsEnabled || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
