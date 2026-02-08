import { ParsedCredentialRecord } from '@/utils/logImport/types';

const IMPACKET_SAM_LINE_REGEX = /^\s*([^:\r\n]+):(\d+):([a-fA-F0-9]{32}):([a-fA-F0-9]{32}):::\s*$/;

export function parseImpacketNtlmLog(rawLog: string): ParsedCredentialRecord[] {
  const entries: ParsedCredentialRecord[] = [];
  const lines = rawLog.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(IMPACKET_SAM_LINE_REGEX);
    if (!match) continue;

    const username = match[1].trim();
    const ntHash = match[4].toLowerCase();
    if (!username) continue;

    entries.push({
      username,
      hash: ntHash,
      hashType: 'NTLM',
    });
  }

  return entries;
}
