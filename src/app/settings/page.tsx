'use client';

import { useCallback, useEffect, useState } from 'react';

import VmManager from '@/app/components/VmManager';
import SharedCredentialsPanel from '@/app/components/SharedCredentialsPanel';
import { TeamSummary } from '@/types/teamVault';

interface TeamWithStats extends TeamSummary {
  totalCredentials: number;
  crackedCount: number;
}

export default function SettingsPage() {
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'vms' | 'shared'>('teams');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newTeamId, setNewTeamId] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      setError('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Clear team passwords
  const handleClearPasswords = async (teamId: string) => {
    if (!confirm('Are you sure you want to clear all passwords for this team?')) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/clear-passwords`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to clear passwords');

      const data = await response.json();
      setSuccessMessage(`Cleared ${data.clearedCount} passwords`);
      fetchTeams();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to clear passwords');
    }
  };

  // Create a new team
  const handleCreateTeam = async () => {
    if (!newTeamId.trim()) return;

    setIsCreatingTeam(true);
    try {
      const sanitizedId = newTeamId.trim().toLowerCase().replace(/\s+/g, '-');
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: sanitizedId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create team');
      }

      setNewTeamId('');
      setSuccessMessage(`Team "${sanitizedId}" created successfully`);
      fetchTeams();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  return (
    <main className="mx-auto px-4 lg:px-8 py-6 space-y-6 min-h-screen max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <a
          href="/"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          &larr; Back to Team Vault
        </a>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-400">Manage teams and VMs</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">
            &times;
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-300 text-sm">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-1">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'teams'
              ? 'bg-gray-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Teams ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('vms')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'vms'
              ? 'bg-gray-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Virtual Machines
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'shared'
              ? 'bg-gray-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Shared Credentials
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
        {activeTab === 'teams' ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Team Management</h2>

            {/* Create new team */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTeamId}
                onChange={e => setNewTeamId(e.target.value)}
                placeholder="Enter team ID (e.g., team5)"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-gray-500"
                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              />
              <button
                onClick={handleCreateTeam}
                disabled={!newTeamId.trim() || isCreatingTeam}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
              >
                {isCreatingTeam ? 'Creating...' : 'Create Team'}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading teams...</div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No teams found</p>
                <p className="text-sm mt-1">Create your first team above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                  >
                    <div>
                      <h3 className="font-medium text-white">{team.teamName}</h3>
                      <p className="text-sm text-gray-400">
                        {team.totalCredentials} credentials • {team.crackedCount} cracked
                      </p>
                    </div>
                    <button
                      onClick={() => handleClearPasswords(team.teamId)}
                      className="px-3 py-1.5 bg-yellow-900/50 hover:bg-yellow-900 text-yellow-200 rounded text-sm transition-colors"
                      title="Clear all passwords"
                    >
                      Clear Passwords
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'vms' ? (
          <VmManager />
        ) : (
          <SharedCredentialsPanel />
        )}
      </div>
    </main>
  );
}
