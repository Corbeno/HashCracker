'use client';

import { useEffect, useState } from 'react';

import { TeamCredential, CredentialScope, VM } from '@/types/teamVault';

interface InlineCredentialEditorProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  credential?: TeamCredential; // If provided, edit mode
  onSave?: (credential: TeamCredential) => void;
}

interface FormData {
  username: string;
  hash: string;
  password: string;
  hashTypeId: number;
  hashTypeName: string;
  scope: CredentialScope;
  vmIds: string[];
  source: string;
}

const HASH_TYPES = [
  { id: 0, name: 'MD5' },
  { id: 100, name: 'SHA1' },
  { id: 1000, name: 'NTLM' },
  { id: 1100, name: 'Domain Cached Credentials (DCC)' },
  { id: 5600, name: 'NetNTLMv2' },
];

export default function InlineCredentialEditor({
  isOpen,
  onClose,
  teamId,
  credential,
  onSave,
}: InlineCredentialEditorProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    hash: '',
    password: '',
    hashTypeId: 1000,
    hashTypeName: 'NTLM',
    scope: 'team-wide',
    vmIds: [],
    source: 'manual',
  });
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!credential;

  // Load credential data if editing
  useEffect(() => {
    if (credential) {
      setFormData({
        username: credential.username || '',
        hash: credential.hash || '',
        password: credential.password || '',
        hashTypeId: credential.hashTypeId,
        hashTypeName: credential.hashTypeName,
        scope: credential.scope || 'team-wide',
        vmIds: credential.vmIds || [],
        source: credential.source || 'manual',
      });
    } else {
      // Reset form for create mode
      setFormData({
        username: '',
        hash: '',
        password: '',
        hashTypeId: 1000,
        hashTypeName: 'NTLM',
        scope: 'team-wide',
        vmIds: [],
        source: 'manual',
      });
    }
    setError(null);
  }, [credential, isOpen]);

  // Fetch VMs for team
  useEffect(() => {
    if (isOpen && teamId) {
      fetch(`/api/vms/for-team/${teamId}`)
        .then(res => res.json())
        .then(data => setVms(data.vms || []))
        .catch(console.error);
    }
  }, [isOpen, teamId]);

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Handle hash type change
  const handleHashTypeChange = (hashTypeId: number) => {
    const hashType = HASH_TYPES.find(h => h.id === hashTypeId);
    setFormData(prev => ({
      ...prev,
      hashTypeId,
      hashTypeName: hashType?.name || 'Unknown',
    }));
  };

  // Toggle VM selection
  const toggleVm = (vmId: string) => {
    setFormData(prev => ({
      ...prev,
      vmIds: prev.vmIds.includes(vmId)
        ? prev.vmIds.filter(id => id !== vmId)
        : [...prev.vmIds, vmId],
    }));
  };

  // Validate form
  const isValid = formData.username.trim() || formData.hash.trim() || formData.password.trim();

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('At least one of username, hash, or password is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = isEditMode
        ? `/api/teams/${teamId}/credentials/${credential!.id}`
        : `/api/teams/${teamId}/credentials`;

      const method = isEditMode ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        scope: formData.scope,
        vmIds: formData.vmIds,
        source: formData.source,
      };

      // Only include non-empty fields
      if (formData.username.trim()) body.username = formData.username.trim();
      if (formData.hash.trim()) body.hash = formData.hash.trim();
      if (formData.password.trim()) body.password = formData.password.trim();
      if (formData.hashTypeId) {
        body.hashTypeId = formData.hashTypeId;
        body.hashTypeName = formData.hashTypeName;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save credential');
      }

      const result = await response.json();
      onSave?.(result.credential);
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
            {isEditMode ? 'Edit Credential' : 'Add Credential'}
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
              {HASH_TYPES.map(ht => (
                <option key={ht.id} value={ht.id}>
                  {ht.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scope</label>
            <select
              value={formData.scope}
              onChange={e => handleInputChange('scope', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="team-wide">Team-wide (all VMs for this team)</option>
              <option value="vm-specific">VM-specific (selected VMs only)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.scope === 'team-wide'
                ? 'Credential applies to all VMs for this team'
                : 'Select specific VMs below'}
            </p>
          </div>

          {/* VM Selection (only if vm-specific) */}
          {formData.scope === 'vm-specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Assign to VMs</label>
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
          )}

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
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
