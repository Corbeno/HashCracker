/**
 * Teams API - List all teams and create new teams
 * GET /api/teams - List all team summaries
 * POST /api/teams - Create a new team
 */

import { NextResponse } from 'next/server';

import { CreateTeamRequest } from '@/types/teamVault';
import { logger } from '@/utils/logger';
import { broadcastTeamSummaries, broadcastTeamVaultUpdate } from '@/utils/teamEvents';
import { createTeamVault, getTeamSummaries, listTeams } from '@/utils/teamStorage';

export async function GET() {
  try {
    const summaries = getTeamSummaries();
    logger.info(`Returning ${summaries.length} team summaries`);

    return NextResponse.json({
      teams: summaries,
      count: summaries.length,
    });
  } catch (error) {
    logger.error('Error fetching team summaries:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateTeamRequest;

    if (!body.teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Validate teamId format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(body.teamId)) {
      return NextResponse.json(
        { error: 'teamId must be alphanumeric (underscores and hyphens allowed)' },
        { status: 400 }
      );
    }

    // Check if team already exists
    const existingTeams = listTeams();
    if (existingTeams.includes(body.teamId)) {
      return NextResponse.json({ error: 'Team already exists' }, { status: 409 });
    }

    const vault = createTeamVault(body.teamId, body.teamName);
    logger.info(`Created new team: ${body.teamId}`);

    broadcastTeamSummaries();
    broadcastTeamVaultUpdate(vault.teamId);

    return NextResponse.json({
      success: true,
      team: {
        teamId: vault.teamId,
        teamName: vault.teamName,
        totalCredentials: 0,
        crackedCount: 0,
        uncrackedCount: 0,
        lastUpdated: vault.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
