/**
 * Credential Management API - Single credential operations
 * GET /api/teams/[teamId]/credentials/[credentialId] - Get single credential
 * PUT /api/teams/[teamId]/credentials/[credentialId] - Update credential
 * DELETE /api/teams/[teamId]/credentials/[credentialId] - Delete credential
 */

import { NextResponse } from 'next/server';

import { TeamCredential } from '@/types/teamVault';
import { broadcastCredentialUpdated, broadcastCredentialDeleted } from '@/utils/credentialEvents';
import { logger } from '@/utils/logger';
import { isSharedCredential } from '@/utils/sharedStorage';
import { broadcastTeamVaultUpdate, broadcastTeamSummaries } from '@/utils/teamEvents';
import { getTeamVault, saveTeamVault } from '@/utils/teamStorage';

interface RouteParams {
  params: Promise<{ teamId: string; credentialId: string }>;
}

/**
 * GET - Get single credential
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { teamId, credentialId } = await params;
    const vault = getTeamVault(teamId);

    if (!vault) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const credential = vault.credentials.find(c => c.id === credentialId);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ credential });
  } catch (error) {
    logger.error('Error getting credential:', error);
    return NextResponse.json({ error: 'Failed to get credential' }, { status: 500 });
  }
}

/**
 * PUT - Update credential
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { teamId, credentialId } = await params;
    const updates = await req.json();

    const vault = getTeamVault(teamId);
    if (!vault) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const credIndex = vault.credentials.findIndex(c => c.id === credentialId);
    if (credIndex === -1) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const credential = vault.credentials[credIndex];

    // Don't allow editing shared credentials from team endpoint
    if (isSharedCredential(credential)) {
      return NextResponse.json(
        { error: 'Cannot edit shared credentials from team view' },
        { status: 403 }
      );
    }

    // Track changed fields
    const changedFields: string[] = [];
    const allowedFields = [
      'username',
      'hash',
      'password',
      'hashTypeId',
      'hashTypeName',
      'scope',
      'vmIds',
      'source',
    ];

    for (const field of allowedFields) {
      if (
        updates[field] !== undefined &&
        updates[field] !== credential[field as keyof TeamCredential]
      ) {
        changedFields.push(field);
        (credential as any)[field] = updates[field];
      }
    }

    // Update crackedAt if password is being set
    if (updates.password && !credential.crackedAt) {
      credential.crackedAt = new Date().toISOString();
      changedFields.push('crackedAt');
    }

    credential.updatedAt = new Date().toISOString();
    vault.updatedAt = credential.updatedAt;
    saveTeamVault(vault);

    // Broadcast events
    broadcastCredentialUpdated(teamId, credential, changedFields);
    broadcastTeamVaultUpdate(teamId);
    broadcastTeamSummaries();

    logger.info(
      `Updated credential ${credentialId} for team ${teamId}: ${changedFields.join(', ')}`
    );

    return NextResponse.json({ success: true, credential, changedFields });
  } catch (error) {
    logger.error('Error updating credential:', error);
    return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 });
  }
}

/**
 * DELETE - Delete credential
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { teamId, credentialId } = await params;

    const vault = getTeamVault(teamId);
    if (!vault) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const credIndex = vault.credentials.findIndex(c => c.id === credentialId);
    if (credIndex === -1) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const credential = vault.credentials[credIndex];

    // Don't allow deleting shared credentials from team endpoint
    if (isSharedCredential(credential)) {
      return NextResponse.json(
        { error: 'Cannot delete shared credentials from team view' },
        { status: 403 }
      );
    }

    // Remove credential
    vault.credentials.splice(credIndex, 1);
    vault.updatedAt = new Date().toISOString();
    saveTeamVault(vault);

    // Broadcast events
    broadcastCredentialDeleted(teamId, credentialId, credential.hash);
    broadcastTeamVaultUpdate(teamId);
    broadcastTeamSummaries();

    logger.info(`Deleted credential ${credentialId} from team ${teamId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error deleting credential:', error);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}
