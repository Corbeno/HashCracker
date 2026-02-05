import { NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { broadcastTeamSummaries, broadcastTeamVaultUpdate } from '@/utils/teamEvents';
import { clearTeamPasswords } from '@/utils/teamStorage';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

/**
 * POST /api/teams/[teamId]/clear-passwords
 * Clear all passwords from a team's credentials (set them back to null)
 */
export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const result = clearTeamPasswords(teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to clear passwords' },
        { status: 404 }
      );
    }

    logger.info(`Cleared ${result.clearedCount} passwords from team ${teamId}`);

    broadcastTeamVaultUpdate(teamId);
    broadcastTeamSummaries();

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.clearedCount} passwords`,
      clearedCount: result.clearedCount,
    });
  } catch (error) {
    logger.error('Error clearing team passwords:', error);
    return NextResponse.json({ error: 'Failed to clear passwords' }, { status: 500 });
  }
}
