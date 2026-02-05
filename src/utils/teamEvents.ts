import { sendEventToAll } from './miscUtils';
import { getTeamSummaries, getTeamVaultWithShared } from './teamStorage';

import { TeamSummary, TeamVault } from '@/types/teamVault';

interface TeamVaultWithStats extends TeamVault {
  stats: {
    total: number;
    cracked: number;
    uncracked: number;
    shared: number;
    tsi: number;
  };
}

export function broadcastTeamSummaries(): TeamSummary[] {
  const teams = getTeamSummaries();
  sendEventToAll('teamSummariesUpdate', {
    teams,
    count: teams.length,
  });
  return teams;
}

export function broadcastTeamVaultUpdate(teamId: string): TeamVaultWithStats | null {
  const vault = getTeamVaultWithShared(teamId);

  if (!vault) {
    sendEventToAll('teamVaultDeleted', { teamId });
    return null;
  }

  const total = vault.credentials.length;
  const cracked = vault.credentials.filter(c => c.password !== null).length;
  const shared = vault.credentials.filter(c => c.credentialType === 'shared').length;
  const tsi = vault.credentials.filter(c => c.credentialType === 'tsi').length;

  const payload: TeamVaultWithStats = {
    ...vault,
    stats: {
      total,
      cracked,
      uncracked: total - cracked,
      shared,
      tsi,
    },
  };

  sendEventToAll('teamVaultUpdate', {
    teamId,
    vault: payload,
  });

  return payload;
}
