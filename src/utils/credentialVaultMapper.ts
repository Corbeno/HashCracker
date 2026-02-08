import type { VaultCredentialRow, VaultTabRow } from './credentialVaultDb';

import type { Credential, CredentialVaultDocument } from '@/types/credentialVault';

export function normalizeHashTypeValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  return null;
}

export function mapVaultCredentialRowToCredential(row: VaultCredentialRow): Credential {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    hash: row.hash,
    hashType: normalizeHashTypeValue(row.hash_type),
    device: row.device,
  };
}

export function buildCredentialVaultDocument(
  tabs: VaultTabRow[],
  credentials: VaultCredentialRow[]
): CredentialVaultDocument {
  const credentialsByTabId = new Map<string, Credential[]>();

  for (const row of credentials) {
    const credential = mapVaultCredentialRowToCredential(row);
    const existing = credentialsByTabId.get(row.tab_id);
    if (existing) {
      existing.push(credential);
    } else {
      credentialsByTabId.set(row.tab_id, [credential]);
    }
  }

  return {
    tabs: tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      credentials: credentialsByTabId.get(tab.id) ?? [],
    })),
  };
}
