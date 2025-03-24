import fs from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const crackedHashesPath = path.join(process.cwd(), 'data', 'hashes', 'cracked.txt');

    if (!fs.existsSync(crackedHashesPath)) {
      logger.warn('Cracked hashes file not found');
      return NextResponse.json({ crackedHashes: {} });
    }

    const fileContent = fs.readFileSync(crackedHashesPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    const crackedHashes: Record<string, string> = {};

    for (const line of lines) {
      const [hash, password] = line.split(':');
      if (hash) {
        crackedHashes[hash] = password || '';
      }
    }

    logger.info(`Returning ${Object.keys(crackedHashes).length} cracked hashes`);

    return NextResponse.json({ crackedHashes });
  } catch (error) {
    logger.error('Error fetching cracked hashes:', error);
    return NextResponse.json({ error: 'Failed to fetch cracked hashes' }, { status: 500 });
  }
}
