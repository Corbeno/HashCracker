/**
 * Import Credentials API - Enhanced to support parser-based import
 * POST /api/teams/[teamId]/import - Import credentials with VM assignment
 */

import { NextResponse } from 'next/server';

import config from '@/config';
import { ImportCredentialsRequest, ParsedCredential, TeamCredential } from '@/types/teamVault';
import {
  broadcastCredentialCreated,
  broadcastCredentialUpdated,
  broadcastSharedCredentialUpdated,
} from '@/utils/credentialEvents';
import { logger } from '@/utils/logger';
import { broadcastTeamSummaries, broadcastTeamVaultUpdate } from '@/utils/teamEvents';
import {
  addHashesToTeam,
  createTeamVault,
  getTeamVault,
  getTeamVaultWithShared,
  saveTeamVault,
  updateCredential,
} from '@/utils/teamStorage';
import {
  addSharedCredential,
  getAllSharedCredentials,
  updateSharedCredential,
} from '@/utils/sharedStorage';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

interface EnhancedImportRequest {
  credentials: ParsedCredential[];
  vmIds?: string[];
  credentialType?: 'shared' | 'tsi';
  autoLink?: boolean;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const body = await req.json();

    // Check if this is an enhanced import (with pre-parsed credentials)
    if (body.credentials && Array.isArray(body.credentials)) {
      return handleEnhancedImport(teamId, body as EnhancedImportRequest);
    }

    // Otherwise, handle legacy import (text + hashType)
    return handleLegacyImport(teamId, body as ImportCredentialsRequest);
  } catch (error) {
    logger.error('Error importing credentials:', error);
    return NextResponse.json({ error: 'Failed to import credentials' }, { status: 500 });
  }
}

/**
 * Handle enhanced import with pre-parsed credentials
 */
async function handleEnhancedImport(teamId: string, body: EnhancedImportRequest) {
  const { credentials, vmIds = [], credentialType = 'tsi', autoLink = true } = body;

  if (!credentials.length) {
    return NextResponse.json({
      success: true,
      imported: 0,
      linked: 0,
      duplicates: 0,
      total: 0,
      withUsernames: 0,
      message: 'No credentials to import',
    });
  }

  // SPECIAL CASE: If credentialType is 'shared', add directly to shared vault
  if (credentialType === 'shared') {
    return await handleSharedImport(body);
  }

  // Create team if it doesn't exist
  let vault = getTeamVault(teamId);
  if (!vault) {
    vault = createTeamVault(teamId);
  }

  // Get existing credentials for auto-linking
  const existingVault = getTeamVaultWithShared(teamId);
  const existingCredentials = existingVault?.credentials || [];

  // Build lookup map: lowercaseUsername:hashTypeId -> credential
  const existingByUsername = new Map<string, TeamCredential>();
  for (const cred of existingCredentials) {
    if (cred.username) {
      const key = `${cred.username.toLowerCase()}:${cred.hashTypeId}`;
      existingByUsername.set(key, cred);
    }
  }

  // Group credentials by hash type (for new additions)
  const byHashType = new Map<number, { hashes: string[]; usernames: (string | null)[] }>();

  let totalAdded = 0;
  let totalDuplicates = 0;
  let totalLinked = 0;
  const linkedCredentials: Array<{ credential: TeamCredential; changedFields: string[] }> = [];

  for (const cred of credentials) {
    if (autoLink && cred.username) {
      const key = `${cred.username.toLowerCase()}:${cred.hashTypeId}`;
      const existing = existingByUsername.get(key);

      if (existing) {
        const updatedVmIds = [...new Set([...existing.vmIds, ...vmIds])];
        const changedFields: string[] = [];
        const updates: Partial<TeamCredential> = {
          hash: cred.hash,
          hashTypeId: cred.hashTypeId,
          hashTypeName: cred.hashTypeName,
          username: cred.username,
          vmIds: updatedVmIds,
          credentialType,
        };

        if (cred.metadata?.source) {
          updates.source = cred.metadata.source;
        }

        let updated = updateCredential(teamId, existing.id, updates);

        if (!updated) {
          const sharedUpdates: Partial<
            Omit<TeamCredential, 'id' | 'createdAt' | 'credentialType'>
          > = {
            hash: cred.hash,
            hashTypeId: cred.hashTypeId,
            hashTypeName: cred.hashTypeName,
            username: cred.username,
            vmIds: updatedVmIds,
          };

          if (cred.metadata?.source) {
            sharedUpdates.source = cred.metadata.source;
          }

          const sharedUpdated = updateSharedCredential(existing.id, sharedUpdates);
          updated = sharedUpdated ?? null;
        }

        if (updated) {
          totalLinked++;
          // Track changed fields for broadcast
          if (vmIds.length > 0) changedFields.push('vmIds');
          if (credentialType !== 'tsi') changedFields.push('credentialType');
          if (cred.metadata?.source) changedFields.push('source');
          linkedCredentials.push({ credential: updated, changedFields });
          continue;
        }
      }
    }

    const existing = byHashType.get(cred.hashTypeId) || { hashes: [], usernames: [] };
    existing.hashes.push(cred.hash);
    existing.usernames.push(cred.username);
    byHashType.set(cred.hashTypeId, existing);
  }

  // Track credentials before adding new ones
  const vaultBefore = getTeamVault(teamId);
  const credentialsBefore = new Set(vaultBefore?.credentials.map(c => c.id) || []);

  // Add credentials to team for each hash type
  for (const [hashTypeId, data] of byHashType) {
    const hashTypeConfig = config.hashcat.hashTypes[hashTypeId];
    const hashTypeName = hashTypeConfig?.name || 'Unknown';

    const { added, duplicates } = addHashesToTeam(
      teamId,
      data.hashes,
      hashTypeId,
      hashTypeName,
      data.usernames.map(u => u ?? undefined) as (string | undefined)[]
    );

    totalAdded += added;
    totalDuplicates += duplicates;
  }

  // Get newly created credentials
  const vaultAfter = getTeamVault(teamId);
  const createdCredentials =
    vaultAfter?.credentials.filter(c => !credentialsBefore.has(c.id)) || [];

  // Update credentials with VM IDs and credential type
  // This requires modifying team storage to handle these fields
  const vaultWithVMs = getTeamVault(teamId);
  if (vaultWithVMs && (vmIds.length > 0 || credentialType !== 'tsi')) {
    for (const cred of vaultWithVMs.credentials) {
      // Find matching credential from import
      const importedCred = credentials.find(c => c.hash.toLowerCase() === cred.hash.toLowerCase());
      if (importedCred) {
        // Update VM IDs if provided
        if (vmIds.length > 0) {
          cred.vmIds = [...new Set([...cred.vmIds, ...vmIds])];
        }
        // Update credential type
        cred.credentialType = credentialType;
        // Set source if available
        if (importedCred.metadata?.source) {
          cred.source = importedCred.metadata.source;
        }
      }
    }

    // Save updated vault
    saveTeamVault(vaultWithVMs);
  }

  // Broadcast individual credential created events
  for (const cred of createdCredentials) {
    broadcastCredentialCreated(teamId, cred);
  }

  // Broadcast individual credential updated events for linked
  for (const { credential, changedFields } of linkedCredentials) {
    broadcastCredentialUpdated(teamId, credential, changedFields);
  }

  const withUsernames = credentials.filter(c => c.username).length;

  logger.info(
    `Enhanced import: ${totalAdded} credentials to team ${teamId} ` +
      `(${totalLinked} linked, ${totalDuplicates} duplicates, ${withUsernames} with usernames, VMs: ${vmIds.join(', ')})`
  );

  if (totalAdded > 0) {
    broadcastTeamVaultUpdate(teamId);
    broadcastTeamSummaries();
  }

  return NextResponse.json({
    success: true,
    imported: totalAdded,
    linked: totalLinked,
    duplicates: totalDuplicates,
    total: credentials.length,
    withUsernames,
  });
}

/**
 * Handle shared credential import - adds directly to shared vault and syncs to all teams
 */
async function handleSharedImport(body: EnhancedImportRequest) {
  const { credentials, vmIds = [], autoLink = true } = body;

  // Get existing shared credentials for auto-linking
  const existingShared = getAllSharedCredentials();
  const existingByUsername = new Map<string, TeamCredential>();
  for (const cred of existingShared) {
    if (cred.username) {
      const key = `${cred.username.toLowerCase()}:${cred.hashTypeId}`;
      existingByUsername.set(key, cred);
    }
  }

  let totalAdded = 0;
  let totalLinked = 0;
  let totalDuplicates = 0;
  const linkedCredentials: TeamCredential[] = [];

  for (const cred of credentials) {
    if (autoLink && cred.username) {
      const key = `${cred.username.toLowerCase()}:${cred.hashTypeId}`;
      const existing = existingByUsername.get(key);

      if (existing) {
        // Update existing shared credential
        const updatedVmIds =
          vmIds.length > 0 ? [...new Set([...existing.vmIds, ...vmIds])] : existing.vmIds;

        const updated = updateSharedCredential(existing.id, {
          hash: cred.hash,
          hashTypeId: cred.hashTypeId,
          hashTypeName: cred.hashTypeName,
          username: cred.username,
          vmIds: updatedVmIds,
          source: cred.metadata?.source || existing.source,
        });

        if (updated) {
          totalLinked++;
          linkedCredentials.push(updated);
        }
        continue;
      }
    }

    // Add new shared credential
    addSharedCredential({
      hash: cred.hash,
      hashTypeId: cred.hashTypeId,
      hashTypeName: cred.hashTypeName,
      username: cred.username || null,
      password: null,
      vmIds: vmIds.length > 0 ? vmIds : [],
      source: cred.metadata?.source || 'import',
      scope: 'global',
      crackedAt: null,
    });

    totalAdded++;
  }

  const withUsernames = credentials.filter(c => c.username).length;

  logger.info(
    `Shared import: ${totalAdded} credentials to shared vault ` +
      `(${totalLinked} linked, ${totalDuplicates} duplicates, ${withUsernames} with usernames)`
  );

  // Broadcast shared credentials update
  for (const cred of linkedCredentials) {
    broadcastSharedCredentialUpdated(cred);
  }

  // Sync shared credentials to all teams to ensure they have the latest
  const syncResponse = await fetch('/api/shared/sync-to-teams', {
    method: 'POST',
  });

  broadcastTeamSummaries();

  return NextResponse.json({
    success: true,
    imported: totalAdded,
    linked: totalLinked,
    duplicates: totalDuplicates,
    total: credentials.length,
    withUsernames,
    message: `Shared credentials imported. Syncing to all teams...`,
  });
}

/**
 * Handle legacy import (text + hashType with regex extraction)
 */
async function handleLegacyImport(teamId: string, body: ImportCredentialsRequest) {
  if (!body.text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  if (body.hashType === undefined || body.hashType === null) {
    return NextResponse.json({ error: 'hashType is required' }, { status: 400 });
  }

  // Get hash type config
  const hashTypeConfig = config.hashcat.hashTypes[body.hashType];
  if (!hashTypeConfig) {
    return NextResponse.json({ error: 'Invalid hash type' }, { status: 400 });
  }

  const hashRegex = hashTypeConfig.regex;
  if (!hashRegex || hashRegex.trim() === '') {
    return NextResponse.json(
      { error: 'This hash type does not have a regex pattern for extraction' },
      { status: 400 }
    );
  }

  // Create team if it doesn't exist
  let vault = getTeamVault(teamId);
  if (!vault) {
    vault = createTeamVault(teamId);
  }

  // Extract hashes using regex pattern
  const hashes: string[] = [];
  const lines = body.text.split('\n');

  try {
    for (const line of lines) {
      const regexForExec = new RegExp(hashRegex, 'g');
      let match;

      while ((match = regexForExec.exec(line)) !== null) {
        hashes.push(match[match.length - 1]);
      }
    }
  } catch (regexError) {
    logger.error(`Error with regex pattern for hash type ${body.hashType}:`, regexError);
    return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 500 });
  }

  // Remove duplicates from extracted hashes
  const uniqueHashes = [...new Set(hashes)];

  if (uniqueHashes.length === 0) {
    return NextResponse.json({
      success: true,
      imported: 0,
      duplicates: 0,
      total: 0,
      withUsernames: 0,
      message: 'No hashes found matching selected hash type',
    });
  }

  // Add hashes to team
  const { added, duplicates } = addHashesToTeam(
    teamId,
    uniqueHashes,
    hashTypeConfig.id,
    hashTypeConfig.name
  );

  logger.info(
    `Legacy import: ${added} ${hashTypeConfig.name} hashes to team ${teamId} ` +
      `(${duplicates} duplicates, ${uniqueHashes.length} extracted)`
  );

  if (added > 0) {
    broadcastTeamVaultUpdate(teamId);
    broadcastTeamSummaries();
  }

  return NextResponse.json({
    success: true,
    imported: added,
    duplicates,
    total: uniqueHashes.length,
    withUsernames: 0,
  });
}
