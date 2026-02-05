import { NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { getAllSharedCredentials } from '@/utils/sharedStorage';
import { broadcastTeamSummaries, broadcastTeamVaultUpdate } from '@/utils/teamEvents';
import { addHashesToTeam, listTeams } from '@/utils/teamStorage';

/**
 * POST /api/shared/sync-to-teams
 * Sync shared credentials to all team vaults
 * This ensures all teams have the latest shared credentials
 */
export async function POST() {
  try {
    const sharedCredentials = getAllSharedCredentials();
    const teamIds = listTeams();

    if (sharedCredentials.length === 0) {
      return NextResponse.json({
        success: true,
        teamsUpdated: 0,
        credentialsSynced: 0,
        message: 'No shared credentials to sync',
      });
    }

    let teamsUpdated = 0;
    let totalCredentialsAdded = 0;
    const results: Array<{
      teamId: string;
      added: number;
      duplicates: number;
    }> = [];

    // Sync to each team
    for (const teamId of teamIds) {
      try {
        let teamAdded = 0;
        let teamDuplicates = 0;

        // Group shared credentials by hash type for efficient import
        const byHashType = new Map<number, { hashes: string[]; usernames: (string | null)[] }>();

        for (const cred of sharedCredentials) {
          const existing = byHashType.get(cred.hashTypeId) || { hashes: [], usernames: [] };
          existing.hashes.push(cred.hash);
          existing.usernames.push(cred.username);
          byHashType.set(cred.hashTypeId, existing);
        }

        // Add credentials for each hash type
        for (const [hashTypeId, data] of byHashType) {
          const { added, duplicates } = addHashesToTeam(
            teamId,
            data.hashes,
            hashTypeId,
            'Shared', // Use 'Shared' as hash type name
            data.usernames.map(u => u ?? undefined)
          );
          teamAdded += added;
          teamDuplicates += duplicates;
        }

        if (teamAdded > 0) {
          teamsUpdated++;
          totalCredentialsAdded += teamAdded;
          broadcastTeamVaultUpdate(teamId);
        }

        results.push({
          teamId,
          added: teamAdded,
          duplicates: teamDuplicates,
        });
      } catch (error) {
        logger.error(`Failed to sync shared credentials to team ${teamId}:`, error);
        results.push({
          teamId,
          added: 0,
          duplicates: 0,
        });
      }
    }

    logger.info(
      `Synced shared credentials to ${teamsUpdated} teams, ${totalCredentialsAdded} credentials added`
    );

    if (totalCredentialsAdded > 0) {
      broadcastTeamSummaries();
    }

    return NextResponse.json({
      success: true,
      teamsUpdated,
      credentialsSynced: totalCredentialsAdded,
      totalSharedCredentials: sharedCredentials.length,
      teamsTotal: teamIds.length,
      results,
    });
  } catch (error) {
    logger.error('Error syncing shared credentials:', error);
    return NextResponse.json({ error: 'Failed to sync shared credentials' }, { status: 500 });
  }
}
