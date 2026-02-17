import type { HashVaultEntry } from '@/types/hashVault';
import type { HashResult } from '@/types/hashResults';
import { normalizeHashForType } from '@/utils/hashNormalization';

import {
  getAllHashVaultRows,
  getHashVaultRowsByType,
  upsertHashVaultRow,
  withHashVaultTransaction,
} from './hashVaultDb';

export function readHashVault(): HashVaultEntry[] {
  return getAllHashVaultRows().map(row => ({
    hashType: row.hash_type,
    hash: row.hash,
    password: row.cracked_hash,
    addedDate: row.added_date,
  }));
}

export function readHashVaultByType(hashType: number): HashVaultEntry[] {
  return getHashVaultRowsByType(hashType).map(row => ({
    hashType: row.hash_type,
    hash: row.hash,
    password: row.cracked_hash,
    addedDate: row.added_date,
  }));
}

export function upsertCrackedHashes(hashType: number, crackedResults: HashResult[]): void {
  if (crackedResults.length === 0) return;

  withHashVaultTransaction(() => {
    for (const result of crackedResults) {
      if (result.password == null) continue;
      const normalizedHash = normalizeHashForType(hashType, result.hash);
      if (!normalizedHash) continue;
      upsertHashVaultRow({
        hash_type: hashType,
        hash: normalizedHash,
        cracked_hash: result.password,
        added_date: new Date().toISOString(),
      });
    }
  });
}
