/**
 * Credential Management API - CRUD operations for team credentials
 * GET /api/teams/[teamId]/credentials - List all credentials
 * POST /api/teams/[teamId]/credentials - Create single credential
 */

import { NextResponse } from 'next/server';

import { TeamCredential, CredentialScope } from '@/types/teamVault';
import { broadcastCredentialCreated } from '@/utils/credentialEvents';
import { logger } from '@/utils/logger';
import { broadcastTeamVaultUpdate, broadcastTeamSummaries } from '@/utils/teamEvents';
import { getTeamVault, saveTeamVault, createTeamVault } from '@/utils/teamStorage';

interface CreateCredentialRequest {
  username?: string;
  hash?: string;
  password?: string;
  hashTypeId?: number;
  hashTypeName?: string;
  scope?: CredentialScope;
  vmIds?: string[];
  source?: string;
}

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

/**
 * GET - List all credentials for team
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const vault = getTeamVault(teamId);

    if (!vault) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({
      credentials: vault.credentials,
      count: vault.credentials.length,
    });
  } catch (error) {
    logger.error('Error listing credentials:', error);
    return NextResponse.json({ error: 'Failed to list credentials' }, { status: 500 });
  }
}

/**
 * POST - Create single credential
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const body: CreateCredentialRequest = await req.json();

    // Validation: At least ONE of username/hash/password required
    if (!body.username && !body.hash && !body.password) {
      return NextResponse.json(
        { error: 'At least one of username, hash, or password is required' },
        { status: 400 }
      );
    }

    // Get or create team vault
    let vault = getTeamVault(teamId);
    if (!vault) {
      vault = createTeamVault(teamId);
    }

    // Check for duplicate hash if hash provided
    if (body.hash) {
      const existingByHash = vault.credentials.find(
        c => c.hash.toLowerCase() === body.hash!.toLowerCase()
      );
      if (existingByHash) {
        return NextResponse.json(
          { error: 'A credential with this hash already exists' },
          { status: 409 }
        );
      }
    }

    // Create new credential
    const now = new Date().toISOString();
    const newCredential: TeamCredential = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hash: body.hash || '',
      hashTypeId: body.hashTypeId || 0,
      hashTypeName: body.hashTypeName || 'Unknown',
      username: body.username || null,
      password: body.password || null,
      credentialType: 'tsi',
      scope: body.scope || 'team-wide',
      vmIds: body.vmIds || [],
      source: body.source || 'manual',
      crackedAt: body.password ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    vault.credentials.push(newCredential);
    vault.updatedAt = now;
    saveTeamVault(vault);

    // Broadcast events
    broadcastCredentialCreated(teamId, newCredential);
    broadcastTeamVaultUpdate(teamId);
    broadcastTeamSummaries();

    logger.info(`Created credential ${newCredential.id} for team ${teamId}`);

    return NextResponse.json({ success: true, credential: newCredential }, { status: 201 });
  } catch (error) {
    logger.error('Error creating credential:', error);
    return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 });
  }
}
