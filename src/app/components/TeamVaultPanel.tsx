'use client';

import { useCallback, useEffect, useState } from 'react';

import InlineCredentialEditor from './InlineCredentialEditor';
import ShowMoreButton from './ShowMoreButton';
import VmBadge from './VmBadge';

import { TeamCredential, TeamSummary, TeamVault, VM } from '@/types/teamVault';

interface TeamVaultPanelProps {
  onCrackHashes?: (hashes: string[], hashType: number) => void;
  onTeamSelect?: (teamId: string | null) => void;
  onImportClick?: () => void;
  refreshTrigger?: number; // Increment to trigger refresh
}

export default function TeamVaultPanel({
  onCrackHashes,
  onTeamSelect,
  onImportClick,
  refreshTrigger,
}: TeamVaultPanelProps) {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null);

  // Wrapper for setSelectedTeamId that also calls the callback
  const setSelectedTeamId = useCallback(
    (teamId: string | null) => {
      setSelectedTeamIdState(teamId);
      onTeamSelect?.(teamId);
    },
    [onTeamSelect]
  );
  const [selectedVault, setSelectedVault] = useState<TeamVault | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [vms, setVms] = useState<VM[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'shared' | 'tsi'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<TeamCredential | null>(null);
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const MAX_VISIBLE_CREDENTIALS = 25;

  // Fetch all teams
  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      setError('Failed to load teams');
      console.error(err);
    }
  }, []);

  // Fetch a specific team's vault
  const fetchTeamVault = useCallback(async (teamId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) throw new Error('Failed to fetch team vault');
      const data = await response.json();
      setSelectedVault(data);
    } catch (err) {
      setError('Failed to load team vault');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const handleTeamSummariesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ teams?: TeamSummary[] }>;
      const updatedTeams = customEvent.detail?.teams ?? [];
      setTeams(updatedTeams);

      if (selectedTeamId && !updatedTeams.some(team => team.teamId === selectedTeamId)) {
        setSelectedTeamId(null);
        setSelectedVault(null);
      }
    };

    const handleTeamVaultUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ teamId: string; vault: TeamVault }>;
      if (customEvent.detail?.teamId !== selectedTeamId) {
        return;
      }
      setSelectedVault(customEvent.detail.vault);
    };

    const handleTeamVaultDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ teamId: string }>;
      if (customEvent.detail?.teamId === selectedTeamId) {
        setSelectedTeamId(null);
        setSelectedVault(null);
      }
    };

    window.addEventListener('teamSummariesUpdate', handleTeamSummariesUpdate as EventListener);
    window.addEventListener('teamVaultUpdate', handleTeamVaultUpdate as EventListener);
    window.addEventListener('teamVaultDeleted', handleTeamVaultDeleted as EventListener);

    return () => {
      window.removeEventListener('teamSummariesUpdate', handleTeamSummariesUpdate as EventListener);
      window.removeEventListener('teamVaultUpdate', handleTeamVaultUpdate as EventListener);
      window.removeEventListener('teamVaultDeleted', handleTeamVaultDeleted as EventListener);
    };
  }, [selectedTeamId, setSelectedTeamId]);

  // Load vault when team is selected or refresh is triggered
  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamVault(selectedTeamId);
      // Fetch VMs for this team
      fetch(`/api/vms/for-team/${selectedTeamId}`)
        .then(res => res.json())
        .then(data => setVms(data.vms || []))
        .catch(console.error);
    } else {
      setSelectedVault(null);
      setVms([]);
    }
  }, [selectedTeamId, fetchTeamVault, refreshTrigger]);

  // Delete a team
  const handleDeleteTeam = async (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${teamId}" and all its credentials?`)) return;

    try {
      const response = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete team');

      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
        setSelectedVault(null);
      }
    } catch (err) {
      setError('Failed to delete team');
      console.error(err);
    }
  };

  // Clear all credentials from a team
  const handleClearCredentials = async () => {
    if (!selectedTeamId) return;
    if (!confirm('Clear all credentials from this team?')) return;

    try {
      const response = await fetch(`/api/teams/${selectedTeamId}?clearOnly=true`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear credentials');
    } catch (err) {
      setError('Failed to clear credentials');
      console.error(err);
    }
  };

  // Remove a single credential
  const handleRemoveCredential = async (credentialId: string) => {
    if (!selectedTeamId) return;
    if (!confirm('Delete this credential?')) return;

    try {
      const response = await fetch(`/api/teams/${selectedTeamId}/credentials/${credentialId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove credential');
    } catch (err) {
      setError('Failed to remove credential');
      console.error(err);
    }
  };

  // Sync cracked hashes from main cracked.txt to all teams
  const handleSyncCracked = async () => {
    try {
      const response = await fetch('/api/teams/sync', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sync');
      const data = await response.json();

      alert(`Synced ${data.credentialsUpdated} passwords across ${data.teamsUpdated} teams`);
    } catch (err) {
      setError('Failed to sync');
      console.error(err);
    }
  };

  // Crack uncracked hashes (grouped by hash type)
  const handleCrackUncracked = () => {
    if (!selectedVault || !onCrackHashes) return;

    const uncracked = selectedVault.credentials.filter(c => c.password === null);

    if (uncracked.length === 0) {
      alert('No uncracked hashes!');
      return;
    }

    // Group by hash type and crack the most common type
    const byType = new Map<number, string[]>();
    for (const c of uncracked) {
      const existing = byType.get(c.hashTypeId) || [];
      existing.push(c.hash);
      byType.set(c.hashTypeId, existing);
    }

    // Find the hash type with most hashes
    let maxType = 0;
    let maxHashes: string[] = [];
    for (const [type, hashes] of byType) {
      if (hashes.length > maxHashes.length) {
        maxType = type;
        maxHashes = hashes;
      }
    }

    onCrackHashes(maxHashes, maxType);
  };

  // Scope badge helper
  const getScopeBadge = (scope: string | undefined) => {
    switch (scope) {
      case 'global':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-900/60 text-purple-200">
            Global
          </span>
        );
      case 'team-wide':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900/60 text-blue-200">
            Team-wide
          </span>
        );
      case 'vm-specific':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-900/60 text-green-200">
            VM-specific
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
            Unknown
          </span>
        );
    }
  };

  // Filter credentials by type and scope
  const filteredCredentials = selectedVault
    ? selectedVault.credentials.filter(c => {
        // Type filter
        if (typeFilter !== 'all' && c.credentialType !== typeFilter) return false;
        // Scope filter
        if (scopeFilter !== 'all' && c.scope !== scopeFilter) return false;
        return true;
      })
    : [];

  // Get visible credentials based on expansion state
  const visibleCredentials = expanded
    ? filteredCredentials
    : filteredCredentials.slice(0, MAX_VISIBLE_CREDENTIALS);

  const uncrackedCount = filteredCredentials.filter(c => c.password === null).length || 0;

  return (
    <>
      {/* Inline Credential Editor - Rendered OUTSIDE scrollable container */}
      {isEditorOpen && (
        <InlineCredentialEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          teamId={selectedTeamId || ''}
          credential={editingCredential || undefined}
          onSave={() => {
            if (selectedTeamId) {
              fetchTeamVault(selectedTeamId);
            }
          }}
        />
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 min-h-full">
        {/* Two-column layout */}
        <div className="flex min-h-[500px] h-full">
          {/* Left sidebar - Team list */}
          <div className="w-40 bg-gray-900/50 border-r border-gray-700 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Teams</h3>
            </div>

            {/* Team list */}
            <div className="flex-1 overflow-y-auto">
              {teams.map(team => (
                <div
                  key={team.teamId}
                  onClick={() => setSelectedTeamId(team.teamId)}
                  className={`group flex items-center justify-between px-3 py-2 cursor-pointer border-l-2 transition-colors ${
                    selectedTeamId === team.teamId
                      ? 'bg-gray-800 border-blue-500 text-white'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{team.teamName}</div>
                    <div className="text-xs text-gray-500">
                      {team.crackedCount}/{team.totalCredentials} cracked
                    </div>
                  </div>
                  <button
                    onClick={e => handleDeleteTeam(team.teamId, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-1"
                    title="Delete team"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}

              {teams.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  No teams yet
                  <p className="text-xs mt-1">Create teams in Settings</p>
                </div>
              )}
            </div>
          </div>

          {/* Right content - Credentials */}
          <div className="flex-1 flex flex-col">
            {error && (
              <div className="m-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
                  &times;
                </button>
              </div>
            )}

            {selectedTeamId && selectedVault ? (
              <>
                {/* // Header with actions  */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedVault.teamName}</h2>
                    <p className="text-sm text-gray-400">
                      {selectedVault.credentials.length} credentials
                      {uncrackedCount > 0 && (
                        <span className="text-yellow-500 ml-2">({uncrackedCount} uncracked)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCredential(null);
                        setIsEditorOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add Credential
                    </button>
                    <button
                      onClick={() => onImportClick?.()}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      Import Hashes
                    </button>
                    {onCrackHashes && uncrackedCount > 0 && (
                      <button
                        onClick={handleCrackUncracked}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        Crack {uncrackedCount}
                      </button>
                    )}
                    <button
                      onClick={handleSyncCracked}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                      title="Sync cracked passwords from hashcat"
                    >
                      Sync
                    </button>
                    <button
                      onClick={handleClearCredentials}
                      className="px-3 py-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded text-sm transition-colors"
                      title="Clear all credentials"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* // Filter bar */}
                <div className="px-4 py-2 border-b border-gray-700 flex gap-2 items-center">
                  <span className="text-sm text-gray-400">Filter:</span>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="shared">Shared</option>
                    <option value="tsi">TSI</option>
                  </select>
                  <select
                    value={scopeFilter}
                    onChange={e => setScopeFilter(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                  >
                    <option value="all">All Scopes</option>
                    <option value="global">Global Only</option>
                    <option value="team-wide">Team-wide Only</option>
                    <option value="vm-specific">VM-specific Only</option>
                  </select>
                  <span className="text-sm text-gray-500 ml-2">
                    ({filteredCredentials.length} credentials)
                  </span>
                </div>

                {/* // Credentials list */}
                <div className="flex-1 overflow-auto p-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading...</div>
                  ) : filteredCredentials.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="mb-2">No credentials yet</p>
                      <button
                        onClick={() => onImportClick?.()}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Import hashes to get started
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
                            <th className="pb-2 font-medium">Scope</th>
                            <th className="pb-2 font-medium">VMs</th>
                            <th className="pb-2 font-medium w-24">Password</th>
                            <th className="pb-2 w-24"></th>
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
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-xs">
                                    {credential.hashTypeName}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      credential.credentialType === 'shared'
                                        ? 'bg-purple-900/60 text-purple-200'
                                        : 'bg-orange-900/60 text-orange-200'
                                    }`}
                                  >
                                    {credential.credentialType === 'shared' ? 'Shared' : 'TSI'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 pr-4">{getScopeBadge(credential.scope)}</td>
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
                              <td className="py-2 w-24">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1 pr-2">
                                  {/* Crack bolt — only for uncracked hashes */}
                                  {credential.password === null && onCrackHashes && (
                                    <button
                                      onClick={() =>
                                        onCrackHashes([credential.hash], credential.hashTypeId)
                                      }
                                      className="text-blue-400 hover:text-blue-300 p-1"
                                      title="Crack this hash"
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
                                          d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                  {/* Edit pencil — hidden for shared creds */}
                                  {credential.credentialType !== 'shared' && (
                                    <button
                                      onClick={() => {
                                        setEditingCredential(credential);
                                        setIsEditorOpen(true);
                                      }}
                                      className="text-gray-400 hover:text-blue-300 p-1"
                                      title="Edit credential"
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
                                  )}
                                  {/* Delete trash — hidden for shared creds */}
                                  {credential.credentialType !== 'shared' && (
                                    <button
                                      onClick={() => handleRemoveCredential(credential.id)}
                                      className="text-gray-400 hover:text-red-400 p-1"
                                      title="Delete credential"
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
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredCredentials.length > MAX_VISIBLE_CREDENTIALS && (
                        <div className="mt-4">
                          <ShowMoreButton
                            expanded={expanded}
                            toggleExpanded={() => setExpanded(!expanded)}
                            totalCount={filteredCredentials.length}
                            visibleCount={visibleCredentials.length}
                            itemName="credentials"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {teams.length > 0 ? (
                  <p>Select a team to view credentials</p>
                ) : (
                  <div className="text-center">
                    <p className="mb-2">Create a team to get started</p>
                    <p className="text-sm text-gray-600">Use the input on the left</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
