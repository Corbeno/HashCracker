import { useState, useEffect, useRef } from 'react';

import { Job } from '@/types/job';
import { CrackedHash } from '@/utils/hashUtils';

type ConnectionStatus = 'connected' | 'disconnected';

interface UseConnectionResult {
  connectedStatus: ConnectionStatus;
  jobs: Job[];
  crackedHashes: CrackedHash[];
  potfileContent: string;
  fetchInitialState: () => Promise<void>;
  toggleLiveViewing: () => void;
  liveViewingEnabled: boolean | null;
}

export default function useConnection(): UseConnectionResult {
  const [connectedStatus, setConnectedStatus] = useState<ConnectionStatus>('disconnected');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crackedHashes, setCrackedHashes] = useState<CrackedHash[]>([]);
  const [potfileContent, setPotfileContent] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const [liveViewingEnabled, setLiveViewingEnabled] = useState<boolean | null>(null);

  // Load disable live viewing setting from localStorage on initial render
  useEffect(() => {
    const savedSetting = localStorage.getItem('enableLiveViewing');
    if (savedSetting !== null) {
      setLiveViewingEnabled(savedSetting === 'true');
    } else {
      // Defaults to true if unset
      setLiveViewingEnabled(true);
    }
  }, []);

  // Save disable live viewing setting to localStorage when it changes
  useEffect(() => {
    if (liveViewingEnabled === null) {
      return;
    }
    localStorage.setItem('enableLiveViewing', liveViewingEnabled.toString());
  }, [liveViewingEnabled]);

  const handleToggleLiveViewing = () => {
    if (liveViewingEnabled !== null) {
      setLiveViewingEnabled(!liveViewingEnabled);
    }
  };

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnectedStatus('disconnected');
      console.log('EventSource closed');
    }
  };

  const fetchInitialState = async () => {
    try {
      const response = await fetch('/api/state');

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const state = await response.json();

      // Update all state at once
      if (state.jobs) {
        setJobs(state.jobs);
      }

      if (state.crackedHashes) {
        setCrackedHashes(state.crackedHashes);
      }

      if (state.potfileContent) {
        setPotfileContent(state.potfileContent);
      }

      if (state.systemInfo) {
        // Dispatch system info event for the SystemInfoPanel component
        const systemInfoEvent = new CustomEvent('systemInfo', {
          detail: { data: JSON.stringify({ data: state.systemInfo }) },
        });
        window.dispatchEvent(systemInfoEvent);
      }
    } catch (error) {
      console.error('Error fetching initial state:', error);
      // If initial state fetch fails, we'll rely on the event source
    }
  };

  useEffect(() => {
    if (liveViewingEnabled === false) {
      fetchInitialState();
    }
  }, [liveViewingEnabled]);

  useEffect(() => {
    const initEventSource = async () => {
      try {
        // Clean up any existing EventSource connection
        closeEventSource();

        // Initialize the EventSource connection
        const eventSource = new EventSource('/api/events');
        eventSourceRef.current = eventSource;

        eventSource.onopen = _e => {
          console.log('Connected to event source');
          setConnectedStatus('connected');
        };

        eventSource.onerror = error => {
          console.error('EventSource error:', error);
          setConnectedStatus('disconnected');

          // Try to reconnect after a delay
          setTimeout(() => {
            closeEventSource();
            initEventSource();
            fetchInitialState();
          }, 3000);
        };

        // Handle job history event
        eventSource.addEventListener('jobUpdate', e => {
          try {
            const data = JSON.parse(e.data);
            setJobs(data.jobs);
          } catch (error) {
            console.error('Error parsing jobUpdate event data:', error);
          }
        });

        // Handle cracked hashes event
        eventSource.addEventListener('crackedHashes', e => {
          try {
            const data = JSON.parse(e.data);
            setCrackedHashes(data.hashes);
          } catch (error) {
            console.error('Error parsing crackedHashes event data:', error);
          }
        });

        // Handle potfile updates
        eventSource.addEventListener('potfileUpdate', e => {
          try {
            const data = JSON.parse(e.data);
            if (data.content !== undefined) {
              setPotfileContent(data.content);
            }
          } catch (error) {
            console.error('Error parsing potfileUpdate event data:', error);
          }
        });

        // Handle system info updates
        eventSource.addEventListener('systemInfo', e => {
          try {
            // Dispatch a custom event that the SystemInfoPanel can listen to
            const systemInfoEvent = new CustomEvent('systemInfo', {
              detail: e,
            });
            window.dispatchEvent(systemInfoEvent);
          } catch (error) {
            console.error('Error handling system info event:', error);
          }
        });

        // Handle team summaries updates
        eventSource.addEventListener('teamSummariesUpdate', e => {
          try {
            const data = JSON.parse(e.data);
            const summariesEvent = new CustomEvent('teamSummariesUpdate', {
              detail: data,
            });
            window.dispatchEvent(summariesEvent);
          } catch (error) {
            console.error('Error parsing teamSummariesUpdate event data:', error);
          }
        });

        // Handle individual team vault updates
        eventSource.addEventListener('teamVaultUpdate', e => {
          try {
            const data = JSON.parse(e.data);
            const vaultEvent = new CustomEvent('teamVaultUpdate', {
              detail: data,
            });
            window.dispatchEvent(vaultEvent);
          } catch (error) {
            console.error('Error parsing teamVaultUpdate event data:', error);
          }
        });

        // Handle team deletion events
        eventSource.addEventListener('teamVaultDeleted', e => {
          try {
            const data = JSON.parse(e.data);
            const deletedEvent = new CustomEvent('teamVaultDeleted', {
              detail: data,
            });
            window.dispatchEvent(deletedEvent);
          } catch (error) {
            console.error('Error parsing teamVaultDeleted event data:', error);
          }
        });

        // Handle credential created events
        eventSource.addEventListener('credentialCreated', e => {
          try {
            const data = JSON.parse(e.data);
            const credentialEvent = new CustomEvent('credentialCreated', {
              detail: data,
            });
            window.dispatchEvent(credentialEvent);
          } catch (error) {
            console.error('Error parsing credentialCreated event data:', error);
          }
        });

        // Handle credential updated events
        eventSource.addEventListener('credentialUpdated', e => {
          try {
            const data = JSON.parse(e.data);
            const credentialEvent = new CustomEvent('credentialUpdated', {
              detail: data,
            });
            window.dispatchEvent(credentialEvent);
          } catch (error) {
            console.error('Error parsing credentialUpdated event data:', error);
          }
        });

        // Handle credential deleted events
        eventSource.addEventListener('credentialDeleted', e => {
          try {
            const data = JSON.parse(e.data);
            const credentialEvent = new CustomEvent('credentialDeleted', {
              detail: data,
            });
            window.dispatchEvent(credentialEvent);
          } catch (error) {
            console.error('Error parsing credentialDeleted event data:', error);
          }
        });

        // Handle shared credential updated events
        eventSource.addEventListener('sharedCredentialUpdated', e => {
          try {
            const data = JSON.parse(e.data);
            const credentialEvent = new CustomEvent('sharedCredentialUpdated', {
              detail: data,
            });
            window.dispatchEvent(credentialEvent);
          } catch (error) {
            console.error('Error parsing sharedCredentialUpdated event data:', error);
          }
        });
      } catch (error) {
        console.error('Error initializing event source:', error);
        setConnectedStatus('disconnected');
      }
    };

    if (liveViewingEnabled && eventSourceRef.current === null) {
      // Note: These are async but can run concurrently
      initEventSource();
      fetchInitialState();
    }

    return () => {
      closeEventSource();
    };
  }, [liveViewingEnabled]);

  return {
    connectedStatus,
    jobs,
    crackedHashes,
    potfileContent,
    fetchInitialState,
    liveViewingEnabled,
    toggleLiveViewing: handleToggleLiveViewing,
  };
}
