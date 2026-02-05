import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { createVM, listVMs } from '@/utils/vmStorage';

/**
 * GET /api/vms
 * List all VMs with optional scope filter
 * Query params: ?scope=global|team-specific
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as 'global' | 'team-specific' | null;

    const vms = listVMs(scope || undefined);

    return NextResponse.json({
      vms,
      count: vms.length,
      scope: scope || 'all',
    });
  } catch (error) {
    logger.error('Error listing VMs:', error);
    return NextResponse.json({ error: 'Failed to list VMs' }, { status: 500 });
  }
}

/**
 * POST /api/vms
 * Create a new VM
 * Body: { id, name, scope, teamId?, ipAddress?, osType?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'VM ID is required' }, { status: 400 });
    }

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'VM name is required' }, { status: 400 });
    }

    if (!body.scope || !['global', 'team-specific'].includes(body.scope)) {
      return NextResponse.json(
        { error: 'Scope must be "global" or "team-specific"' },
        { status: 400 }
      );
    }

    // Validate team-specific VMs have teamId
    if (body.scope === 'team-specific' && !body.teamId) {
      return NextResponse.json(
        { error: 'teamId is required for team-specific VMs' },
        { status: 400 }
      );
    }

    // Validate ID format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(body.id)) {
      return NextResponse.json(
        { error: 'VM ID must contain only letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    const vm = createVM({
      id: body.id,
      name: body.name,
      scope: body.scope,
      teamId: body.teamId,
      ipAddress: body.ipAddress,
      osType: body.osType || 'other',
      description: body.description,
    });

    return NextResponse.json(
      {
        vm,
        message: 'VM created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating VM:', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create VM' }, { status: 500 });
  }
}
