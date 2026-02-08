import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Credential,
  CredentialVaultDocument,
  CredentialVaultMutation,
  CredentialVaultTab,
} from '@/types/credentialVault';

interface CredentialVaultResponse {
  vault: CredentialVaultDocument;
}

function resolveActiveTabId(
  tabs: CredentialVaultTab[],
  currentActiveTabId: string,
  preferredTabId?: string
): string {
  if (preferredTabId && tabs.some(tab => tab.id === preferredTabId)) {
    return preferredTabId;
  }

  if (currentActiveTabId && tabs.some(tab => tab.id === currentActiveTabId)) {
    return currentActiveTabId;
  }

  return tabs[0]?.id ?? '';
}

async function fetchVaultSnapshot(): Promise<CredentialVaultDocument | null> {
  try {
    const response = await fetch('/api/credential-vault', { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = (await response.json()) as CredentialVaultResponse;
    if (!payload?.vault || !Array.isArray(payload.vault.tabs)) return null;
    return payload.vault;
  } catch {
    return null;
  }
}

export default function useCredentialVault() {
  const [tabs, setTabs] = useState<CredentialVaultTab[]>([]);
  const [activeTabId, setActiveTabIdState] = useState('');
  const tabsRef = useRef<CredentialVaultTab[]>([]);
  const activeTabIdRef = useRef('');

  const setActiveTabId = useCallback((tabId: string) => {
    setActiveTabIdState(tabId);
    activeTabIdRef.current = tabId;
  }, []);

  const applySnapshot = useCallback(
    (nextTabs: CredentialVaultTab[], preferredTabId?: string) => {
      tabsRef.current = nextTabs;
      setTabs(nextTabs);
      const nextActiveTabId = resolveActiveTabId(nextTabs, activeTabIdRef.current, preferredTabId);
      setActiveTabId(nextActiveTabId);
    },
    [setActiveTabId]
  );

  const mutateVault = useCallback(
    async (mutation: CredentialVaultMutation, preferredTabId?: string): Promise<void> => {
      try {
        const response = await fetch('/api/credential-vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mutation }),
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as CredentialVaultResponse;
        if (!payload?.vault || !Array.isArray(payload.vault.tabs)) {
          return;
        }
        applySnapshot(payload.vault.tabs, preferredTabId);
      } catch {
        // Ignore network errors. SSE or next user action can recover state.
      }
    },
    [applySnapshot]
  );

  useEffect(() => {
    fetchVaultSnapshot().then(vault => {
      if (!vault) return;
      applySnapshot(vault.tabs);
    });

    const onCredentialVaultUpdate = (event: Event) => {
      try {
        const detail = (event as CustomEvent<string>).detail;
        if (typeof detail !== 'string') return;
        const payload = JSON.parse(detail) as CredentialVaultResponse;
        if (!payload?.vault || !Array.isArray(payload.vault.tabs)) return;
        applySnapshot(payload.vault.tabs);
      } catch {
        // Ignore malformed payloads.
      }
    };

    window.addEventListener('credentialVaultUpdated', onCredentialVaultUpdate);

    return () => {
      window.removeEventListener('credentialVaultUpdated', onCredentialVaultUpdate);
    };
  }, [applySnapshot]);

  const addTab = useCallback(
    (name?: string) => {
      const previousIds = new Set(tabsRef.current.map(tab => tab.id));
      mutateVault({ type: 'tab.create', payload: { name } }).then(() => {
        const nextTab = tabsRef.current.find(tab => !previousIds.has(tab.id));
        if (nextTab) {
          setActiveTabId(nextTab.id);
        }
      });
    },
    [mutateVault, setActiveTabId]
  );

  const setActiveTab = useCallback(
    (tabId: string) => {
      if (!tabsRef.current.some(tab => tab.id === tabId)) return;
      setActiveTabId(tabId);
    },
    [setActiveTabId]
  );

  const renameTab = useCallback(
    (tabId: string, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      void mutateVault({
        type: 'tab.rename',
        payload: {
          tabId,
          name: trimmedName,
        },
      });
    },
    [mutateVault]
  );

  const deleteTab = useCallback(
    (tabId: string) => {
      const currentTabs = tabsRef.current;
      if (currentTabs.length <= 1) return;
      const deletedIndex = currentTabs.findIndex(tab => tab.id === tabId);
      if (deletedIndex === -1) return;

      const remainingTabs = currentTabs.filter(tab => tab.id !== tabId);
      const fallbackTab = remainingTabs[Math.max(0, deletedIndex - 1)] ?? remainingTabs[0];
      const preferredTabId =
        activeTabIdRef.current === tabId ? fallbackTab.id : activeTabIdRef.current;

      void mutateVault(
        {
          type: 'tab.delete',
          payload: {
            tabId,
          },
        },
        preferredTabId
      );
    },
    [mutateVault]
  );

  const addCredential = useCallback(
    (tabId: string, id?: string) => {
      void mutateVault({
        type: 'credential.create',
        payload: {
          tabId,
          credentialId: id,
        },
      });
    },
    [mutateVault]
  );

  const updateCredential = useCallback(
    (tabId: string, id: string, field: keyof Credential, value: unknown) => {
      void mutateVault({
        type: 'credential.update',
        payload: {
          tabId,
          credentialId: id,
          field,
          value: value as Credential[keyof Credential],
        },
      });
    },
    [mutateVault]
  );

  const deleteCredentials = useCallback(
    (tabId: string, ids: string[]) => {
      if (ids.length === 0) return;
      void mutateVault({
        type: 'credential.deleteMany',
        payload: {
          tabId,
          credentialIds: ids,
        },
      });
    },
    [mutateVault]
  );

  return {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    renameTab,
    deleteTab,
    addCredential,
    updateCredential,
    deleteCredentials,
  };
}
