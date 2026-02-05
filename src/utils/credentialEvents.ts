/**
 * Credential Events - SSE broadcasting for credential CRUD operations
 */

import { sendEventToAll } from './miscUtils';

import { TeamCredential } from '@/types/teamVault';

// Event payload types
export interface CredentialCreatedEvent {
  teamId: string;
  credential: TeamCredential;
}

export interface CredentialUpdatedEvent {
  teamId: string;
  credential: TeamCredential;
  changedFields: string[];
}

export interface CredentialDeletedEvent {
  teamId: string;
  credentialId: string;
  hash: string;
}

export interface SharedCredentialUpdatedEvent {
  credential: TeamCredential;
}

/**
 * Broadcast credential created event to all connected clients
 */
export function broadcastCredentialCreated(teamId: string, credential: TeamCredential): void {
  sendEventToAll('credentialCreated', {
    teamId,
    credential,
  } as CredentialCreatedEvent);
}

/**
 * Broadcast credential updated event to all connected clients
 */
export function broadcastCredentialUpdated(
  teamId: string,
  credential: TeamCredential,
  changedFields: string[]
): void {
  sendEventToAll('credentialUpdated', {
    teamId,
    credential,
    changedFields,
  } as CredentialUpdatedEvent);
}

/**
 * Broadcast credential deleted event to all connected clients
 */
export function broadcastCredentialDeleted(
  teamId: string,
  credentialId: string,
  hash: string
): void {
  sendEventToAll('credentialDeleted', {
    teamId,
    credentialId,
    hash,
  } as CredentialDeletedEvent);
}

/**
 * Broadcast shared credential updated event to all connected clients
 */
export function broadcastSharedCredentialUpdated(credential: TeamCredential): void {
  sendEventToAll('sharedCredentialUpdated', {
    credential,
  } as SharedCredentialUpdatedEvent);
}
