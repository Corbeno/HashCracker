import { Credential } from '@/types/credentialVault';
import { LogImportResult } from '@/types/logImport';

export interface ParsedCredentialRecord {
  username: string;
  hash: string;
  hashType: 'NTLM';
}

export interface MergeImportResult {
  nextCredentials: Credential[];
  result: LogImportResult;
}
