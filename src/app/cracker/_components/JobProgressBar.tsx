'use client';

import React from 'react';

interface JobProgressBarProps {
  progress: [number, number]; // [current, total]
  estimatedStopTime?: number; // Unix timestamp
}

export default function JobProgressBar({ progress, estimatedStopTime }: JobProgressBarProps) {
  const progressPercentage = Math.min((progress[0] / progress[1]) * 100, 100);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    let timeString = '';
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
    timeString += `${remainingSeconds}s`;

    return timeString;
  };

  return (
    <>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-transparent">
        <div
          className="h-full bg-blue-600"
          style={{
            width: `${progressPercentage}%`,
          }}
        ></div>
      </div>
      <div className="absolute bottom-1 right-3 text-xs text-blue-400">
        {progressPercentage.toFixed(1)}%
        {estimatedStopTime && (
          <span className="ml-1">
            ({formatTimeRemaining(estimatedStopTime - Math.floor(Date.now() / 1000))})
          </span>
        )}
      </div>
    </>
  );
}
