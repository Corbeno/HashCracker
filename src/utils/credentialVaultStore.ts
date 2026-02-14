import { isEqual } from 'lodash';

import {
  countTabs,
  CredentialUpdateParams,
  deleteAllCredentials,
  deleteAllTabs,
  deleteCredentialInTab,
  deleteCredentialsForTab,
  deleteTabById,
  getAllCredentials,
  getAllTabs,
  getBlankPasswordCredentialsByHashType,
  getCredentialInTab,
  getCredentialsForTab,
  getMaxCredentialPositionForTab,
  getMaxTabPosition,
  insertCredential,
  insertTab,
  renameTabIfChanged,
  tabExists,
  updateCredentialIfChanged,
  updateCredentialPasswordById,
  withVaultTransaction,
} from './credentialVaultDb';
import {
  buildCredentialVaultDocument,
  mapVaultCredentialRowToCredential,
  normalizeHashTypeValue,
} from './credentialVaultMapper';
import { logger } from './logger';

import { normalizeHashForType } from '@/utils/hashNormalization';

import {
  Credential,
  CredentialField,
  CredentialVaultDocument,
  CredentialVaultMutation,
  CredentialVaultTab,
} from '@/types/credentialVault';
import type { HashResult } from '@/types/hashResults';
import { LogImportResult, LogImportType } from '@/types/logImport';
import { mergeImportedCredentials } from '@/utils/logImport/merge';
import { parseImpacketNtlmLog } from '@/utils/logImport/parsers/impacketNtlm';

function buildBlankCredential(id?: string): Credential {
  return {
    id: id ?? crypto.randomUUID(),
    username: '',
    password: '',
    hash: '',
    hashType: null,
    device: '',
  };
}

function makeSharedTab(credentials: Credential[] = []): CredentialVaultTab {
  return {
    id: crypto.randomUUID(),
    name: 'Shared',
    credentials,
  };
}

function createInitialDocument(): CredentialVaultDocument {
  return {
    tabs: [makeSharedTab()],
  };
}

function initializeVaultIfEmpty(): void {
  if (countTabs() > 0) {
    return;
  }

  const initial = createInitialDocument();
  writeVaultToDatabase(initial);
}

function writeVaultToDatabase(vault: CredentialVaultDocument): void {
  withVaultTransaction(() => {
    deleteAllCredentials();
    deleteAllTabs();

    for (let tabPosition = 0; tabPosition < vault.tabs.length; tabPosition += 1) {
      const tab = vault.tabs[tabPosition];
      insertTab({
        id: tab.id,
        name: tab.name,
        position: tabPosition,
      });

      for (
        let credentialPosition = 0;
        credentialPosition < tab.credentials.length;
        credentialPosition += 1
      ) {
        const credential = tab.credentials[credentialPosition];
        insertCredential({
          id: credential.id,
          tabId: tab.id,
          username: credential.username,
          password: credential.password,
          hash: credential.hash,
          hashType: normalizeHashTypeValue(credential.hashType),
          device: credential.device,
          position: credentialPosition,
        });
      }
    }
  });
}

function loadVaultFromDatabase(): CredentialVaultDocument {
  initializeVaultIfEmpty();
  return buildCredentialVaultDocument(getAllTabs(), getAllCredentials());
}

function applyCredentialUpdate(
  credential: Credential,
  field: CredentialField,
  value: Credential[CredentialField]
): Credential {
  if (field === 'hashType') {
    return { ...credential, hashType: normalizeHashTypeValue(value) };
  }

  return { ...credential, [field]: typeof value === 'string' ? value : String(value ?? '') };
}

function emptyImportResult(): LogImportResult {
  return {
    parsedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    conflictCount: 0,
  };
}

export function readCredentialVault(): CredentialVaultDocument {
  return loadVaultFromDatabase();
}

export function applyCredentialVaultMutation(
  mutation: CredentialVaultMutation
): CredentialVaultDocument {
  const current = loadVaultFromDatabase();
  let changed = false;

  withVaultTransaction(() => {
    switch (mutation.type) {
      case 'tab.create': {
        const trimmedName = mutation.payload.name?.trim();
        const name = trimmedName && trimmedName.length > 0 ? trimmedName : `Tab ${countTabs() + 1}`;
        const tabId = crypto.randomUUID();
        const credential = buildBlankCredential();

        insertTab({
          id: tabId,
          name,
          position: getMaxTabPosition() + 1,
        });
        insertCredential({
          id: credential.id,
          tabId,
          username: credential.username,
          password: credential.password,
          hash: credential.hash,
          hashType: credential.hashType,
          device: credential.device,
          position: 0,
        });

        changed = true;
        return;
      }

      case 'tab.rename': {
        const trimmedName = mutation.payload.name.trim();
        if (!trimmedName) return;
        changed = renameTabIfChanged({ id: mutation.payload.tabId, name: trimmedName }) > 0;
        return;
      }

      case 'tab.delete': {
        if (countTabs() <= 1) return;
        changed = deleteTabById(mutation.payload.tabId) > 0;
        return;
      }

      case 'credential.create': {
        if (!tabExists(mutation.payload.tabId)) return;

        const credential = buildBlankCredential(mutation.payload.credentialId);
        insertCredential({
          id: credential.id,
          tabId: mutation.payload.tabId,
          username: credential.username,
          password: credential.password,
          hash: credential.hash,
          hashType: credential.hashType,
          device: credential.device,
          position: getMaxCredentialPositionForTab(mutation.payload.tabId) + 1,
        });

        changed = true;
        return;
      }

      case 'credential.update': {
        const currentCredentialRow = getCredentialInTab(
          mutation.payload.tabId,
          mutation.payload.credentialId
        );
        if (!currentCredentialRow) return;

        const nextCredential = applyCredentialUpdate(
          mapVaultCredentialRowToCredential(currentCredentialRow),
          mutation.payload.field,
          mutation.payload.value
        );

        const updatePayload: CredentialUpdateParams = {
          tabId: mutation.payload.tabId,
          credentialId: mutation.payload.credentialId,
          username: nextCredential.username,
          password: nextCredential.password,
          hash: nextCredential.hash,
          hashType: nextCredential.hashType,
          device: nextCredential.device,
        };

        changed = updateCredentialIfChanged(updatePayload) > 0;
        return;
      }

      case 'credential.deleteMany': {
        if (mutation.payload.credentialIds.length === 0) return;

        let deletedCount = 0;
        for (const credentialId of mutation.payload.credentialIds) {
          deletedCount += deleteCredentialInTab(mutation.payload.tabId, credentialId);
        }

        changed = deletedCount > 0;
        return;
      }

      default:
        return;
    }
  });

  if (!changed) {
    return current;
  }

  return loadVaultFromDatabase();
}

export function applyCredentialVaultLogImport(
  tabId: string,
  logType: LogImportType,
  rawLog: string
): { vault: CredentialVaultDocument; result: LogImportResult } {
  if (!tabExists(tabId)) {
    return { vault: loadVaultFromDatabase(), result: emptyImportResult() };
  }

  let parsedRecords: ReturnType<typeof parseImpacketNtlmLog>;
  if (logType === 'impacket-ntlm') {
    parsedRecords = parseImpacketNtlmLog(rawLog);
  } else {
    return { vault: loadVaultFromDatabase(), result: emptyImportResult() };
  }

  const currentCredentials = getCredentialsForTab(tabId).map(mapVaultCredentialRowToCredential);
  const merged = mergeImportedCredentials(currentCredentials, parsedRecords);

  if (isEqual(merged.nextCredentials, currentCredentials)) {
    return { vault: loadVaultFromDatabase(), result: merged.result };
  }

  withVaultTransaction(() => {
    deleteCredentialsForTab(tabId);
    for (let position = 0; position < merged.nextCredentials.length; position += 1) {
      const credential = merged.nextCredentials[position];
      insertCredential({
        id: credential.id,
        tabId,
        username: credential.username,
        password: credential.password,
        hash: credential.hash,
        hashType: normalizeHashTypeValue(credential.hashType),
        device: credential.device,
        position,
      });
    }
  });

  return { vault: loadVaultFromDatabase(), result: merged.result };
}

export function applyCrackedPasswordsToCredentialVault(
  hashType: number,
  crackedResults: HashResult[]
): { vault: CredentialVaultDocument; updatedCount: number } {
  if (crackedResults.length === 0) {
    return { vault: loadVaultFromDatabase(), updatedCount: 0 };
  }

  const crackedByHash = new Map<string, string>();
  for (const result of crackedResults) {
    if (result.password == null) continue;
    const normalizedHash = normalizeHashForType(hashType, result.hash);
    if (!normalizedHash) continue;
    crackedByHash.set(normalizedHash, result.password);
  }

  logger.debug('Applying cracked passwords to vault. Cracked count: ', crackedByHash.size);

  const candidates = getBlankPasswordCredentialsByHashType(hashType);
  const updates = candidates
    .map(candidate => {
      const crackedPassword = crackedByHash.get(normalizeHashForType(hashType, candidate.hash));
      if (crackedPassword == null) return null;
      return { id: candidate.id, password: crackedPassword };
    })
    .filter((entry): entry is { id: string; password: string } => entry != null);

  if (updates.length === 0) {
    return { vault: loadVaultFromDatabase(), updatedCount: 0 };
  }

  withVaultTransaction(() => {
    for (const row of updates) {
      updateCredentialPasswordById(row.id, row.password);
    }
  });

  logger.debug(`Finished applying cracked passwords. Updated credentials count: ${updates.length}`);
  return { vault: loadVaultFromDatabase(), updatedCount: updates.length };
}
