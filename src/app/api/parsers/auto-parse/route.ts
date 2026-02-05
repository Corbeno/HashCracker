import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import { autoParse } from '@/utils/parsers/registry';

/**
 * POST /api/parsers/auto-parse
 * Auto-detect format and parse text
 * Body: { text: string, options?: ParseOptions }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Limit text size (prevent DoS)
    const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB
    if (body.text.length > MAX_TEXT_SIZE) {
      return NextResponse.json({ error: 'Text exceeds maximum size of 10MB' }, { status: 400 });
    }

    logger.info(`Auto-parse API called: textLength=${body.text.length}`);

    // Parse options
    const options = {
      filterMachineAccounts: body.options?.filterMachineAccounts !== false,
      deduplicate: body.options?.deduplicate !== false,
    };

    // Auto-parse with all parsers
    const result = autoParse(body.text, options);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in auto-parse API:', error);

    return NextResponse.json({ error: 'Failed to parse text' }, { status: 500 });
  }
}
