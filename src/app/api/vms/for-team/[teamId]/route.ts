import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { getVMsForTeam } from '@/utils/vmStorage';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

/**
 * GET /api/vms/for-team/[teamId]
 * Get all VMs visible to a specific team
 * Returns global VMs + team-specific VMs for that team
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const vms = getVMsForTeam(teamId);

    // Separate by scope for easier client-side handling
    const globalVMs = vms.filter(vm => vm.scope === 'global');
    const teamSpecificVMs = vms.filter(vm => vm.scope === 'team-specific');

    return NextResponse.json({
      vms,
      globalVMs,
      teamSpecificVMs,
      count: vms.length,
      teamId,
    });
  } catch (error) {
    logger.error(`Error getting VMs for team:`, error);
    return NextResponse.json({ error: 'Failed to get VMs for team' }, { status: 500 });
  }
}
