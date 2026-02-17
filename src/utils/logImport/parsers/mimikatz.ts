import { ParsedCredentialRecord } from '@/utils/logImport/types';

const USERNAME_LINE_REGEX = /^\s*(?:\*\s*)?Username\s*:\s*(.+?)\s*$/i;
const LOGIN_USERNAME_REGEX = /^\s*User Name\s*:\s*(.+?)\s*$/i;
const NTLM_LINE_REGEX = /^\s*\*\s*NTLM\s*:\s*([a-fA-F0-9]{32})\s*$/i;
const PASSWORD_LINE_REGEX = /^\s*\*\s*Password\s*:\s*(.+?)\s*$/i;

function normalizeUsernameKey(username: string): string {
  return username.trim().toLowerCase();
}

function isBlankOrNullPassword(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' || normalized === '(null)' || normalized === 'null' || normalized === '(none)'
  );
}

export function parseMimikatzLog(rawLog: string): ParsedCredentialRecord[] {
  const recordsByUsername = new Map<string, ParsedCredentialRecord>();
  const lines = rawLog.split(/\r?\n/);
  let fallbackUsername = '';
  let sectionUsername = '';

  const getOrCreateRecord = (username: string): ParsedCredentialRecord | null => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return null;

    const key = normalizeUsernameKey(trimmedUsername);
    const existing = recordsByUsername.get(key);
    if (existing) return existing;

    const next: ParsedCredentialRecord = { username: trimmedUsername };
    recordsByUsername.set(key, next);
    return next;
  };

  for (const line of lines) {
    const loginUsernameMatch = line.match(LOGIN_USERNAME_REGEX);
    if (loginUsernameMatch) {
      fallbackUsername = loginUsernameMatch[1].trim();
    }

    const usernameMatch = line.match(USERNAME_LINE_REGEX);
    if (usernameMatch) {
      sectionUsername = usernameMatch[1].trim();
      continue;
    }

    const username = sectionUsername || fallbackUsername;
    if (!username) continue;

    const ntlmMatch = line.match(NTLM_LINE_REGEX);
    if (ntlmMatch) {
      const record = getOrCreateRecord(username);
      if (!record) continue;

      record.hash = ntlmMatch[1].toLowerCase();
      record.hashType = 1000;
      continue;
    }

    const passwordMatch = line.match(PASSWORD_LINE_REGEX);
    if (!passwordMatch) continue;

    const password = passwordMatch[1].trim();
    if (isBlankOrNullPassword(password)) continue;

    const record = getOrCreateRecord(username);
    if (!record) continue;
    if (!record.password) {
      record.password = password;
    }
  }

  return Array.from(recordsByUsername.values()).filter(
    record => !!record.hash || !!record.password
  );
}
