import { ParsedCredentialRecord } from '@/utils/logImport/types';
import { parseImpacketNtlmLog } from '@/utils/logImport/parsers/impacketNtlm';

/** NXC uses secretsdump records, optionally wrapped in SMB console output. */
export function parseNxcSmbLog(rawLog: string): ParsedCredentialRecord[] {
  const normalized = rawLog
    // Strip terminal colors before recognizing the console prefix.
    .replace(/\x1b\[[0-9;]*m/g, '')
    // Also accept records pasted on one line rather than newline-separated.
    .replace(
      /(:::(?:[ \t]*\(status=(?:Enabled|Disabled)\))?)[ \t]+(?=\S+:\d+:[a-fA-F0-9]{32}:)/g,
      '$1\n'
    )
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*SMB\s+\S+\s+\d+\s+\S+\s+(?:\[[+*\-!]\]\s+)?/i, ''))
    .join('\n');

  return parseImpacketNtlmLog(normalized);
}
