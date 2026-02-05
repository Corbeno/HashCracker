/**
 * Sync API - Sync cracked hashes from cracked.txt to all team vaults and shared credentials
 * POST /api/teams/sync - Sync all cracked passwords to teams and shared
 */

import { NextResponse } from 'next/server';

import { readCrackedHashes } from '@/utils/hashUtils';
import { logger } from '@/utils/logger';
import { sendEventToAll } from '@/utils/miscUtils';
import { broadcastTeamSummaries, broadcastTeamVaultUpdate } from '@/utils/teamEvents';
import { syncCrackedHashesToAllTeams } from '@/utils/teamStorage';
import { updateSharedCredentialPassword } from '@/utils/sharedStorage';

export async function POST() {
  try {
    // Read all cracked hashes from main cracked.txt file
    const crackedHashes = readCrackedHashes();

    if (crackedHashes.length === 0) {
      return NextResponse.json({
        success: true,
        teamsUpdated: 0,
        credentialsUpdated: 0,
        sharedUpdated: 0,
        message: 'No cracked hashes to sync',
      });
    }

    // Sync to all teams
    const teamResult = syncCrackedHashesToAllTeams(crackedHashes);

    // Also sync to shared credentials
    let sharedUpdated = 0;
    for (const { hash, password } of crackedHashes) {
      if (updateSharedCredentialPassword(hash, password)) {
        sharedUpdated++;
      }
    }

    if (teamResult.updatedTeamIds.length > 0) {
      teamResult.updatedTeamIds.forEach(teamId => broadcastTeamVaultUpdate(teamId));
      broadcastTeamSummaries();
      sendEventToAll('teamVaultsUpdated', teamResult);
    }

    // Broadcast shared credentials update if any were updated
    if (sharedUpdated > 0) {
      sendEventToAll('sharedCredentialsUpdated', {
        count: sharedUpdated,
      });
      broadcastTeamSummaries();
    }

    logger.info(
      `Synced cracked hashes: ${teamResult.credentialsUpdated} credentials updated across ${teamResult.teamsUpdated} teams, ${sharedUpdated} shared credentials updated`
    );

    return NextResponse.json({
      success: true,
      teamsUpdated: teamResult.teamsUpdated,
      credentialsUpdated: teamResult.credentialsUpdated,
      sharedUpdated,
      totalCrackedHashes: crackedHashes.length,
    });
  } catch (error) {
    logger.error('Error syncing cracked hashes:', error);
    return NextResponse.json({ error: 'Failed to sync cracked hashes' }, { status: 500 });
  }
}
