import config from '@/config';
import { HashType } from '@/config/hashTypes';
import type { HashResult } from '@/types/hashResults';
import { applyCrackedPasswordsToCredentialVault } from '@/utils/credentialVaultStore';
import {
  findCrackedHashPassword,
  readHashVault,
  upsertCrackedHashes,
} from '@/utils/hashVaultStore';
import { HashCracker } from '@/utils/hashUtils';
import { logger } from '@/utils/logger';
import { sendEventToAll } from '@/utils/miscUtils';

export const SMART_ATTACK_MODE_SEQUENCE = [
  'tsi',
  'rockyou',
  'one-rule-to-rule-them-still',
] as const;

function mergeResolvedPasswords(existing: HashResult[], next: HashResult[]): HashResult[] {
  let unresolvedIndex = 0;

  return existing.map(result => {
    if (result.password != null) {
      return result;
    }

    const nextResult = next[unresolvedIndex++];
    return {
      hash: result.hash,
      password: nextResult?.password ?? null,
    };
  });
}

export async function crackHashesWithSmartAttack(
  hashes: string[],
  hashType: HashType
): Promise<HashResult[]> {
  const resolvedModes = SMART_ATTACK_MODE_SEQUENCE.map(
    modeId => config.hashcat.attackModes[modeId]
  );
  if (resolvedModes.some(mode => !mode)) {
    throw new Error('Smart attack mode is misconfigured');
  }

  let results = hashes.map(hash => ({
    hash,
    password: findCrackedHashPassword(hashType.id, hash),
  }));

  for (const mode of resolvedModes) {
    const unresolvedHashes = results
      .filter(result => result.password == null)
      .map(result => result.hash);
    if (unresolvedHashes.length === 0) {
      break;
    }

    const crackResult = await new HashCracker().execute(unresolvedHashes, hashType, mode);
    results = mergeResolvedPasswords(results, crackResult.results);

    const crackedResults = crackResult.results.filter(
      (entry): entry is HashResult & { password: string } => entry.password != null
    );

    if (crackedResults.length === 0) {
      continue;
    }

    upsertCrackedHashes(hashType.id, crackedResults);

    const { vault, updatedCount } = applyCrackedPasswordsToCredentialVault(
      hashType.id,
      crackedResults
    );
    if (updatedCount > 0) {
      sendEventToAll('credentialVaultUpdated', { vault });
    }

    sendEventToAll('crackedHashes', { hashes: readHashVault() });
  }

  logger.info(
    `Smart attack resolved ${results.filter(result => result.password != null).length}/${results.length} hashes for type ${hashType.id}`
  );

  return results;
}
