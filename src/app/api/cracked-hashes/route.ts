import { NextRequest, NextResponse } from 'next/server';

import { HASH_TYPE_CASE_SENSITIVITY } from '@/config/hashTypes';
import { readHashVaultByType } from '@/utils/hashVaultStore';
import { logger } from '@/utils/logger';

export async function GET(req: NextRequest) {
  try {
    const hashTypeRaw = req.nextUrl.searchParams.get('hashType');
    const hashType = hashTypeRaw != null ? Number(hashTypeRaw) : NaN;
    if (!Number.isFinite(hashType)) {
      return NextResponse.json({ error: 'hashType query param is required' }, { status: 400 });
    }

    const isCaseSensitive = HASH_TYPE_CASE_SENSITIVITY[hashType] ?? true;
    const entries = readHashVaultByType(hashType);

    const crackedHashes: Record<string, { password: string; isCaseSensitive: boolean }> = {};
    for (const entry of entries) {
      crackedHashes[entry.hash] = {
        password: entry.password || '',
        isCaseSensitive,
      };
    }

    logger.info(
      `Returning ${Object.keys(crackedHashes).length} cracked hashes for type ${hashType}`
    );
    return NextResponse.json({ crackedHashes });
  } catch (error) {
    logger.error('Error fetching cracked hashes:', error);
    return NextResponse.json({ error: 'Failed to fetch cracked hashes' }, { status: 500 });
  }
}
