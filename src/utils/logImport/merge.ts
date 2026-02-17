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
    const normalizedHash = record.hash?.trim().toLowerCase() ?? '';
    const normalizedPassword = record.password?.trim() ?? '';
    const hasHash = normalizedHash !== '';
    const hasPassword = normalizedPassword !== '';
    if (!normalizedUsername) {
      skippedCount += 1;
      continue;
    }
    if (!hasHash && !hasPassword) {
      skippedCount += 1;
      continue;
    }

    const importKey = `${normalizedUsername}:${normalizedHash}:${normalizedPassword}`;
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
        password: hasPassword ? normalizedPassword : '',
        hash: hasHash ? normalizedHash : '',
        hashType: hasHash ? (record.hashType ?? null) : null,
        device: '',
      });
      usernameToIndex.set(normalizedUsername, nextCredentials.length - 1);
      createdCount += 1;
      continue;
    }

    const existing = nextCredentials[existingIndex];
    let changed = false;

    if (hasHash) {
      if (isBlank(existing.hash)) {
        existing.hash = normalizedHash;
        changed = true;
      } else if (existing.hash.toLowerCase() !== normalizedHash) {
        conflictCount += 1;
        continue;
      }

      if (existing.hashType == null && record.hashType != null) {
        existing.hashType = record.hashType;
        changed = true;
      }
    }

    if (hasPassword) {
      if (isBlank(existing.password)) {
        existing.password = normalizedPassword;
        changed = true;
      } else if (existing.password !== normalizedPassword) {
        conflictCount += 1;
        continue;
      }
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
