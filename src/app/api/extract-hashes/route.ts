import { NextRequest, NextResponse } from 'next/server';

import config from '@/config';
import { logger } from '@/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const { text, hashType } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid input. Text is required.' }, { status: 400 });
    }

    if (hashType === undefined || hashType === null) {
      return NextResponse.json(
        { error: 'Invalid hash type. A hash type must be selected.' },
        { status: 400 }
      );
    }

    const hashTypeConfig = config.hashcat.hashTypes[hashType];
    if (!hashTypeConfig) {
      return NextResponse.json(
        { error: 'Invalid hash type. The selected hash type does not exist.' },
        { status: 400 }
      );
    }

    const hashRegex = hashTypeConfig.regex;
    if (!hashRegex || hashRegex.trim() === '') {
      return NextResponse.json(
        { error: 'The selected hash type does not have a regex pattern defined.' },
        { status: 400 }
      );
    }

    const hashes: string[] = [];
    const requestLines = text.split('\n');

    logger.info(
      `Hash extraction API called with ${text.length} characters of text for hash type ${hashType} (${hashTypeConfig.name})`
    );

    try {
      for (const line of requestLines) {
        // Create a new RegExp for each line to handle global flag properly with exec
        const regexForExec = new RegExp(hashRegex, 'g');
        let match;

        while ((match = regexForExec.exec(line)) !== null) {
          // If there's a capturing group (match[1]), use that; otherwise use the full match (match[0])
          hashes.push(match[match.length - 1]);
        }
      }

      // Remove duplicates
      const uniqueHashes = [...new Set(hashes)];

      return NextResponse.json({
        hashes: uniqueHashes,
        hashType: {
          id: hashTypeConfig.id,
          name: hashTypeConfig.name,
        },
        count: uniqueHashes.length,
      });
    } catch (regexError) {
      logger.error(`Error with regex pattern for hash type ${hashType}:`, regexError);
      return NextResponse.json(
        { error: 'Invalid regex pattern for the selected hash type.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in extract-hashes API:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
