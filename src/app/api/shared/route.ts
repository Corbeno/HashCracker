/**
 * Shared Credentials API - CRUD operations for global shared credentials
 * GET /api/shared - List all shared credentials
 * POST /api/shared - Create new shared credential
 * PUT /api/shared/[id] - Update shared credential
 * DELETE /api/shared/[id] - Delete shared credential
 */

import { NextRequest, NextResponse } from 'next/server';

import { TeamCredential, CredentialScope } from '@/types/teamVault';
import { broadcastSharedCredentialUpdated } from '@/utils/credentialEvents';
import { logger } from '@/utils/logger';
import { broadcastTeamSummaries } from '@/utils/teamEvents';
import {
  addSharedCredential,
  getAllSharedCredentials,
  removeSharedCredential,
  updateSharedCredential,
} from '@/utils/sharedStorage';

/**
 * GET - List all shared credentials
 */
export async function GET() {
  try {
    const credentials = getAllSharedCredentials();
    return NextResponse.json({
      credentials,
      count: credentials.length,
    });
  } catch (error) {
    logger.error('Error listing shared credentials:', error);
    return NextResponse.json({ error: 'Failed to list shared credentials' }, { status: 500 });
  }
}

/**
 * POST - Create new shared credential
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation: At least ONE of username/hash/password required
    if (!body.username && !body.hash && !body.password) {
      return NextResponse.json(
        { error: 'At least one of username, hash, or password is required' },
        { status: 400 }
      );
    }

    // Hash is required (user might know plaintext password without hash)
    if (!body.hash && !body.password) {
      return NextResponse.json(
        { error: 'Either hash or password must be provided' },
        { status: 400 }
      );
    }

    // If password provided without hash, we'll store it as cracked
    // For proper implementation, we'd hash it, but for now store both
    const newCredential = addSharedCredential({
      hash: body.hash || '', // May be empty if only password known
      hashTypeId: body.hashTypeId || 0,
      hashTypeName: body.hashTypeName || 'Unknown',
      username: body.username || null,
      password: body.password || null,
      vmIds: body.vmIds || [],
      source: body.source || 'manual',
      scope: 'global', // Shared credentials always have global scope
      crackedAt: body.password ? new Date().toISOString() : null,
    });

    // Broadcast update to all connected clients
    broadcastSharedCredentialUpdated(newCredential);
    broadcastTeamSummaries();

    logger.info(`Created shared credential: ${newCredential.id}`);

    return NextResponse.json({ success: true, credential: newCredential }, { status: 201 });
  } catch (error) {
    logger.error('Error creating shared credential:', error);
    return NextResponse.json({ error: 'Failed to create shared credential' }, { status: 500 });
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT - Update shared credential
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Build updates object - only include provided fields
    const updates: Partial<TeamCredential> = {};

    if (body.username !== undefined) updates.username = body.username;
    if (body.hash !== undefined) updates.hash = body.hash;
    if (body.password !== undefined) updates.password = body.password;
    if (body.hashTypeId !== undefined) updates.hashTypeId = body.hashTypeId;
    if (body.hashTypeName !== undefined) updates.hashTypeName = body.hashTypeName;
    if (body.vmIds !== undefined) updates.vmIds = body.vmIds;
    if (body.source !== undefined) updates.source = body.source;

    const updated = updateSharedCredential(id, updates);

    if (!updated) {
      return NextResponse.json({ error: 'Shared credential not found' }, { status: 404 });
    }

    // Broadcast update to all connected clients
    broadcastSharedCredentialUpdated(updated);
    broadcastTeamSummaries();

    logger.info(`Updated shared credential: ${id}`);

    return NextResponse.json({ success: true, credential: updated });
  } catch (error) {
    logger.error('Error updating shared credential:', error);
    return NextResponse.json({ error: 'Failed to update shared credential' }, { status: 500 });
  }
}

/**
 * DELETE - Delete shared credential
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const deleted = removeSharedCredential(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Shared credential not found' }, { status: 404 });
    }

    // Broadcast update to all teams (since shared credentials are merged)
    broadcastTeamSummaries();

    logger.info(`Deleted shared credential: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting shared credential:', error);
    return NextResponse.json({ error: 'Failed to delete shared credential' }, { status: 500 });
  }
}
