import { Credential } from '@/types/credential';

export interface CredentialSelectionState {
  selectedCredentials: Credential[];
  selectedCrackableRows: Array<Credential & { hashType: number }>;
  selectedHashTypes: number[];
  crackJobDrafts: CrackJobDraft[];
  canSendSelectedToCracker: boolean;
  sendDisabledReason: string;
}

export interface CrackJobDraft {
  hashType: number;
  hashes: string[];
  rowCount: number;
}

export function buildCredentialSelectionState(
  credentials: Credential[],
  selectedIds: Set<string>
): CredentialSelectionState {
  const selectedCredentials = credentials.filter(credential => selectedIds.has(credential.id));
  const selectedCrackableRows = selectedCredentials.filter(
    (credential): credential is Credential & { hashType: number } =>
      credential.hash.trim() !== '' &&
      credential.hashType !== null &&
      credential.password.trim() === ''
  );

  const selectedHashTypes = Array.from(
    new Set(selectedCrackableRows.map(credential => credential.hashType))
  );
  const groupedRows = new Map<number, { hashes: Set<string>; rowCount: number }>();

  for (const credential of selectedCrackableRows) {
    const existingGroup = groupedRows.get(credential.hashType) ?? {
      hashes: new Set<string>(),
      rowCount: 0,
    };
    existingGroup.hashes.add(credential.hash.trim());
    existingGroup.rowCount += 1;
    groupedRows.set(credential.hashType, existingGroup);
  }

  const crackJobDrafts = Array.from(groupedRows.entries())
    .map(([hashType, group]) => ({
      hashType,
      hashes: Array.from(group.hashes),
      rowCount: group.rowCount,
    }))
    .sort((a, b) => a.hashType - b.hashType);

  const canSendSelectedToCracker = selectedIds.size > 0 && crackJobDrafts.length > 0;

  return {
    selectedCredentials,
    selectedCrackableRows,
    selectedHashTypes,
    crackJobDrafts,
    canSendSelectedToCracker,
    sendDisabledReason:
      selectedIds.size > 0 && crackJobDrafts.length === 0
        ? 'Select rows with a hash, a hash type, and no existing plaintext password.'
        : '',
  };
}
