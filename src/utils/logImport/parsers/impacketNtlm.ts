import { ParsedCredentialRecord } from '@/utils/logImport/types';

const IMPACKET_SAM_LINE_REGEX =
  /^\s*([^:\r\n]+):(\d+):([a-fA-F0-9]{32}):([a-fA-F0-9]{32}):::(?:\s*\(.*\))?\s*$/;
const IMPACKET_CACHED_DOMAIN_LINE_REGEX = /^\s*([^\/:\r\n]+)[\/]+([^:\r\n]+):([a-fA-F0-9]{32})\s*$/;

export function parseImpacketNtlmLog(rawLog: string): ParsedCredentialRecord[] {
  const entries: ParsedCredentialRecord[] = [];
  const lines = rawLog.split(/\r?\n/);

  for (const line of lines) {
    const samMatch = line.match(IMPACKET_SAM_LINE_REGEX);
    if (samMatch) {
      const username = samMatch[1].trim();
      const ntHash = samMatch[4].toLowerCase();
      if (!username) continue;

      entries.push({
        username,
        hash: ntHash,
        hashType: 1000,
      });
      continue;
    }

    const cachedMatch = line.match(IMPACKET_CACHED_DOMAIN_LINE_REGEX);
    if (!cachedMatch) continue;

    const username = cachedMatch[2].trim();
    const cachedHash = cachedMatch[3].toLowerCase();
    if (!username) continue;

    entries.push({
      username,
      hash: cachedHash,
      hashType: 2100,
    });
  }

  return entries;
}
