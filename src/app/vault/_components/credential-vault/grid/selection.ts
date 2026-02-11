import { Credential } from '@/types/credential';

export interface CredentialSelectionState {
  selectedCredentials: Credential[];
  selectedCrackableRows: Array<Credential & { hashType: number }>;
  selectedHashTypes: number[];
  hasMixedSelectedHashTypes: boolean;
  canSendSelectedToCracker: boolean;
  sendDisabledReason: string;
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
  const hasMixedSelectedHashTypes = selectedHashTypes.length > 1;
  const canSendSelectedToCracker =
    selectedIds.size > 0 && selectedCrackableRows.length > 0 && !hasMixedSelectedHashTypes;

  return {
    selectedCredentials,
    selectedCrackableRows,
    selectedHashTypes,
    hasMixedSelectedHashTypes,
    canSendSelectedToCracker,
    sendDisabledReason: hasMixedSelectedHashTypes
      ? 'Selected rows contain multiple hash types. Choose rows with one hash type.'
      : '',
  };
}
