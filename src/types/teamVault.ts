/**
 * Team-based password vault types for cyber defense competitions
 * Stores credentials organized by team - supports all hash types
 */

/**
 * VM (Virtual Machine) tracking for CDC competitions
 * VMs can be global (shared across all teams) or team-specific
 */
export interface VM {
  id: string;
  name: string;
  scope: 'global' | 'team-specific';
  teamId?: string; // Only for team-specific VMs
  ipAddress?: string;
  osType?: 'windows' | 'linux' | 'network' | 'other';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Credential scope - determines visibility and applicability
 * - 'global': Shared across all teams
 * - 'team-wide': Applicable to entire team
 * - 'vm-specific': Applicable only to specific VMs
 */
export type CredentialScope = 'global' | 'team-wide' | 'vm-specific';

/**
 * Enhanced credential with CDC-specific fields
 * Supports both shared credentials (across all teams) and TSI (Team-Specific Info)
 */
export interface TeamCredential {
  id: string;
  hash: string; // The hash value to crack
  hashTypeId: number; // Hashcat hash type ID (e.g., 1000 for NTLM, 0 for MD5)
  hashTypeName: string; // Display name (e.g., "NTLM", "MD5")
  username: string | null; // Username associated with the hash (renamed from 'label' for clarity)
  password: string | null; // Null until cracked, then the plaintext password
  credentialType: 'shared' | 'tsi'; // NEW: Whether this is a shared or team-specific credential
  vmIds: string[]; // NEW: Which VMs this credential works on
  scope: CredentialScope; // NEW: Scope of credential applicability
  source: string | null; // NEW: Where it came from (log file name, manual entry, etc.)
  crackedAt: string | null; // ISO date string when password was cracked
  createdAt: string; // ISO date string when credential was added
  updatedAt: string; // ISO date string when credential was last updated
}

/**
 * Type guard to validate credential scope
 */
export function isValidScope(scope: string): scope is CredentialScope {
  return ['global', 'team-wide', 'vm-specific'].includes(scope);
}

/**
 * Derive credential scope from existing credential data
 * Used for migration and initialization of new credentials
 */
export function deriveScope(credential: {
  credentialType: 'shared' | 'tsi';
  vmIds: string[];
}): CredentialScope {
  if (credential.credentialType === 'shared') return 'global';
  if (credential.vmIds.length === 0) return 'team-wide';
  return 'vm-specific';
}

/**
 * Legacy credential interface for backward compatibility
 * @deprecated Use TeamCredential instead
 */
export interface LegacyTeamCredential {
  id: string;
  hash: string;
  hashTypeId: number;
  hashTypeName: string;
  label: string | null;
  password: string | null;
  crackedAt: string | null;
  createdAt: string;
}

/**
 * Shared credentials vault - global credentials accessible to all teams
 * Stored in data/shared.json
 */
export interface SharedCredentialsVault {
  credentials: TeamCredential[];
  updatedAt: string;
}

export interface TeamVault {
  teamId: string; // e.g., "team1", "team2"
  teamName: string; // Display name, e.g., "Team 1"
  credentials: TeamCredential[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Credential with resolved VM information (for UI display)
 */
export interface CredentialWithVMs extends TeamCredential {
  vms: VM[]; // Resolved VM objects
}

/**
 * Filter options for credential queries
 */
export interface CredentialFilters {
  credentialType?: 'shared' | 'tsi';
  vmId?: string;
  hashTypeId?: number;
  cracked?: boolean;
  searchTerm?: string;
}

export interface TeamSummary {
  teamId: string;
  teamName: string;
  totalCredentials: number;
  crackedCount: number;
  uncrackedCount: number;
  lastUpdated: string;
}

// For creating new teams
export interface CreateTeamRequest {
  teamId: string;
  teamName?: string;
}

// For importing credentials (generic - works with any hash type)
export interface ImportCredentialsRequest {
  teamId: string;
  text: string; // Raw text containing hashes
  hashType: number; // Hashcat hash type ID
  parserId?: string; // Optional: Use specific parser (e.g., 'ntlm-pwdump')
  vmIds?: string[]; // Optional: Assign to specific VMs
  credentialType?: 'shared' | 'tsi'; // Optional: Specify credential type
}

export interface ImportCredentialsResponse {
  imported: number;
  duplicates: number;
  total: number;
  withUsernames: number; // Number of credentials that had usernames extracted
}

// For creating/updating VMs
export interface CreateVMRequest {
  id: string;
  name: string;
  scope: 'global' | 'team-specific';
  teamId?: string;
  ipAddress?: string;
  osType?: 'windows' | 'linux' | 'network' | 'other';
  description?: string;
}

export interface UpdateVMRequest {
  name?: string;
  ipAddress?: string;
  osType?: 'windows' | 'linux' | 'network' | 'other';
  description?: string;
}

// For credential operations
export interface UpdateCredentialRequest {
  vmIds?: string[];
  credentialType?: 'shared' | 'tsi';
  username?: string;
}

// Parser-related types
export interface ParsedCredential {
  username: string | null;
  hash: string;
  hashTypeId: number;
  hashTypeName: string;
  metadata?: Record<string, any>;
}

export interface ParserInfo {
  id: string;
  name: string;
  description: string;
  supportedFormats: string[];
  hashTypeId: number;
}

export interface ParseRequest {
  parserId: string;
  text: string;
}

export interface ParseResponse {
  credentials: ParsedCredential[];
  parser: string;
  count: number;
  filtered?: {
    machineAccounts: number;
    emptyHashes: number;
    duplicates: number;
  };
}

export interface AutoParseResponse extends ParseResponse {
  parserUsed: string;
  allResults: Array<{
    parserId: string;
    credentials: ParsedCredential[];
    count: number;
  }>;
}
