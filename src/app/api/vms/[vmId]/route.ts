import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { deleteVM, getVM, updateVM } from '@/utils/vmStorage';

/**
 * GET /api/vms/[vmId]
 * Get a single VM by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ vmId: string }> }) {
  try {
    const { vmId } = await params;
    const vm = getVM(vmId);

    if (!vm) {
      return NextResponse.json({ error: 'VM not found' }, { status: 404 });
    }

    return NextResponse.json({ vm });
  } catch (error) {
    logger.error('Error getting VM:', error);
    return NextResponse.json({ error: 'Failed to get VM' }, { status: 500 });
  }
}

/**
 * PUT /api/vms/[vmId]
 * Update an existing VM
 * Body: { name?, ipAddress?, osType?, description? }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ vmId: string }> }) {
  try {
    const { vmId } = await params;
    const body = await request.json();

    // Check if VM exists
    const existing = getVM(vmId);
    if (!existing) {
      return NextResponse.json({ error: 'VM not found' }, { status: 404 });
    }

    // Validate fields if provided
    if (body.name !== undefined && (!body.name || typeof body.name !== 'string')) {
      return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
    }

    if (
      body.osType !== undefined &&
      !['windows', 'linux', 'network', 'other'].includes(body.osType)
    ) {
      return NextResponse.json({ error: 'Invalid OS type' }, { status: 400 });
    }

    const updates: Parameters<typeof updateVM>[1] = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.ipAddress !== undefined) updates.ipAddress = body.ipAddress;
    if (body.osType !== undefined) updates.osType = body.osType;
    if (body.description !== undefined) updates.description = body.description;

    const updated = updateVM(vmId, updates);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update VM' }, { status: 500 });
    }

    return NextResponse.json({
      vm: updated,
      message: 'VM updated successfully',
    });
  } catch (error) {
    logger.error('Error updating VM:', error);
    return NextResponse.json({ error: 'Failed to update VM' }, { status: 500 });
  }
}

/**
 * DELETE /api/vms/[vmId]
 * Delete a VM
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vmId: string }> }
) {
  try {
    const { vmId } = await params;

    // Check if VM exists
    const existing = getVM(vmId);
    if (!existing) {
      return NextResponse.json({ error: 'VM not found' }, { status: 404 });
    }

    const deleted = deleteVM(vmId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete VM' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'VM deleted successfully',
      vmId,
    });
  } catch (error) {
    logger.error('Error deleting VM:', error);
    return NextResponse.json({ error: 'Failed to delete VM' }, { status: 500 });
  }
}
