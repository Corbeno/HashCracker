import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { parseWithParser } from '@/utils/parsers/registry';

/**
 * POST /api/parsers/parse
 * Parse text with a specific parser
 * Body: { parserId: string, text: string, options?: ParseOptions }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.parserId || typeof body.parserId !== 'string') {
      return NextResponse.json({ error: 'parserId is required' }, { status: 400 });
    }

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Limit text size (prevent DoS)
    const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB
    if (body.text.length > MAX_TEXT_SIZE) {
      return NextResponse.json({ error: 'Text exceeds maximum size of 10MB' }, { status: 400 });
    }

    logger.info(`Parser API called: parserId=${body.parserId}, textLength=${body.text.length}`);

    // Parse options
    const options = {
      filterMachineAccounts: body.options?.filterMachineAccounts !== false,
      deduplicate: body.options?.deduplicate !== false,
    };

    // Parse with specified parser
    const result = parseWithParser(body.parserId, body.text, options);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in parser API:', error);

    if (error instanceof Error && error.message.includes('Parser not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to parse text' }, { status: 500 });
  }
}
