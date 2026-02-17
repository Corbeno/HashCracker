import { Credential } from '@/types/credentialVault';
import { ParsedCredentialRecord, MergeImportResult } from '@/utils/logImport/types';

function stripDomainPrefix(username: string): string {
  const trimmed = username.trim();
  const slashIndex = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'));
  if (slashIndex === -1) return trimmed;
  return trimmed.slice(slashIndex + 1).trim();
}

function normalizeUsername(username: string): string {
  return stripDomainPrefix(username).toLowerCase();
}

function isBlank(value: string): boolean {
  return value.trim() === '';
}

export function mergeImportedCredentials(
  existingCredentials: Credential[],
  parsedRecords: ParsedCredentialRecord[]
): MergeImportResult {
  const nextCredentials = existingCredentials.map(credential => ({ ...credential }));
  const usernameToIndex = new Map<string, number>();
  const seenImportKeys = new Set<string>();

  nextCredentials.forEach((credential, index) => {
    const normalized = normalizeUsername(credential.username);
    if (!normalized || usernameToIndex.has(normalized)) return;
    usernameToIndex.set(normalized, index);
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let conflictCount = 0;

  for (const record of parsedRecords) {
    const canonicalUsername = stripDomainPrefix(record.username);
    const normalizedUsername = normalizeUsername(record.username);
    if (!normalizedUsername) {
      skippedCount += 1;
      continue;
    }

    const importKey = `${normalizedUsername}:${record.hash.toLowerCase()}`;
    if (seenImportKeys.has(importKey)) {
      skippedCount += 1;
      continue;
    }
    seenImportKeys.add(importKey);

    const existingIndex = usernameToIndex.get(normalizedUsername);
    if (existingIndex == null) {
      nextCredentials.push({
        id: crypto.randomUUID(),
        username: canonicalUsername,
        password: '',
        hash: record.hash,
        hashType: record.hashType,
        device: '',
      });
      usernameToIndex.set(normalizedUsername, nextCredentials.length - 1);
      createdCount += 1;
      continue;
    }

    const existing = nextCredentials[existingIndex];
    let changed = false;

    if (isBlank(existing.hash)) {
      existing.hash = record.hash;
      changed = true;
    } else if (existing.hash.toLowerCase() !== record.hash.toLowerCase()) {
      conflictCount += 1;
      continue;
    }

    if (existing.hashType == null) {
      existing.hashType = record.hashType;
      changed = true;
    }

    if (changed) {
      updatedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  return {
    nextCredentials,
    result: {
      parsedCount: parsedRecords.length,
      createdCount,
      updatedCount,
      skippedCount,
      conflictCount,
      sharedCount: 0,
    },
  };
}

export { normalizeUsername, stripDomainPrefix };
