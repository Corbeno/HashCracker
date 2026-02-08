import { useState, useCallback, useEffect } from 'react';

import { Credential } from '@/types/credential';

const STORAGE_KEY = 'credentialVaultTabs';

interface CredentialVaultTab {
  id: string;
  name: string;
  credentials: Credential[];
}

interface CredentialVaultState {
  tabs: CredentialVaultTab[];
  activeTabId: string;
}

function makeSharedTab(credentials: Credential[] = []): CredentialVaultTab {
  return {
    id: crypto.randomUUID(),
    name: 'Shared',
    credentials,
  };
}

function isCredential(value: unknown): value is Credential {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.password === 'string' &&
    typeof candidate.hash === 'string' &&
    typeof candidate.team === 'string' &&
    typeof candidate.device === 'string' &&
    typeof candidate.shared === 'boolean'
  );
}

function sanitizeCredentials(value: unknown): Credential[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isCredential);
}

function isTab(value: unknown): value is CredentialVaultTab {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.credentials)
  );
}

function parseStoredState(raw: string): CredentialVaultState | null {
  const parsed = JSON.parse(raw) as Partial<CredentialVaultState>;
  const tabs = Array.isArray(parsed.tabs)
    ? parsed.tabs
        .filter(isTab)
        .map(tab => ({ ...tab, credentials: sanitizeCredentials(tab.credentials) }))
    : [];
  if (tabs.length === 0) return null;
  const activeTabId =
    typeof parsed.activeTabId === 'string' && tabs.some(tab => tab.id === parsed.activeTabId)
      ? parsed.activeTabId
      : tabs[0].id;
  return { tabs, activeTabId };
}

function loadState(): CredentialVaultState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsedState = parseStoredState(raw);
      if (parsedState) {
        return parsedState;
      }
    }

    const sharedTab = makeSharedTab();
    const migrated = {
      tabs: [sharedTab],
      activeTabId: sharedTab.id,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    const sharedTab = makeSharedTab();
    return {
      tabs: [sharedTab],
      activeTabId: sharedTab.id,
    };
  }
}

function saveState(state: CredentialVaultState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function useCredentialVault() {
  const [state, setState] = useState<CredentialVaultState>(loadState);

  const setAndSaveState = useCallback(
    (updater: (prev: CredentialVaultState) => CredentialVaultState) => {
      setState(prev => {
        const next = updater(prev);
        saveState(next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const nextState = parseStoredState(event.newValue);
        if (!nextState) return;
        setState(nextState);
      } catch {
        // Ignore invalid storage payloads.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addTab = useCallback(
    (name?: string) => {
      setAndSaveState(prev => {
        const trimmedName = name?.trim();
        const newTab = {
          id: crypto.randomUUID(),
          name: trimmedName && trimmedName.length > 0 ? trimmedName : `Tab ${prev.tabs.length + 1}`,
          credentials: [],
        };
        return {
          tabs: [...prev.tabs, newTab],
          activeTabId: newTab.id,
        };
      });
    },
    [setAndSaveState]
  );

  const setActiveTab = useCallback(
    (tabId: string) => {
      setAndSaveState(prev => {
        if (!prev.tabs.some(tab => tab.id === tabId)) return prev;
        if (prev.activeTabId === tabId) return prev;
        return { ...prev, activeTabId: tabId };
      });
    },
    [setAndSaveState]
  );

  const renameTab = useCallback(
    (tabId: string, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      setAndSaveState(prev => {
        const nextTabs = prev.tabs.map(tab =>
          tab.id === tabId
            ? {
                ...tab,
                name: trimmedName,
              }
            : tab
        );
        return {
          ...prev,
          tabs: nextTabs,
        };
      });
    },
    [setAndSaveState]
  );

  const deleteTab = useCallback(
    (tabId: string) => {
      setAndSaveState(prev => {
        if (prev.tabs.length <= 1) return prev;
        const deletedIndex = prev.tabs.findIndex(tab => tab.id === tabId);
        if (deletedIndex === -1) return prev;
        const nextTabs = prev.tabs.filter(tab => tab.id !== tabId);
        const fallbackTab = nextTabs[Math.max(0, deletedIndex - 1)] ?? nextTabs[0];
        const nextActiveTabId = prev.activeTabId === tabId ? fallbackTab.id : prev.activeTabId;
        return {
          tabs: nextTabs,
          activeTabId: nextActiveTabId,
        };
      });
    },
    [setAndSaveState]
  );

  const addCredential = useCallback(
    (tabId: string, id?: string) => {
      const blank: Credential = {
        id: id ?? crypto.randomUUID(),
        username: '',
        password: '',
        hash: '',
        team: '',
        device: '',
        shared: false,
      };
      setAndSaveState(prev => {
        const nextTabs = prev.tabs.map(tab =>
          tab.id === tabId ? { ...tab, credentials: [...tab.credentials, blank] } : tab
        );
        return { ...prev, tabs: nextTabs };
      });
    },
    [setAndSaveState]
  );

  const updateCredential = useCallback(
    (tabId: string, id: string, field: keyof Credential, value: unknown) => {
      setAndSaveState(prev => {
        const nextTabs = prev.tabs.map(tab => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            credentials: tab.credentials.map(c => (c.id === id ? { ...c, [field]: value } : c)),
          };
        });
        return { ...prev, tabs: nextTabs };
      });
    },
    [setAndSaveState]
  );

  const deleteCredentials = useCallback(
    (tabId: string, ids: string[]) => {
      const idSet = new Set(ids);
      setAndSaveState(prev => {
        const nextTabs = prev.tabs.map(tab => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            credentials: tab.credentials.filter(c => !idSet.has(c.id)),
          };
        });
        return { ...prev, tabs: nextTabs };
      });
    },
    [setAndSaveState]
  );

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    addTab,
    setActiveTab,
    renameTab,
    deleteTab,
    addCredential,
    updateCredential,
    deleteCredentials,
  };
}
