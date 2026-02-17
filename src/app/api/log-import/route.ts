import { NextRequest, NextResponse } from 'next/server';

import { LogImportRequest, LogImportType } from '@/types/logImport';
import { applyCredentialVaultLogImport } from '@/utils/credentialVaultStore';
import { sendEventToAll } from '@/utils/miscUtils';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

function isSupportedLogType(logType: string): boolean {
  return logType === 'impacket-ntlm' || logType === 'mimikatz' || logType === 'generic';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<LogImportRequest>;
    const tabId = typeof body.tabId === 'string' ? body.tabId.trim() : '';
    const logType = typeof body.logType === 'string' ? body.logType : '';
    const rawLog = typeof body.rawLog === 'string' ? body.rawLog : '';

    if (!tabId) {
      return NextResponse.json({ error: 'tabId is required' }, { status: 400 });
    }
    if (!rawLog.trim()) {
      return NextResponse.json({ error: 'rawLog is required' }, { status: 400 });
    }
    if (!isSupportedLogType(logType)) {
      return NextResponse.json({ error: 'Unsupported logType' }, { status: 400 });
    }

    const { vault, result } = applyCredentialVaultLogImport(
      tabId,
      logType as LogImportType,
      rawLog
    );
    sendEventToAll('credentialVaultUpdated', { vault });
    return NextResponse.json({ vault, result });
  } catch {
    return NextResponse.json({ error: 'Failed to import credentials' }, { status: 500 });
  }
}
