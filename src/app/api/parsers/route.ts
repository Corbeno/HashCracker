import { NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { listParsers } from '@/utils/parsers/registry';

/**
 * GET /api/parsers
 * List all available parsers with their metadata
 */
export async function GET() {
  try {
    const parsers = listParsers();

    return NextResponse.json({
      parsers,
      count: parsers.length,
    });
  } catch (error) {
    logger.error('Error listing parsers:', error);
    return NextResponse.json({ error: 'Failed to list parsers' }, { status: 500 });
  }
}
