'use client';

import { useCallback, useEffect, useState } from 'react';

import { VM } from '@/types/teamVault';

interface VmManagerProps {
  teamId?: string; // If provided, show team-specific VM creation option
  onVmsChanged?: () => void;
}

interface VMFormData {
  id: string;
  name: string;
  scope: 'global' | 'team-specific';
  ipAddress: string;
  osType: 'windows' | 'linux' | 'network' | 'other';
  description: string;
}

export default function VmManager({ teamId, onVmsChanged }: VmManagerProps) {
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingVm, setEditingVm] = useState<VM | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'team-specific'>('all');

  const [formData, setFormData] = useState<VMFormData>({
    id: '',
    name: '',
    scope: 'global',
    ipAddress: '',
    osType: 'other',
    description: '',
  });

  // Fetch VMs
  const fetchVMs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = scopeFilter !== 'all' ? `/api/vms?scope=${scopeFilter}` : '/api/vms';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch VMs');
      const data = await response.json();
      setVms(data.vms || []);
    } catch (err) {
      setError('Failed to load VMs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [scopeFilter]);

  useEffect(() => {
    fetchVMs();
  }, [fetchVMs]);

  // Handle form input changes
  const handleInputChange = (field: keyof VMFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Create new VM
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id.trim() || !formData.name.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teamId: formData.scope === 'team-specific' ? teamId : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create VM');
      }

      // Reset form
      setFormData({
        id: '',
        name: '',
        scope: 'global',
        ipAddress: '',
        osType: 'other',
        description: '',
      });
      setIsCreating(false);
      await fetchVMs();
      onVmsChanged?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create VM');
    } finally {
      setIsLoading(false);
    }
  };

  // Update VM
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVm) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/vms/${editingVm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          ipAddress: formData.ipAddress,
          osType: formData.osType,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update VM');
      }

      setEditingVm(null);
      setFormData({
        id: '',
        name: '',
        scope: 'global',
        ipAddress: '',
        osType: 'other',
        description: '',
      });
      await fetchVMs();
      onVmsChanged?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update VM');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete VM
  const handleDelete = async (vmId: string) => {
    if (!confirm(`Delete VM "${vmId}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/vms/${vmId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete VM');
      await fetchVMs();
      onVmsChanged?.();
    } catch (err) {
      setError('Failed to delete VM');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing
  const startEdit = (vm: VM) => {
    setEditingVm(vm);
    setFormData({
      id: vm.id,
      name: vm.name,
      scope: vm.scope,
      ipAddress: vm.ipAddress || '',
      osType: vm.osType || 'other',
      description: vm.description || '',
    });
    setIsCreating(false);
  };

  // Cancel form
  const cancelForm = () => {
    setIsCreating(false);
    setEditingVm(null);
    setFormData({
      id: '',
      name: '',
      scope: 'global',
      ipAddress: '',
      osType: 'other',
      description: '',
    });
    setError(null);
  };

  // Get OS type color
  const getOsColor = (osType?: string) => {
    switch (osType) {
      case 'windows':
        return 'text-blue-400';
      case 'linux':
        return 'text-yellow-400';
      case 'network':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-white">Virtual Machines</h2>
          <p className="text-sm text-gray-400">Manage VMs for credential tracking</p>
        </div>
        <div className="flex gap-2">
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as typeof scopeFilter)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="all">All VMs</option>
            <option value="global">Global</option>
            <option value="team-specific">Team-specific</option>
          </select>
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingVm(null);
              setFormData({
                id: '',
                name: '',
                scope: 'global',
                ipAddress: '',
                osType: 'other',
                description: '',
              });
            }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            + Add VM
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            &times;
          </button>
        </div>
      )}

      {/* VM List */}
      <div className="p-4">
        {isLoading && !isCreating && !editingVm ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : vms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No VMs configured</p>
            <p className="text-sm">Add VMs to track which credentials work on which machines</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vms.map(vm => (
              <div
                key={vm.id}
                className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white truncate">{vm.name}</h3>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          vm.scope === 'global'
                            ? 'bg-blue-900/60 text-blue-200'
                            : 'bg-green-900/60 text-green-200'
                        }`}
                      >
                        {vm.scope === 'global' ? 'Global' : 'Team'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono mt-0.5">{vm.id}</p>
                    {vm.ipAddress && (
                      <p className="text-sm text-gray-500 mt-1">IP: {vm.ipAddress}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs ${getOsColor(vm.osType)}`}>
                        {vm.osType
                          ? vm.osType.charAt(0).toUpperCase() + vm.osType.slice(1)
                          : 'Other'}
                      </span>
                      {vm.teamId && (
                        <span className="text-xs text-gray-500">Team: {vm.teamId}</span>
                      )}
                    </div>
                    {vm.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{vm.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => startEdit(vm)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(vm.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(isCreating || editingVm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {editingVm ? 'Edit VM' : 'Add New VM'}
              </h3>
              <button
                onClick={cancelForm}
                className="text-gray-400 hover:text-white transition-colors"
              >
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

            <form onSubmit={editingVm ? handleUpdate : handleCreate} className="p-4 space-y-4">
              {/* ID Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  VM ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={e => handleInputChange('id', e.target.value)}
                  placeholder="e.g., dc01, web-server-01"
                  disabled={!!editingVm}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier (letters, numbers, hyphens, underscores)
                </p>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Domain Controller 01"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Scope Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Scope <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.scope}
                  onChange={e => handleInputChange('scope', e.target.value as VMFormData['scope'])}
                  disabled={!!editingVm}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="global">Global (all teams)</option>
                  <option value="team-specific">Team-specific</option>
                </select>
              </div>

              {/* IP Address Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">IP Address</label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={e => handleInputChange('ipAddress', e.target.value)}
                  placeholder="e.g., 192.168.1.10"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* OS Type Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">OS Type</label>
                <select
                  value={formData.osType}
                  onChange={e =>
                    handleInputChange('osType', e.target.value as VMFormData['osType'])
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="windows">Windows</option>
                  <option value="linux">Linux</option>
                  <option value="network">Network Device</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {isLoading ? 'Saving...' : editingVm ? 'Update VM' : 'Create VM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
