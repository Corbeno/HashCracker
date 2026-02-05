/**
 * Shared Credentials Storage Utilities
 * File-based storage for shared credentials accessible to all teams
 * Stores data in data/shared.json
 */

import * as fs from 'fs';
import * as path from 'path';

import { logger } from './logger';

import { SharedCredentialsVault, TeamCredential } from '@/types/teamVault';

// File path for shared credentials vault
const SHARED_FILE_PATH = path.join(process.cwd(), 'data', 'shared.json');

/**
 * Ensure the shared credentials file exists
 */
function ensureSharedFile(): void {
  const dataDir = path.dirname(SHARED_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(SHARED_FILE_PATH)) {
    const emptyVault: SharedCredentialsVault = {
      credentials: [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(SHARED_FILE_PATH, JSON.stringify(emptyVault, null, 2));
    logger.info(`Created shared credentials vault: ${SHARED_FILE_PATH}`);
  }
}

/**
 * Generate a unique ID for a credential
 */
function generateCredentialId(): string {
  return `shared_cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the shared credentials vault
 */
export function getSharedVault(): SharedCredentialsVault {
  ensureSharedFile();

  try {
    const content = fs.readFileSync(SHARED_FILE_PATH, 'utf-8');
    return JSON.parse(content) as SharedCredentialsVault;
  } catch (error) {
    logger.error('Error reading shared vault:', error);
    return { credentials: [], updatedAt: new Date().toISOString() };
  }
}

/**
 * Save the shared credentials vault
 */
export function saveSharedVault(vault: SharedCredentialsVault): void {
  ensureSharedFile();

  vault.updatedAt = new Date().toISOString();
  fs.writeFileSync(SHARED_FILE_PATH, JSON.stringify(vault, null, 2));
  logger.debug('Saved shared credentials vault');
}

/**
 * Add a credential to the shared vault
 */
export function addSharedCredential(
  credential: Omit<TeamCredential, 'id' | 'createdAt' | 'updatedAt' | 'credentialType'>
): TeamCredential {
  const vault = getSharedVault();

  // Check for duplicates (case-insensitive hash comparison)
  const existingIndex = vault.credentials.findIndex(
    c => c.hash.toLowerCase() === credential.hash.toLowerCase()
  );

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    // Update existing credential
    const existing = vault.credentials[existingIndex];
    vault.credentials[existingIndex] = {
      ...existing,
      ...credential,
      id: existing.id,
      credentialType: 'shared',
      scope: 'global',
      updatedAt: now,
    };
    saveSharedVault(vault);
    logger.info(`Updated shared credential: ${credential.hash.substring(0, 16)}...`);
    return vault.credentials[existingIndex];
  }

  // Add new credential
  const newCredential: TeamCredential = {
    ...credential,
    id: generateCredentialId(),
    credentialType: 'shared',
    scope: 'global',
    createdAt: now,
    updatedAt: now,
  };

  vault.credentials.push(newCredential);
  saveSharedVault(vault);
  logger.info(`Added shared credential: ${credential.hash.substring(0, 16)}...`);
  return newCredential;
}

/**
 * Add multiple credentials to the shared vault
 */
export function addSharedCredentials(
  credentials: Array<Omit<TeamCredential, 'id' | 'createdAt' | 'updatedAt' | 'credentialType'>>
): { added: number; updated: number; duplicates: number } {
  const vault = getSharedVault();
  const now = new Date().toISOString();

  let added = 0;
  let updated = 0;
  let duplicates = 0;

  for (const credential of credentials) {
    // Check for duplicates
    const existingIndex = vault.credentials.findIndex(
      c => c.hash.toLowerCase() === credential.hash.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update if different
      const existing = vault.credentials[existingIndex];
      const hasChanges =
        existing.username !== credential.username ||
        existing.vmIds.join(',') !== credential.vmIds.join(',') ||
        existing.source !== credential.source;

      if (hasChanges) {
        vault.credentials[existingIndex] = {
          ...existing,
          ...credential,
          id: existing.id,
          credentialType: 'shared',
          scope: 'global',
          updatedAt: now,
        };
        updated++;
      } else {
        duplicates++;
      }
    } else {
      // Add new
      vault.credentials.push({
        ...credential,
        id: generateCredentialId(),
        credentialType: 'shared',
        scope: 'global',
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }
  }

  if (added > 0 || updated > 0) {
    saveSharedVault(vault);
    logger.info(
      `Added ${added} shared credentials, updated ${updated}, skipped ${duplicates} duplicates`
    );
  }

  return { added, updated, duplicates };
}

/**
 * Remove a credential from the shared vault
 */
export function removeSharedCredential(id: string): boolean {
  const vault = getSharedVault();
  const originalLength = vault.credentials.length;

  vault.credentials = vault.credentials.filter(c => c.id !== id);

  if (vault.credentials.length < originalLength) {
    saveSharedVault(vault);
    logger.info(`Removed shared credential: ${id}`);
    return true;
  }

  return false;
}

/**
 * Update a credential in the shared vault
 */
export function updateSharedCredential(
  id: string,
  updates: Partial<Omit<TeamCredential, 'id' | 'createdAt' | 'credentialType'>>
): TeamCredential | null {
  const vault = getSharedVault();
  const index = vault.credentials.findIndex(c => c.id === id);

  if (index < 0) {
    return null;
  }

  vault.credentials[index] = {
    ...vault.credentials[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveSharedVault(vault);
  logger.info(`Updated shared credential: ${id}`);
  return vault.credentials[index];
}

/**
 * Update password for a shared credential (when hash is cracked)
 */
export function updateSharedCredentialPassword(hash: string, password: string): boolean {
  const vault = getSharedVault();
  const hashLower = hash.toLowerCase();

  let updated = false;
  const now = new Date().toISOString();

  for (const credential of vault.credentials) {
    if (credential.hash.toLowerCase() === hashLower && credential.password === null) {
      credential.password = password;
      credential.crackedAt = now;
      credential.updatedAt = now;
      updated = true;
    }
  }

  if (updated) {
    saveSharedVault(vault);
    logger.info(`Updated cracked password for shared credential: ${hash.substring(0, 16)}...`);
  }

  return updated;
}

/**
 * Get all shared credentials
 */
export function getAllSharedCredentials(): TeamCredential[] {
  const vault = getSharedVault();
  return vault.credentials;
}

/**
 * Get shared credentials by VM
 */
export function getSharedCredentialsByVM(vmId: string): TeamCredential[] {
  const vault = getSharedVault();
  return vault.credentials.filter(c => c.vmIds.includes(vmId));
}

/**
 * Clear all shared credentials
 */
export function clearSharedCredentials(): void {
  const vault = getSharedVault();
  const count = vault.credentials.length;
  vault.credentials = [];
  saveSharedVault(vault);
  logger.info(`Cleared ${count} shared credentials`);
}

/**
 * Check if a credential is a shared credential
 * Shared credentials have global scope or credentialType 'shared'
 */
export function isSharedCredential(credential: TeamCredential): boolean {
  return credential.scope === 'global' || credential.credentialType === 'shared';
}
