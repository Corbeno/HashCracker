import fs from 'fs';
import path from 'path';

import {
  Credential,
  CredentialField,
  CredentialVaultDocument,
  CredentialVaultMutation,
  CredentialVaultTab,
} from '@/types/credentialVault';
import { LogImportResult, LogImportType } from '@/types/logImport';
import { mergeImportedCredentials } from '@/utils/logImport/merge';
import { parseImpacketNtlmLog } from '@/utils/logImport/parsers/impacketNtlm';

const VAULT_FILE_PATH = path.join(process.cwd(), 'data', 'credential-vault.json');

let cachedVault: CredentialVaultDocument | null = null;

function sanitizeHashTypeValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  return null;
}

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
    schemaVersion: 1,
    revision: 0,
    updatedAt: new Date().toISOString(),
    tabs: [makeSharedTab()],
  };
}

function isCredential(value: unknown): value is Credential {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.password === 'string' &&
    typeof candidate.hash === 'string' &&
    (typeof candidate.hashType === 'number' ||
      candidate.hashType === null ||
      candidate.hashType === undefined) &&
    typeof candidate.device === 'string'
  );
}

function sanitizeCredentials(value: unknown): Credential[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isCredential).map(credential => ({
    id: credential.id,
    username: credential.username,
    password: credential.password,
    hash: credential.hash,
    hashType: sanitizeHashTypeValue(credential.hashType),
    device: credential.device,
  }));
}

function isTab(value: unknown): value is CredentialVaultTab {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.credentials)
  );
}

function sanitizeTabs(value: unknown): CredentialVaultTab[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isTab)
    .map(tab => ({ ...tab, credentials: sanitizeCredentials(tab.credentials) }));
}

function sanitizeDocument(value: unknown): CredentialVaultDocument {
  if (!value || typeof value !== 'object') return createInitialDocument();
  const candidate = value as Record<string, unknown>;
  const tabs = sanitizeTabs(candidate.tabs);
  return {
    schemaVersion: 1,
    revision:
      typeof candidate.revision === 'number' && Number.isFinite(candidate.revision)
        ? candidate.revision
        : 0,
    updatedAt:
      typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    tabs: tabs.length > 0 ? tabs : [makeSharedTab()],
  };
}

function cloneVault(vault: CredentialVaultDocument): CredentialVaultDocument {
  return {
    schemaVersion: 1,
    revision: vault.revision,
    updatedAt: vault.updatedAt,
    tabs: vault.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      credentials: tab.credentials.map(credential => ({ ...credential })),
    })),
  };
}

function ensureVaultFileParentExists(): void {
  const directory = path.dirname(VAULT_FILE_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function writeVaultToDisk(vault: CredentialVaultDocument): void {
  ensureVaultFileParentExists();
  const tempFilePath = `${VAULT_FILE_PATH}.tmp`;
  fs.writeFileSync(tempFilePath, JSON.stringify(vault, null, 2), 'utf8');
  fs.renameSync(tempFilePath, VAULT_FILE_PATH);
}

function loadVaultFromDisk(): CredentialVaultDocument {
  try {
    if (!fs.existsSync(VAULT_FILE_PATH)) {
      const initial = createInitialDocument();
      writeVaultToDisk(initial);
      return initial;
    }

    const raw = fs.readFileSync(VAULT_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const sanitized = sanitizeDocument(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      writeVaultToDisk(sanitized);
    }
    return sanitized;
  } catch {
    const fallback = createInitialDocument();
    writeVaultToDisk(fallback);
    return fallback;
  }
}

function getMutableVault(): CredentialVaultDocument {
  if (!cachedVault) {
    cachedVault = loadVaultFromDisk();
  }
  return cachedVault;
}

function withDocumentMetadata(vault: CredentialVaultDocument): CredentialVaultDocument {
  return {
    ...vault,
    revision: vault.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}

function applyCredentialUpdate(
  credential: Credential,
  field: CredentialField,
  value: Credential[CredentialField]
): Credential {
  if (field === 'hashType') {
    return { ...credential, hashType: sanitizeHashTypeValue(value) };
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

export function getCredentialVaultSnapshot(): CredentialVaultDocument {
  return cloneVault(getMutableVault());
}

export function applyCredentialVaultMutation(
  mutation: CredentialVaultMutation
): CredentialVaultDocument {
  const current = getMutableVault();
  let next: CredentialVaultDocument = cloneVault(current);

  switch (mutation.type) {
    case 'tab.create': {
      const trimmedName = mutation.payload.name?.trim();
      const name =
        trimmedName && trimmedName.length > 0 ? trimmedName : `Tab ${next.tabs.length + 1}`;
      next.tabs.push({ id: crypto.randomUUID(), name, credentials: [] });
      break;
    }
    case 'tab.rename': {
      const trimmedName = mutation.payload.name.trim();
      if (!trimmedName) {
        return cloneVault(current);
      }
      next.tabs = next.tabs.map(tab =>
        tab.id === mutation.payload.tabId
          ? {
              ...tab,
              name: trimmedName,
            }
          : tab
      );
      break;
    }
    case 'tab.delete': {
      if (next.tabs.length <= 1) {
        return cloneVault(current);
      }
      const deleted = next.tabs.some(tab => tab.id === mutation.payload.tabId);
      if (!deleted) {
        return cloneVault(current);
      }
      next.tabs = next.tabs.filter(tab => tab.id !== mutation.payload.tabId);
      break;
    }
    case 'credential.create': {
      next.tabs = next.tabs.map(tab =>
        tab.id === mutation.payload.tabId
          ? {
              ...tab,
              credentials: [
                ...tab.credentials,
                buildBlankCredential(mutation.payload.credentialId),
              ],
            }
          : tab
      );
      break;
    }
    case 'credential.update': {
      next.tabs = next.tabs.map(tab => {
        if (tab.id !== mutation.payload.tabId) return tab;
        return {
          ...tab,
          credentials: tab.credentials.map(credential =>
            credential.id === mutation.payload.credentialId
              ? applyCredentialUpdate(credential, mutation.payload.field, mutation.payload.value)
              : credential
          ),
        };
      });
      break;
    }
    case 'credential.deleteMany': {
      const idSet = new Set(mutation.payload.credentialIds);
      next.tabs = next.tabs.map(tab =>
        tab.id === mutation.payload.tabId
          ? {
              ...tab,
              credentials: tab.credentials.filter(credential => !idSet.has(credential.id)),
            }
          : tab
      );
      break;
    }
    default:
      return cloneVault(current);
  }

  if (JSON.stringify(next) === JSON.stringify(current)) {
    return cloneVault(current);
  }

  next = withDocumentMetadata(next);
  cachedVault = next;
  writeVaultToDisk(next);
  return cloneVault(next);
}

export function applyCredentialVaultLogImport(
  tabId: string,
  logType: LogImportType,
  rawLog: string
): { vault: CredentialVaultDocument; result: LogImportResult } {
  const current = getMutableVault();
  const next = cloneVault(current);
  const tabIndex = next.tabs.findIndex(tab => tab.id === tabId);

  if (tabIndex === -1) {
    return { vault: cloneVault(current), result: emptyImportResult() };
  }

  let parsedRecords: ReturnType<typeof parseImpacketNtlmLog>;
  if (logType === 'impacket-ntlm') {
    parsedRecords = parseImpacketNtlmLog(rawLog);
  } else {
    return { vault: cloneVault(current), result: emptyImportResult() };
  }

  const merged = mergeImportedCredentials(next.tabs[tabIndex].credentials, parsedRecords);
  next.tabs[tabIndex] = {
    ...next.tabs[tabIndex],
    credentials: merged.nextCredentials,
  };

  if (JSON.stringify(next) === JSON.stringify(current)) {
    return { vault: cloneVault(current), result: merged.result };
  }

  const withMetadata = withDocumentMetadata(next);
  cachedVault = withMetadata;
  writeVaultToDisk(withMetadata);
  return { vault: cloneVault(withMetadata), result: merged.result };
}
