import { NextResponse } from 'next/server';

import { readCrackedHashes } from '@/utils/hashUtils';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const entries = readCrackedHashes();

    const crackedHashes: Record<string, { password: string; isCaseSensitive: boolean }> = {};

    for (const entry of entries) {
      const isHexHash = /^[a-fA-F0-9]+$/.test(entry.hash);
      crackedHashes[entry.hash] = {
        password: entry.password || '',
        isCaseSensitive: !isHexHash,
      };
    }

    logger.info(`Returning ${Object.keys(crackedHashes).length} cracked hashes`);

    return NextResponse.json({ crackedHashes });
  } catch (error) {
    logger.error('Error fetching cracked hashes:', error);
    return NextResponse.json({ error: 'Failed to fetch cracked hashes' }, { status: 500 });
  }
}
