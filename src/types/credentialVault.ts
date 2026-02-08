export interface Credential {
  id: string;
  username: string;
  password: string;
  hash: string;
  device: string;
}

export interface CredentialVaultTab {
  id: string;
  name: string;
  credentials: Credential[];
}

export interface CredentialVaultDocument {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  tabs: CredentialVaultTab[];
}

export type CredentialField = keyof Credential;

export type CredentialVaultMutation =
  | {
      type: 'tab.create';
      payload: {
        name?: string;
      };
    }
  | {
      type: 'tab.rename';
      payload: {
        tabId: string;
        name: string;
      };
    }
  | {
      type: 'tab.delete';
      payload: {
        tabId: string;
      };
    }
  | {
      type: 'credential.create';
      payload: {
        tabId: string;
        credentialId?: string;
      };
    }
  | {
      type: 'credential.update';
      payload: {
        tabId: string;
        credentialId: string;
        field: CredentialField;
        value: Credential[CredentialField];
      };
    }
  | {
      type: 'credential.deleteMany';
      payload: {
        tabId: string;
        credentialIds: string[];
      };
    };
