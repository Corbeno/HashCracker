/**
 * Team Vault API - Get, update, and delete a specific team's vault
 * GET /api/teams/[teamId] - Get team vault with all credentials
 * DELETE /api/teams/[teamId] - Delete a team vault
 */

import { NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { getAllSharedCredentials } from '@/utils/sharedStorage';
import { broadcastTeamSummaries, broadcastTeamVaultUpdate } from '@/utils/teamEvents';
import { deleteTeamVault, getTeamVault, clearTeamCredentials } from '@/utils/teamStorage';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const vault = getTeamVault(teamId);

    if (!vault) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get shared credentials
    const sharedCredentials = getAllSharedCredentials();

    // Merge team credentials with shared credentials
    // Team TSI credentials take precedence (deduplicate by hash)
    const teamHashes = new Set(vault.credentials.map(c => c.hash.toLowerCase()));
    const mergedCredentials = [
      ...vault.credentials,
      ...sharedCredentials.filter(c => !teamHashes.has(c.hash.toLowerCase())),
    ];

    // Calculate stats
    const crackedCount = mergedCredentials.filter(c => c.password !== null).length;
    const sharedCount = mergedCredentials.filter(c => c.credentialType === 'shared').length;
    const tsiCount = mergedCredentials.filter(c => c.credentialType === 'tsi').length;

    logger.info(
      `Returning vault for team ${teamId} (${vault.credentials.length} TSI + ${sharedCount} shared credentials)`
    );

    return NextResponse.json({
      ...vault,
      credentials: mergedCredentials,
      stats: {
        total: mergedCredentials.length,
        cracked: crackedCount,
        uncracked: mergedCredentials.length - crackedCount,
        shared: sharedCount,
        tsi: tsiCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching team vault:', error);
    return NextResponse.json({ error: 'Failed to fetch team vault' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const url = new URL(req.url);
    const clearOnly = url.searchParams.get('clearOnly') === 'true';

    if (clearOnly) {
      // Only clear credentials, don't delete the team
      const success = clearTeamCredentials(teamId);
      if (!success) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      logger.info(`Cleared credentials from team ${teamId}`);
      broadcastTeamVaultUpdate(teamId);
      broadcastTeamSummaries();
      return NextResponse.json({ success: true, message: 'Credentials cleared' });
    } else {
      // Delete the entire team
      const success = deleteTeamVault(teamId);
      if (!success) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      logger.info(`Deleted team ${teamId}`);
      broadcastTeamSummaries();
      broadcastTeamVaultUpdate(teamId);
      return NextResponse.json({ success: true, message: 'Team deleted' });
    }
  } catch (error) {
    logger.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
