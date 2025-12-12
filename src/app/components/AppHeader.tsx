'use client';

import Image from 'next/image';
import { useState } from 'react';

import Logo from '@/app/components/Logo';
import SystemInfoPanel from '@/app/components/SystemInfoPanel';

// SVG Icon Components
function MenuOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MenuClosedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function EyeOpenIcon() {
  return <Image src="/icons/eye-open.svg" alt="Live updates enabled" width={20} height={20} />;
}

function EyeClosedIcon() {
  return <Image src="/icons/eye-closed.svg" alt="Live updates disabled" width={20} height={20} />;
}

function GitHubIcon({ width = 24, height = 24 }) {
  return <Image src="/icons/github.svg" alt="GitHub" width={width} height={height} />;
}

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mb-8">
      {/* Desktop view */}
      <div className="hidden md:flex justify-between items-center">
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
              <GitHubIcon />
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
                {liveViewingEnabled ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex justify-between items-center">
          <Logo className="hover:opacity-80 transition-opacity" />

          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div
              className="h-2 w-2 rounded-full bg-current animate-pulse"
              style={{
                color: connectedStatus === 'connected' ? '#22c55e' : '#ef4444',
              }}
            />
            <span className="text-sm text-gray-400 mr-2">{connectedStatus}</span>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md bg-gray-800 hover:bg-gray-700"
            >
              {menuOpen ? <MenuOpenIcon /> : <MenuClosedIcon />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mt-4 p-4 bg-gray-900 rounded-md shadow-lg border border-gray-800">
            <div className="flex flex-col gap-4">
              <SystemInfoPanel className="w-full" />
              <div className="flex items-center">
                <a
                  href="https://github.com/Corbeno/HashCracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:opacity-80 transition-opacity"
                  title="View on GitHub"
                >
                  <GitHubIcon />
                  <span className="ml-2">GitHub</span>
                </a>
              </div>

              {liveViewingEnabled !== null && (
                <div className="flex items-center">
                  <button onClick={toggleLiveViewing} className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-md transition-colors ${
                        liveViewingEnabled ? 'bg-blue-500' : 'bg-gray-800'
                      }`}
                    >
                      {liveViewingEnabled ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </div>
                    <span>{liveViewingEnabled ? 'Live Updates: On' : 'Live Updates: Off'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
