import { NextRequest, NextResponse } from 'next/server';

import config from '@/config';
import { logger } from '@/utils/logger';

export async function GET(req: NextRequest) {
  try {
    // Filter hash types to only include those with non-empty regex
    const hashTypesWithRegex = Object.entries(config.hashcat.hashTypes)
      .filter(([_, hashType]) => hashType.regex && hashType.regex.trim() !== '')
      .map(([id, hashType]) => ({
        id: parseInt(id),
        name: hashType.name,
        category: hashType.category || 'Other',
        regex: hashType.regex,
      }));

    logger.info(`Returning ${hashTypesWithRegex.length} hash types with regex patterns`);

    return NextResponse.json({ hashTypes: hashTypesWithRegex });
  } catch (error) {
    logger.error('Error in hash-types-with-regex API:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve hash types with regex' },
      { status: 500 }
    );
  }
}
