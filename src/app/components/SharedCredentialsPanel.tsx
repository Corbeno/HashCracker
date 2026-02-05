'use client';

import { useCallback, useEffect, useState } from 'react';

import ShowMoreButton from './ShowMoreButton';
import VmBadge from './VmBadge';

import { TeamCredential, VM } from '@/types/teamVault';

interface SharedCredentialsPanelProps {
  refreshTrigger?: number; // Increment to trigger refresh
}

const MAX_VISIBLE_CREDENTIALS = 25;

export default function SharedCredentialsPanel({ refreshTrigger }: SharedCredentialsPanelProps) {
  const [credentials, setCredentials] = useState<TeamCredential[]>([]);
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<TeamCredential | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch shared credentials
  const fetchSharedCredentials = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/shared');
      if (!response.ok) throw new Error('Failed to fetch shared credentials');
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      setError('Failed to load shared credentials');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all VMs
  const fetchVMs = useCallback(async () => {
    try {
      const response = await fetch('/api/vms');
      if (!response.ok) throw new Error('Failed to fetch VMs');
      const data = await response.json();
      setVms(data.vms || []);
    } catch (err) {
      console.error('Failed to load VMs:', err);
    }
  }, []);

  // Initial load and refresh trigger
  useEffect(() => {
    fetchSharedCredentials();
    fetchVMs();
  }, [fetchSharedCredentials, fetchVMs, refreshTrigger]);

  // Listen for shared credential updates
  useEffect(() => {
    const handleSharedCredentialsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      fetchSharedCredentials();
    };

    window.addEventListener(
      'sharedCredentialsUpdated',
      handleSharedCredentialsUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        'sharedCredentialsUpdated',
        handleSharedCredentialsUpdated as EventListener
      );
    };
  }, [fetchSharedCredentials]);

  // Handle delete
  const handleDelete = async (credentialId: string) => {
    if (!confirm('Delete this shared credential? It will be removed from all teams.')) return;

    try {
      const response = await fetch(`/api/shared/${credentialId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete credential');
      fetchSharedCredentials();
    } catch (err) {
      setError('Failed to delete credential');
      console.error(err);
    }
  };

  // Handle edit
  const handleEdit = (credential: TeamCredential) => {
    setEditingCredential(credential);
    setIsEditorOpen(true);
  };

  // Handle create new
  const handleCreate = () => {
    setEditingCredential(null);
    setIsEditorOpen(true);
  };

  // Handle save (create or update)
  const handleSave = async (credential: TeamCredential) => {
    if (editingCredential) {
      // Update existing
      try {
        const response = await fetch(`/api/shared/${editingCredential.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credential),
        });
        if (!response.ok) throw new Error('Failed to update credential');
        fetchSharedCredentials();
      } catch (err) {
        setError('Failed to update credential');
        console.error(err);
      }
    } else {
      // Create new shared credential
      try {
        const response = await fetch('/api/shared', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credential),
        });
        if (!response.ok) throw new Error('Failed to create credential');
        fetchSharedCredentials();
      } catch (err) {
        setError('Failed to create credential');
        console.error(err);
      }
    }
  };

  // Handle crack selected hashes
  const handleCrackSelected = async (selectedHashes: string[]) => {
    // Trigger crack functionality via main page
    // This will emit an event or call a callback
    // For now, just log it
    console.log('Crack hashes:', selectedHashes);
  };

  const uncrackedCount = credentials.filter(c => c.password === null).length;
  const crackedCount = credentials.filter(c => c.password !== null).length;
  const visibleCredentials = expanded ? credentials : credentials.slice(0, MAX_VISIBLE_CREDENTIALS);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold">Global Shared Credentials</h2>
          <p className="text-sm text-gray-400">
            {credentials.length} credentials • {crackedCount} cracked • {uncrackedCount} uncracked
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Shared Credential
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            &times;
          </button>
        </div>
      )}

      {/* Credentials list */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No shared credentials yet</p>
            <button onClick={handleCreate} className="text-blue-400 hover:text-blue-300 text-sm">
              Add your first shared credential
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Username</th>
                  <th className="pb-2 font-medium">Hash</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">VMs</th>
                  <th className="pb-2 w-24">Password</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {visibleCredentials.map((credential: TeamCredential) => (
                  <tr key={credential.id} className="group">
                    <td className="py-2 pr-4">
                      <span className="text-gray-300 font-medium">
                        {credential.username || '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 max-w-[300px]">
                      <div className="font-mono text-xs text-gray-500 break-all">
                        {credential.hash}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-gray-500 text-xs">{credential.hashTypeName}</span>
                    </td>
                    <td className="py-2 pr-4">
                      {credential.vmIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {credential.vmIds.slice(0, 2).map(vmId => {
                            const vm = vms.find(v => v.id === vmId);
                            return vm ? (
                              <VmBadge key={vmId} vm={vm} size="sm" />
                            ) : (
                              <span key={vmId} className="text-xs text-gray-500">
                                {vmId}
                              </span>
                            );
                          })}
                          {credential.vmIds.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{credential.vmIds.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {credential.password !== null ? (
                        <span className="text-green-400 font-medium font-mono">
                          {credential.password || '(empty)'}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-2 w-10">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
                        <button
                          onClick={() => handleEdit(credential)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(credential.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {credentials.length > MAX_VISIBLE_CREDENTIALS && (
              <div className="mt-4">
                <ShowMoreButton
                  expanded={expanded}
                  toggleExpanded={() => setExpanded(!expanded)}
                  totalCount={credentials.length}
                  visibleCount={visibleCredentials.length}
                  itemName="credentials"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Editor */}
      {isEditorOpen && (
        <SharedCredentialInlineEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          credential={editingCredential}
          vms={vms}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface SharedCredentialInlineEditorProps {
  isOpen: boolean;
  onClose: () => void;
  credential?: TeamCredential | null;
  vms: VM[];
  onSave: (credential: TeamCredential) => void;
}

function SharedCredentialInlineEditor({
  isOpen,
  onClose,
  credential,
  vms,
  onSave,
}: SharedCredentialInlineEditorProps) {
  const [formData, setFormData] = useState({
    username: '',
    hash: '',
    password: '',
    hashTypeId: 1000,
    hashTypeName: 'NTLM',
    vmIds: [] as string[],
    source: 'manual',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!credential;

  useEffect(() => {
    if (credential) {
      setFormData({
        username: credential.username || '',
        hash: credential.hash || '',
        password: credential.password || '',
        hashTypeId: credential.hashTypeId,
        hashTypeName: credential.hashTypeName,
        vmIds: credential.vmIds || [],
        source: credential.source || 'manual',
      });
    } else {
      setFormData({
        username: '',
        hash: '',
        password: '',
        hashTypeId: 1000,
        hashTypeName: 'NTLM',
        vmIds: [],
        source: 'manual',
      });
    }
    setError(null);
  }, [credential, isOpen]);

  const handleInputChange = (field: keyof typeof formData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleHashTypeChange = (hashTypeId: number) => {
    const hashTypes: Record<number, string> = {
      0: 'MD5',
      100: 'SHA1',
      1000: 'NTLM',
      1100: 'Domain Cached Credentials',
      5600: 'NetNTLMv2',
    };
    setFormData(prev => ({
      ...prev,
      hashTypeId,
      hashTypeName: hashTypes[hashTypeId] || 'Unknown',
    }));
  };

  const toggleVm = (vmId: string) => {
    setFormData(prev => ({
      ...prev,
      vmIds: prev.vmIds.includes(vmId)
        ? prev.vmIds.filter(id => id !== vmId)
        : [...prev.vmIds, vmId],
    }));
  };

  const isValid = formData.username.trim() || formData.hash.trim() || formData.password.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('At least one of username, hash, or password is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const credentialToSave: TeamCredential = {
        id: credential?.id || `shared_${Date.now()}`,
        hash: formData.hash,
        hashTypeId: formData.hashTypeId,
        hashTypeName: formData.hashTypeName,
        username: formData.username || null,
        password: formData.password || null,
        credentialType: 'shared',
        scope: 'global',
        vmIds: formData.vmIds,
        source: formData.source,
        crackedAt: formData.password ? new Date().toISOString() : null,
        createdAt: credential?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(credentialToSave);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save credential';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            {isEditMode ? 'Edit Shared Credential' : 'Add Shared Credential'}
          </h3>
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
          <div className="mx-4 mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Info text */}
          <p className="text-sm text-gray-400">
            Enter at least one of: username, hash, or password
          </p>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={e => handleInputChange('username', e.target.value)}
              placeholder="e.g., Administrator"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Hash */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Hash</label>
            <input
              type="text"
              value={formData.hash}
              onChange={e => handleInputChange('hash', e.target.value)}
              placeholder="e.g., 31d6cfe0d16ae931b73c59d7e0c089c0"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="text"
              value={formData.password}
              onChange={e => handleInputChange('password', e.target.value)}
              placeholder="Plaintext password (if known)"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Hash Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Hash Type</label>
            <select
              value={formData.hashTypeId}
              onChange={e => handleHashTypeChange(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value={0}>MD5</option>
              <option value={100}>SHA1</option>
              <option value={1000}>NTLM</option>
              <option value={1100}>Domain Cached Credentials (DCC)</option>
              <option value={5600}>NetNTLMv2</option>
            </select>
          </div>

          {/* VM Selection - Optional for shared credentials */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              VMs (optional - applies to all if none selected)
            </label>
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 max-h-32 overflow-y-auto">
              {vms.length === 0 ? (
                <p className="text-sm text-gray-500">No VMs available</p>
              ) : (
                <div className="space-y-2">
                  {vms.map(vm => (
                    <label key={vm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.vmIds.includes(vm.id)}
                        onChange={() => toggleVm(vm.id)}
                        className="rounded border-gray-600"
                      />
                      <span className="text-sm text-gray-300">{vm.name}</span>
                      <span className="text-xs text-gray-500">({vm.id})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
