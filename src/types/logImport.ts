import { CredentialVaultDocument } from '@/types/credentialVault';

export type LogImportType = 'impacket-ntlm' | 'mimikatz' | 'impacket-cached-domain' | 'config-file';

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
}

export interface LogImportResponse {
  vault: CredentialVaultDocument;
  result: LogImportResult;
}
