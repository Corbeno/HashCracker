import { ParsedCredentialRecord } from '@/utils/logImport/types';

const USER_PASS_COLON_REGEX = /^\s*(.+?)\s*:\s*(.+?)\s*$/;
const USER_PASS_DASH_REGEX = /^\s*(.+?)\s+-\s+(.+?)\s*$/;
const USER_PASS_SPACE_REGEX = /^\s*(\S+)\s+(.+?)\s*$/;

function isLikelyNoise(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('#')) return true;
  if (trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('[*]')) return true;
  return false;
}

function parseLine(line: string): ParsedCredentialRecord | null {
  const trimmed = line.trim();
  if (isLikelyNoise(trimmed)) return null;

  const colonMatch = trimmed.match(USER_PASS_COLON_REGEX);
  if (colonMatch) {
    const username = colonMatch[1].trim();
    const password = colonMatch[2].trim();
    if (!username || !password) return null;
    return { username, password };
  }

  const dashMatch = trimmed.match(USER_PASS_DASH_REGEX);
  if (dashMatch) {
    const username = dashMatch[1].trim();
    const password = dashMatch[2].trim();
    if (!username || !password) return null;
    return { username, password };
  }

  const spaceMatch = trimmed.match(USER_PASS_SPACE_REGEX);
  if (spaceMatch) {
    const username = spaceMatch[1].trim();
    const password = spaceMatch[2].trim();
    if (!username || !password) return null;
    return { username, password };
  }

  return null;
}

export function parseGenericCredentialLog(rawLog: string): ParsedCredentialRecord[] {
  const parsed: ParsedCredentialRecord[] = [];
  for (const line of rawLog.split(/\r?\n/)) {
    const record = parseLine(line);
    if (!record) continue;
    parsed.push(record);
  }
  return parsed;
}
