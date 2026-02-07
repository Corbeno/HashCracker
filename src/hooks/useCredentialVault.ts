import { useState, useCallback } from 'react';

import { Credential } from '@/types/credential';

const STORAGE_KEY = 'credentialVault';

function loadCredentials(): Credential[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCredentials(credentials: Credential[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export default function useCredentialVault() {
  const [credentials, setCredentials] = useState<Credential[]>(loadCredentials);

  const addCredential = useCallback((id?: string) => {
    const blank: Credential = {
      id: id ?? crypto.randomUUID(),
      username: '',
      password: '',
      hash: '',
      team: '',
      device: '',
      shared: false,
    };
    setCredentials(prev => {
      const next = [...prev, blank];
      saveCredentials(next);
      return next;
    });
  }, []);

  const updateCredential = useCallback((id: string, field: keyof Credential, value: unknown) => {
    setCredentials(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, [field]: value } : c));
      saveCredentials(next);
      return next;
    });
  }, []);

  const deleteCredentials = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setCredentials(prev => {
      const next = prev.filter(c => !idSet.has(c.id));
      saveCredentials(next);
      return next;
    });
  }, []);

  return { credentials, addCredential, updateCredential, deleteCredentials };
}
