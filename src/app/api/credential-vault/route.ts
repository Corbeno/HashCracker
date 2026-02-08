import { NextRequest, NextResponse } from 'next/server';

import { CredentialVaultMutation } from '@/types/credentialVault';
import { applyCredentialVaultMutation, readCredentialVault } from '@/utils/credentialVaultStore';
import { sendEventToAll } from '@/utils/miscUtils';

interface CredentialVaultMutationRequest {
  mutation?: CredentialVaultMutation;
}

export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

export async function GET(_req: NextRequest) {
  const vault = readCredentialVault();
  return NextResponse.json({ vault });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CredentialVaultMutationRequest;
    if (!body.mutation || typeof body.mutation !== 'object') {
      return NextResponse.json({ error: 'A valid mutation payload is required' }, { status: 400 });
    }

    const vault = applyCredentialVaultMutation(body.mutation);
    sendEventToAll('credentialVaultUpdated', { vault });
    return NextResponse.json({ vault });
  } catch {
    return NextResponse.json({ error: 'Failed to mutate credential vault' }, { status: 500 });
  }
}
