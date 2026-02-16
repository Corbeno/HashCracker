'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { HashVaultEntry } from '@/types/hashVault';
import { Job } from '@/types/job';
import { EMPTY_SYSTEM_INFO, SystemInfo } from '@/types/systemInfo';

type ConnectionStatus = 'connected' | 'disconnected';

export interface ConnectionContextValue {
  connectedStatus: ConnectionStatus;
  jobs: Job[];
  crackedHashes: HashVaultEntry[];
  potfileContent: string;
  systemInfo: SystemInfo;
  fetchInitialState: () => Promise<void>;
  toggleLiveViewing: () => void;
  liveViewingEnabled: boolean;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connectedStatus, setConnectedStatus] = useState<ConnectionStatus>('disconnected');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crackedHashes, setCrackedHashes] = useState<HashVaultEntry[]>([]);
  const [potfileContent, setPotfileContent] = useState('');
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(EMPTY_SYSTEM_INFO);
  const [liveViewingEnabled, setLiveViewingEnabled] = useState(true);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (!reconnectTimeoutRef.current) return;
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }, []);

  const closeEventSource = useCallback((markDisconnected = true) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (markDisconnected) {
      setConnectedStatus('disconnected');
    }
  }, []);

  const fetchInitialState = useCallback(async () => {
    try {
      const response = await fetch('/api/state');

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const state = await response.json();

      if (state.jobs) {
        setJobs(state.jobs);
      }

      if (state.crackedHashes) {
        setCrackedHashes(state.crackedHashes);
      }

      if (state.potfileContent !== undefined) {
        setPotfileContent(String(state.potfileContent ?? ''));
      }

      if (state.systemInfo) {
        setSystemInfo(state.systemInfo as SystemInfo);
      }
    } catch (error) {
      console.error('Error fetching initial state:', error);
    }
  }, []);

  const initEventSource = useCallback(() => {
    if (eventSourceRef.current || !liveViewingEnabled) {
      return;
    }

    try {
      const eventSource = new EventSource('/api/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = _e => {
        setConnectedStatus('connected');
      };

      eventSource.onerror = error => {
        console.error('EventSource error:', error);
        closeEventSource();

        if (!liveViewingEnabled) {
          return;
        }

        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          initEventSource();
          void fetchInitialState();
        }, 3000);
      };

      eventSource.addEventListener('jobUpdate', e => {
        try {
          const data = JSON.parse(e.data);
          setJobs(data.jobs);
        } catch (error) {
          console.error('Error parsing jobUpdate event data:', error);
        }
      });

      eventSource.addEventListener('crackedHashes', e => {
        try {
          const data = JSON.parse(e.data);
          setCrackedHashes(data.hashes);
        } catch (error) {
          console.error('Error parsing crackedHashes event data:', error);
        }
      });

      eventSource.addEventListener('potfileUpdate', e => {
        try {
          const data = JSON.parse(e.data);
          if (data.content !== undefined) {
            setPotfileContent(String(data.content ?? ''));
          }
        } catch (error) {
          console.error('Error parsing potfileUpdate event data:', error);
        }
      });

      eventSource.addEventListener('systemInfo', e => {
        try {
          const data = JSON.parse(e.data) as { data?: SystemInfo };
          if (data?.data) {
            setSystemInfo(data.data);
          }
        } catch (error) {
          console.error('Error parsing systemInfo event data:', error);
        }
      });

      eventSource.addEventListener('credentialVaultUpdated', e => {
        try {
          const credentialVaultEvent = new CustomEvent('credentialVaultUpdated', {
            detail: e.data,
          });
          window.dispatchEvent(credentialVaultEvent);
        } catch (error) {
          console.error('Error handling credentialVaultUpdated event:', error);
        }
      });
    } catch (error) {
      console.error('Error initializing event source:', error);
      setConnectedStatus('disconnected');
    }
  }, [clearReconnectTimeout, closeEventSource, fetchInitialState, liveViewingEnabled]);

  useEffect(() => {
    if (!liveViewingEnabled) {
      clearReconnectTimeout();
      closeEventSource();
      void fetchInitialState();
      return;
    }

    initEventSource();
    void fetchInitialState();
  }, [
    clearReconnectTimeout,
    closeEventSource,
    fetchInitialState,
    initEventSource,
    liveViewingEnabled,
  ]);

  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      closeEventSource();
    };
  }, [clearReconnectTimeout, closeEventSource]);

  const toggleLiveViewing = useCallback(() => {
    setLiveViewingEnabled(current => !current);
  }, []);

  const value = useMemo<ConnectionContextValue>(
    () => ({
      connectedStatus,
      jobs,
      crackedHashes,
      potfileContent,
      systemInfo,
      fetchInitialState,
      toggleLiveViewing,
      liveViewingEnabled,
    }),
    [
      connectedStatus,
      crackedHashes,
      fetchInitialState,
      jobs,
      liveViewingEnabled,
      potfileContent,
      systemInfo,
      toggleLiveViewing,
    ]
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionContextValue {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
