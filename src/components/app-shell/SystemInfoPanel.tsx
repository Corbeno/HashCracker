'use client';

import Image from 'next/image';

import { useConnection } from '@/contexts/ConnectionContext';

interface SystemInfoPanelProps {
  className?: string;
}

export default function SystemInfoPanel({ className = '' }: SystemInfoPanelProps) {
  const { systemInfo } = useConnection();

  // Format bytes to a human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={`${className} md:flex md:items-center md:space-x-4 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-0`}
    >
      {/* CPU Info - Blue */}
      <div className="flex items-center space-x-1" title={`CPU: ${systemInfo.cpuName}`}>
        <Image src="/icons/cpu.svg" alt="CPU" width={16} height={16} />
        <div className="w-16 bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full"
            style={{ width: `${Math.min(systemInfo.cpuUsage, 100)}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-400">{systemInfo.cpuUsage.toFixed(0)}%</span>
      </div>

      {/* RAM Info - Green */}
      <div
        className="flex items-center space-x-1"
        title={`RAM: ${formatBytes(systemInfo.ramUsed)} / ${formatBytes(systemInfo.ramTotal)}`}
      >
        <Image src="/icons/ram.svg" alt="RAM" width={16} height={16} />
        <div className="w-16 bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-green-600 h-1.5 rounded-full"
            style={{ width: `${Math.min(systemInfo.ramUsage, 100)}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-400">{systemInfo.ramUsage.toFixed(0)}%</span>
      </div>

      {/* GPU Info - Purple */}
      <div className="flex items-center space-x-1" title={`GPU: ${systemInfo.gpuName}`}>
        <Image src="/icons/gpu.svg" alt="GPU" width={16} height={16} />
        <div className="w-16 bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-purple-600 h-1.5 rounded-full"
            style={{ width: `${Math.min(systemInfo.gpuUsage, 100)}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-400">{systemInfo.gpuUsage.toFixed(0)}%</span>
      </div>
    </div>
  );
}
