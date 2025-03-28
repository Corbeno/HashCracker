'use client';

import Image from 'next/image';

import Logo from '@/app/components/Logo';
import SystemInfoPanel from '@/app/components/SystemInfoPanel';

interface AppHeaderProps {
  connectedStatus: 'connected' | 'disconnected';
  liveViewingEnabled: boolean | null;
  toggleLiveViewing: () => void;
}

export default function AppHeader({
  connectedStatus,
  liveViewingEnabled,
  toggleLiveViewing,
}: AppHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Logo className="hover:opacity-80 transition-opacity" />
          <a
            href="https://github.com/Corbeno/HashCracker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:opacity-80 transition-opacity"
            title="View on GitHub"
          >
            <Image src="/icons/github.svg" alt="GitHub" width={24} height={24} />
          </a>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SystemInfoPanel />
        <div className="flex items-center space-x-2">
          {/* Connection status indicator */}
          <div
            className="h-2 w-2 rounded-full bg-current animate-pulse"
            style={{
              color: connectedStatus === 'connected' ? '#22c55e' : '#ef4444',
            }}
          />
          <span className="text-sm text-gray-400">{connectedStatus}</span>

          {/* Live Viewing Toggle - Icon based */}
          {liveViewingEnabled !== null && (
            <button
              onClick={toggleLiveViewing}
              className={`ml-3 p-1.5 rounded-md transition-colors ${
                liveViewingEnabled
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={
                liveViewingEnabled
                  ? 'Live updates enabled for the entire app'
                  : 'Live updates disabled for the entire app'
              }
            >
              {liveViewingEnabled ? (
                <Image
                  src="/icons/eye-open.svg"
                  alt="Live updates enabled"
                  width={20}
                  height={20}
                />
              ) : (
                <Image
                  src="/icons/eye-closed.svg"
                  alt="Live updates disabled"
                  width={20}
                  height={20}
                />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
