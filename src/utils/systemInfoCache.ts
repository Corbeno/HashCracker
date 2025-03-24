import si from 'systeminformation';

import { logger } from './logger';

// Define the system information interface
export interface SystemInfo {
  cpuName: string;
  cpuUsage: number;
  gpuName: string;
  gpuUsage: number;
  ramTotal: number;
  ramUsed: number;
  ramUsage: number;
}

// Create a namespace for our global variables
// This is more reliable than using the global object directly in Next.js
declare global {
  var __systemInfoCache__: {
    cachedSystemInfo: SystemInfo | null;
    updateIntervalId: NodeJS.Timeout | null;
  };
}

// Initialize the namespace if it doesn't exist
if (!global.__systemInfoCache__) {
  global.__systemInfoCache__ = {
    cachedSystemInfo: null,
    updateIntervalId: null,
  };
}

/**
 * Fetches the current system information
 */
async function fetchSystemInfo(): Promise<SystemInfo | null> {
  try {
    // Fetch all system information in parallel
    const [cpuData, currentLoad, memData, gpuData] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.graphics(),
    ]);

    // Check if we have valid data
    if (!cpuData || !currentLoad || !memData || !gpuData) {
      logger.warn('Missing system information data');
      return null;
    }

    // Find the first GPU that isn't integrated
    const primaryGpu = gpuData.controllers.find(
      gpu => !gpu.vendor.toLowerCase().includes('intel') || gpuData.controllers.length === 1
    );

    // Extract the relevant information
    const systemInfo: SystemInfo = {
      cpuName: cpuData.manufacturer ? `${cpuData.manufacturer} ${cpuData.brand}` : 'Unknown CPU',
      cpuUsage: Math.round(currentLoad.currentLoad || 0),
      gpuName: primaryGpu ? primaryGpu.model : 'Unknown GPU',
      gpuUsage: primaryGpu ? primaryGpu.utilizationGpu || 0 : 0,
      ramTotal: memData.total,
      ramUsed: memData.used,
      ramUsage: (memData.used / memData.total) * 100,
    };

    return systemInfo;
  } catch (error) {
    logger.error('Error fetching system information:', error);
    return null;
  }
}

/**
 * Updates the cached system information
 */
async function updateCachedSystemInfo(): Promise<void> {
  try {
    const freshInfo = await fetchSystemInfo();
    if (freshInfo) {
      global.__systemInfoCache__.cachedSystemInfo = freshInfo;
    }
  } catch (error) {
    logger.error('Error updating cached system info:', error);
  }
}

/**
 * Initializes the system information cache
 * @param updateInterval The interval in milliseconds to update the cache
 */
export function initSystemInfoCache(updateInterval: number): void {
  // Only initialize once
  if (global.__systemInfoCache__?.updateIntervalId) {
    return;
  }

  logger.info(`Initializing system info cache with ${updateInterval}ms interval`);

  // Make sure the namespace is initialized
  if (!global.__systemInfoCache__) {
    global.__systemInfoCache__ = {
      cachedSystemInfo: null,
      updateIntervalId: null,
    };
  }

  // Update the cache immediately
  fetchSystemInfo()
    .then(initialInfo => {
      if (initialInfo) {
        global.__systemInfoCache__.cachedSystemInfo = initialInfo;
      }
    })
    .catch(error => {
      logger.error('Error during initial system info fetch:', error);
    });

  // Set up the interval to update the cache
  global.__systemInfoCache__.updateIntervalId = setInterval(updateCachedSystemInfo, updateInterval);
}

const emptySystemInfo = {
  cpuName: 'Unknown CPU',
  cpuUsage: 0,
  gpuName: 'Unknown GPU',
  gpuUsage: 0,
  ramTotal: 0,
  ramUsed: 0,
  ramUsage: 0,
};

/**
 * Gets the current cached system information
 * If the cache is not initialized, it will return empty data
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  // Make sure the namespace is initialized
  if (!global.__systemInfoCache__) {
    global.__systemInfoCache__ = {
      cachedSystemInfo: null,
      updateIntervalId: null,
    };
  }

  // If we have cached data, return it
  if (global.__systemInfoCache__.cachedSystemInfo) {
    return global.__systemInfoCache__.cachedSystemInfo;
  }

  // If no cache, try to fetch fresh data
  try {
    const freshData = await fetchSystemInfo();
    if (freshData) {
      global.__systemInfoCache__.cachedSystemInfo = freshData;
      return freshData;
    }
  } catch (error) {
    logger.error('Error fetching fresh system info:', error);
  }

  // Return empty data if all else fails
  return emptySystemInfo;
}

/**
 * Stops the system information cache update interval
 */
export function stopSystemInfoCache(): void {
  if (global.__systemInfoCache__?.updateIntervalId) {
    clearInterval(global.__systemInfoCache__.updateIntervalId);
    global.__systemInfoCache__.updateIntervalId = null;
    logger.info('System info cache updates stopped');
  }
}
