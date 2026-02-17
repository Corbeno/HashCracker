import { CredentialVaultDocument } from '@/types/credentialVault';

export type LogImportType = 'impacket-ntlm' | 'mimikatz' | 'generic' | 'impacket-cached-domain';

export interface LogImportRequest {
  tabId: string;
  logType: LogImportType;
  rawLog: string;
}

export interface LogImportResult {
  parsedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  conflictCount: number;
  sharedCount: number;
}

export interface LogImportResponse {
  vault: CredentialVaultDocument;
  result: LogImportResult;
}
