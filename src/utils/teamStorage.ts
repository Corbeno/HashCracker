/**
 * Team Vault Storage Utilities
 * File-based storage for team credential vaults
 * Stores data in data/teams/{teamId}.json
 */

import * as fs from 'fs';
import * as path from 'path';

import { logger } from './logger';

import { TeamCredential, TeamSummary, TeamVault } from '@/types/teamVault';

// Directory for team vault files
const TEAMS_DIR = path.join(process.cwd(), 'data', 'teams');

/**
 * Ensure the teams directory exists
 */
function ensureTeamsDir(): void {
  if (!fs.existsSync(TEAMS_DIR)) {
    fs.mkdirSync(TEAMS_DIR, { recursive: true });
    logger.info(`Created teams directory: ${TEAMS_DIR}`);
  }
}

/**
 * Get the file path for a team's vault
 */
function getTeamFilePath(teamId: string): string {
  // Sanitize teamId to prevent directory traversal
  const sanitizedId = teamId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(TEAMS_DIR, `${sanitizedId}.json`);
}

/**
 * Generate a unique ID for a credential
 */
function generateCredentialId(): string {
  return `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * List all team IDs
 */
export function listTeams(): string[] {
  ensureTeamsDir();

  try {
    const files = fs.readdirSync(TEAMS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort((a, b) => {
        // Sort numerically if possible (team1, team2, team10)
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
  } catch (error) {
    logger.error('Error listing teams:', error);
    return [];
  }
}

/**
 * Get all team summaries
 */
export function getTeamSummaries(): TeamSummary[] {
  const teamIds = listTeams();
  return teamIds.map(teamId => {
    const vault = getTeamVault(teamId);
    if (!vault) {
      return {
        teamId,
        teamName: formatTeamName(teamId),
        totalCredentials: 0,
        crackedCount: 0,
        uncrackedCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const crackedCount = vault.credentials.filter(c => c.password !== null).length;
    return {
      teamId: vault.teamId,
      teamName: vault.teamName,
      totalCredentials: vault.credentials.length,
      crackedCount,
      uncrackedCount: vault.credentials.length - crackedCount,
      lastUpdated: vault.updatedAt,
    };
  });
}

/**
 * Format a team ID into a display name
 */
function formatTeamName(teamId: string): string {
  // Convert "team1" to "Team 1", "team10" to "Team 10"
  const match = teamId.match(/^team(\d+)$/i);
  if (match) {
    return `Team ${match[1]}`;
  }
  // Capitalize first letter for other formats
  return teamId.charAt(0).toUpperCase() + teamId.slice(1);
}

/**
 * Get a team's vault
 */
export function getTeamVault(teamId: string): TeamVault | null {
  ensureTeamsDir();
  const filePath = getTeamFilePath(teamId);

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as TeamVault;
  } catch (error) {
    logger.error(`Error reading team vault ${teamId}:`, error);
    return null;
  }
}

/**
 * Create a new team vault
 */
export function createTeamVault(teamId: string, teamName?: string): TeamVault {
  ensureTeamsDir();
  const filePath = getTeamFilePath(teamId);

  // Check if already exists
  if (fs.existsSync(filePath)) {
    const existing = getTeamVault(teamId);
    if (existing) return existing;
  }

  const now = new Date().toISOString();
  const vault: TeamVault = {
    teamId,
    teamName: teamName || formatTeamName(teamId),
    credentials: [],
    createdAt: now,
    updatedAt: now,
  };

  fs.writeFileSync(filePath, JSON.stringify(vault, null, 2));
  logger.info(`Created team vault: ${teamId}`);

  return vault;
}

/**
 * Save a team vault
 */
export function saveTeamVault(vault: TeamVault): void {
  ensureTeamsDir();
  const filePath = getTeamFilePath(vault.teamId);

  vault.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(vault, null, 2));
  logger.debug(`Saved team vault: ${vault.teamId}`);
}

/**
 * Delete a team vault
 */
export function deleteTeamVault(teamId: string): boolean {
  const filePath = getTeamFilePath(teamId);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted team vault: ${teamId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting team vault ${teamId}:`, error);
    return false;
  }
}

/**
 * Add hashes to a team vault
 */
export function addHashesToTeam(
  teamId: string,
  hashes: string[],
  hashTypeId: number,
  hashTypeName: string,
  labels?: (string | undefined)[] // Optional labels (usernames) for each hash
): { added: number; duplicates: number } {
  let vault = getTeamVault(teamId);

  if (!vault) {
    vault = createTeamVault(teamId);
  }

  // Build a set of existing hashes for duplicate detection (case-insensitive)
  const existingHashes = new Set(vault.credentials.map(c => c.hash.toLowerCase()));

  const now = new Date().toISOString();
  let added = 0;
  let duplicates = 0;

  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    const hashLower = hash.toLowerCase();

    if (existingHashes.has(hashLower)) {
      duplicates++;
      continue;
    }

    const credential: TeamCredential = {
      id: generateCredentialId(),
      hash: hash,
      hashTypeId: hashTypeId,
      hashTypeName: hashTypeName,
      username: labels?.[i] || null,
      password: null,
      credentialType: 'tsi', // Default to TSI for team imports
      vmIds: [],
      scope: 'team-wide', // Default scope for team imports
      source: null,
      crackedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    vault.credentials.push(credential);
    existingHashes.add(hashLower);
    added++;
  }

  if (added > 0) {
    saveTeamVault(vault);
    logger.info(`Added ${added} hashes to team ${teamId} (${duplicates} duplicates skipped)`);
  }

  return { added, duplicates };
}

/**
 * Update credentials when a hash is cracked
 */
export function updateCredentialPassword(teamId: string, hash: string, password: string): boolean {
  const vault = getTeamVault(teamId);
  if (!vault) return false;

  const hashLower = hash.toLowerCase();
  let updated = false;

  for (const credential of vault.credentials) {
    if (credential.hash.toLowerCase() === hashLower && credential.password === null) {
      credential.password = password;
      credential.crackedAt = new Date().toISOString();
      updated = true;
    }
  }

  if (updated) {
    saveTeamVault(vault);
    logger.info(`Updated cracked password in team ${teamId} for hash ${hash.substring(0, 8)}...`);
  }

  return updated;
}

/**
 * Sync cracked hashes across all team vaults
 * Called when new passwords are cracked
 */
export function syncCrackedHashesToAllTeams(
  crackedHashes: Array<{ hash: string; password: string }>
): { teamsUpdated: number; credentialsUpdated: number; updatedTeamIds: string[] } {
  const teamIds = listTeams();
  let teamsUpdated = 0;
  let credentialsUpdated = 0;
  const updatedTeamIds: string[] = [];

  // Build a lookup map for quick access (case-insensitive)
  const crackedMap = new Map<string, string>();
  for (const { hash, password } of crackedHashes) {
    crackedMap.set(hash.toLowerCase(), password);
  }

  for (const teamId of teamIds) {
    const vault = getTeamVault(teamId);
    if (!vault) continue;

    let teamModified = false;

    for (const credential of vault.credentials) {
      if (credential.password !== null) continue; // Already cracked

      const password = crackedMap.get(credential.hash.toLowerCase());
      if (password !== undefined) {
        credential.password = password;
        credential.crackedAt = new Date().toISOString();
        teamModified = true;
        credentialsUpdated++;
      }
    }

    if (teamModified) {
      saveTeamVault(vault);
      teamsUpdated++;
      updatedTeamIds.push(teamId);
    }
  }

  if (credentialsUpdated > 0) {
    logger.info(`Synced ${credentialsUpdated} cracked passwords across ${teamsUpdated} teams`);
  }

  return { teamsUpdated, credentialsUpdated, updatedTeamIds };
}

/**
 * Remove a credential from a team
 */
export function removeCredentialFromTeam(teamId: string, credentialId: string): boolean {
  const vault = getTeamVault(teamId);
  if (!vault) return false;

  const originalLength = vault.credentials.length;
  vault.credentials = vault.credentials.filter(c => c.id !== credentialId);

  if (vault.credentials.length < originalLength) {
    saveTeamVault(vault);
    logger.info(`Removed credential ${credentialId} from team ${teamId}`);
    return true;
  }

  return false;
}

/**
 * Clear all credentials from a team
 */
export function clearTeamCredentials(teamId: string): boolean {
  const vault = getTeamVault(teamId);
  if (!vault) return false;

  const count = vault.credentials.length;
  vault.credentials = [];
  saveTeamVault(vault);

  logger.info(`Cleared ${count} credentials from team ${teamId}`);
  return true;
}

/**
 * Get all uncracked hashes from a team for cracking
 */
export function getUncrackedHashesFromTeam(
  teamId: string
): Array<{ hash: string; hashTypeId: number }> {
  const vault = getTeamVault(teamId);
  if (!vault) return [];

  return vault.credentials
    .filter(c => c.password === null)
    .map(c => ({ hash: c.hash, hashTypeId: c.hashTypeId }));
}

/**
 * Get all uncracked hashes from all teams
 */
export function getAllUncrackedHashes(): Array<{
  teamId: string;
  hash: string;
  hashTypeId: number;
}> {
  const teamIds = listTeams();
  const results: Array<{ teamId: string; hash: string; hashTypeId: number }> = [];

  for (const teamId of teamIds) {
    const vault = getTeamVault(teamId);
    if (!vault) continue;

    for (const credential of vault.credentials) {
      if (credential.password === null) {
        results.push({ teamId, hash: credential.hash, hashTypeId: credential.hashTypeId });
      }
    }
  }

  return results;
}

/**
 * Update credential fields
 */
export function updateCredential(
  teamId: string,
  credentialId: string,
  updates: Partial<TeamCredential>
): TeamCredential | null {
  const vault = getTeamVault(teamId);
  if (!vault) return null;

  const index = vault.credentials.findIndex(c => c.id === credentialId);
  if (index < 0) return null;

  const existing = vault.credentials[index];
  vault.credentials[index] = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  saveTeamVault(vault);
  logger.info(`Updated credential ${credentialId} in team ${teamId}`);
  return vault.credentials[index];
}

/**
 * Update VM assignments for a credential
 */
export function updateCredentialVMs(
  teamId: string,
  credentialId: string,
  vmIds: string[]
): TeamCredential | null {
  const vault = getTeamVault(teamId);
  if (!vault) return null;

  const credential = vault.credentials.find(c => c.id === credentialId);
  if (!credential) return null;

  credential.vmIds = vmIds;
  credential.updatedAt = new Date().toISOString();
  saveTeamVault(vault);

  logger.info(`Updated VM assignments for credential ${credentialId} in team ${teamId}`);
  return credential;
}

/**
 * Update credential type (shared or TSI)
 */
export function updateCredentialType(
  teamId: string,
  credentialId: string,
  credentialType: 'shared' | 'tsi'
): TeamCredential | null {
  const vault = getTeamVault(teamId);
  if (!vault) return null;

  const credential = vault.credentials.find(c => c.id === credentialId);
  if (!credential) return null;

  credential.credentialType = credentialType;
  credential.updatedAt = new Date().toISOString();
  saveTeamVault(vault);

  logger.info(`Updated credential type to ${credentialType} for credential ${credentialId}`);
  return credential;
}

/**
 * Update credential source
 */
export function updateCredentialSource(
  teamId: string,
  credentialId: string,
  source: string
): TeamCredential | null {
  const vault = getTeamVault(teamId);
  if (!vault) return null;

  const credential = vault.credentials.find(c => c.id === credentialId);
  if (!credential) return null;

  credential.source = source;
  credential.updatedAt = new Date().toISOString();
  saveTeamVault(vault);

  logger.info(`Updated source for credential ${credentialId} to ${source}`);
  return credential;
}

/**
 * Get credentials filtered by VM
 */
export function getCredentialsByVM(teamId: string, vmId: string): TeamCredential[] {
  const vault = getTeamVault(teamId);
  if (!vault) return [];

  return vault.credentials.filter(c => c.vmIds.includes(vmId));
}

/**
 * Get credentials filtered by type
 */
export function getCredentialsByType(
  teamId: string,
  credentialType: 'shared' | 'tsi'
): TeamCredential[] {
  const vault = getTeamVault(teamId);
  if (!vault) return [];

  return vault.credentials.filter(c => c.credentialType === credentialType);
}

/**
 * Get credentials filtered by source
 */
export function getCredentialsBySource(teamId: string, source: string): TeamCredential[] {
  const vault = getTeamVault(teamId);
  if (!vault) return [];

  return vault.credentials.filter(c => c.source === source);
}

/**
 * Merge shared credentials into team vault view
 * Returns combined list of team TSI credentials + shared credentials
 * Team TSI credentials take precedence over shared (deduplication by hash)
 * Shared credentials are marked as read-only with global scope
 */
export function mergeSharedCredentials(teamId: string): TeamCredential[] {
  const vault = getTeamVault(teamId);
  if (!vault) return [];

  // Import shared storage dynamically to avoid circular dependency
  const { getAllSharedCredentials } = require('./sharedStorage');
  const sharedCredentials = getAllSharedCredentials();

  // Build a map of team credentials by hash (lowercase for case-insensitive comparison)
  const teamCredentialsMap = new Map<string, TeamCredential>();
  for (const credential of vault.credentials) {
    teamCredentialsMap.set(credential.hash.toLowerCase(), credential);
  }

  // Start with all team credentials
  const merged: TeamCredential[] = [...vault.credentials];

  // Add shared credentials that don't already exist in team
  for (const shared of sharedCredentials) {
    const hashLower = shared.hash.toLowerCase();
    if (!teamCredentialsMap.has(hashLower)) {
      // Add shared credential with reference to team
      // Ensure scope is set to 'global' and mark as shared
      merged.push({
        ...shared,
        credentialType: 'shared',
        scope: 'global',
      });
    }
  }

  // Sort by createdAt (newest first)
  return merged.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Get team vault with shared credentials merged
 * Returns enhanced vault view including both TSI and shared credentials
 */
export function getTeamVaultWithShared(teamId: string): TeamVault | null {
  const vault = getTeamVault(teamId);
  if (!vault) return null;

  const mergedCredentials = mergeSharedCredentials(teamId);

  return {
    ...vault,
    credentials: mergedCredentials,
  };
}

/**
 * Clear all passwords from a team's credentials
 * Sets all password fields back to null
 */
export function clearTeamPasswords(teamId: string): {
  success: boolean;
  clearedCount: number;
  error?: string;
} {
  const vault = getTeamVault(teamId);
  if (!vault) {
    return { success: false, clearedCount: 0, error: 'Team not found' };
  }

  let clearedCount = 0;
  const now = new Date().toISOString();

  for (const credential of vault.credentials) {
    if (credential.password !== null) {
      credential.password = null;
      credential.crackedAt = null;
      credential.updatedAt = now;
      clearedCount++;
    }
  }

  if (clearedCount > 0) {
    saveTeamVault(vault);
    logger.info(`Cleared ${clearedCount} passwords from team ${teamId}`);
  }

  return { success: true, clearedCount };
}
