/**
 * Base Parser Utilities
 * Common functions for all log parsers
 */

import { ParsedCredential } from './types';

// Empty LM hash constant (should be filtered out)
export const EMPTY_LM_HASH = 'aad3b435b51404eeaad3b435b51404ee';

/**
 * Check if username is a machine account (ends with $)
 */
export function isMachineAccount(username: string | null): boolean {
  if (!username) return false;
  return username.endsWith('$');
}

/**
 * Check if hash is an empty LM hash
 */
export function isEmptyLMHash(hash: string): boolean {
  return hash.toLowerCase() === EMPTY_LM_HASH.toLowerCase();
}

/**
 * Validate NTLM hash format (32 hex characters)
 */
export function isValidNTLMHash(hash: string): boolean {
  return /^[a-fA-F0-9]{32}$/.test(hash);
}

/**
 * Validate hex hash of specific length
 */
export function isValidHexHash(hash: string, length: number): boolean {
  const regex = new RegExp(`^[a-fA-F0-9]{${length}}$`);
  return regex.test(hash);
}

/**
 * Deduplicate credentials by hash (case-insensitive)
 * Keeps the first occurrence
 */
export function deduplicateCredentials(credentials: ParsedCredential[]): ParsedCredential[] {
  const seen = new Set<string>();
  const result: ParsedCredential[] = [];
  let duplicates = 0;

  for (const cred of credentials) {
    const hashLower = cred.hash.toLowerCase();
    if (seen.has(hashLower)) {
      duplicates++;
    } else {
      seen.add(hashLower);
      result.push(cred);
    }
  }

  return result;
}

/**
 * Filter out machine accounts from credentials
 */
export function filterMachineAccounts(credentials: ParsedCredential[]): {
  filtered: ParsedCredential[];
  count: number;
} {
  let count = 0;
  const filtered = credentials.filter(cred => {
    if (isMachineAccount(cred.username)) {
      count++;
      return false;
    }
    return true;
  });

  return { filtered, count };
}

/**
 * Filter credentials by hash validation
 */
export function filterInvalidHashes(
  credentials: ParsedCredential[],
  validator: (hash: string) => boolean
): {
  valid: ParsedCredential[];
  invalid: ParsedCredential[];
  count: number;
} {
  const valid: ParsedCredential[] = [];
  const invalid: ParsedCredential[] = [];

  for (const cred of credentials) {
    if (validator(cred.hash)) {
      valid.push(cred);
    } else {
      invalid.push(cred);
    }
  }

  return { valid, invalid, count: invalid.length };
}

/**
 * Parse multiple lines of text
 * Helper for parsers that process line-by-line
 */
export function parseLines(
  input: string,
  lineParser: (line: string) => ParsedCredential | null
): ParsedCredential[] {
  const lines = input.split('\n');
  const results: ParsedCredential[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = lineParser(trimmed);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Extract username from DOMAIN\username format
 */
export function parseDomainUsername(domainUser: string): {
  domain: string | null;
  username: string;
} {
  const parts = domainUser.split('\\');
  if (parts.length === 2) {
    return { domain: parts[0], username: parts[1] };
  }
  return { domain: null, username: domainUser };
}

/**
 * Extract username from username@domain format
 */
export function parseEmailStyleUsername(userAtDomain: string): {
  domain: string | null;
  username: string;
} {
  const parts = userAtDomain.split('@');
  if (parts.length === 2) {
    return { domain: parts[1], username: parts[0] };
  }
  return { domain: null, username: userAtDomain };
}

/**
 * Normalize username (trim, handle common variations)
 */
export function normalizeUsername(username: string | null): string | null {
  if (!username) return null;
  const normalized = username.trim();
  if (!normalized) return null;
  return normalized;
}

/**
 * Create a standard credential object with defaults
 */
export function createCredential(
  username: string | null,
  hash: string,
  hashTypeId: number,
  hashTypeName: string,
  metadata?: Record<string, any>
): ParsedCredential {
  return {
    username: normalizeUsername(username),
    hash: hash.toLowerCase(),
    hashTypeId,
    hashTypeName,
    metadata,
  };
}
