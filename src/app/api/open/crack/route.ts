import { NextRequest, NextResponse } from 'next/server';

import config from '@/config';
import { crackHashesWithSmartAttack } from '@/utils/smartAttack';

interface OpenCrackRequest {
  hashes: string[];
  hashType: number;
}

export async function POST(req: NextRequest) {
  try {
    const { hashes, hashType } = (await req.json()) as OpenCrackRequest;

    if (!Array.isArray(hashes) || hashes.length === 0) {
      return NextResponse.json({ error: 'At least one hash is required' }, { status: 400 });
    }

    if (hashType === undefined) {
      return NextResponse.json({ error: 'hashType is required' }, { status: 400 });
    }

    const resolvedHashType = config.hashcat.hashTypes[hashType];
    if (!resolvedHashType) {
      return NextResponse.json({ error: 'Invalid hash type' }, { status: 400 });
    }

    const results = await crackHashesWithSmartAttack(hashes, resolvedHashType);

    return NextResponse.json({
      mode: 'smart',
      hashType: {
        id: resolvedHashType.id,
        name: resolvedHashType.name,
      },
      results,
      crackedCount: results.filter(result => result.password != null).length,
    });
  } catch (error) {
    console.error('Error in open crack API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
