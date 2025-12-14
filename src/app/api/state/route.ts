import { NextRequest, NextResponse } from 'next/server';

import config from '@/config/config';
import { readCrackedHashes, readPotfile } from '@/utils/hashUtils';
import { jobQueue } from '@/utils/jobQueue';
import { logger } from '@/utils/logger';
import { getSystemInfo, initSystemInfoCache } from '@/utils/systemInfoCache';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

// Initialize the system info cache
// This will start updating the cache as soon as the server starts
// Only initialize if not already done
if (!global.__systemInfoCache__?.updateIntervalId) {
  logger.info(`Initializing system info cache with ${config.hashcat.statusTimer} second interval`);
  initSystemInfoCache(config.hashcat.statusTimer * 1000);
}

export async function GET(_req: NextRequest) {
  try {
    // Run all data fetching operations in parallel
    const [jobs, crackedHashes, potfileContent, systemInfo] = await Promise.all([
      // 1. Get job history
      Promise.resolve(
        Array.from(jobQueue.getJobs()).map(job => ({
          ...job,
          startTime: job.startTime,
          endTime: job.endTime,
        }))
      ),

      // 2. Get cracked hashes
      Promise.resolve(readCrackedHashes()),

      // 3. Get potfile content
      readPotfile(),

      // 4. Get system info from cache
      getSystemInfo(),
    ]);

    // Combine all data into a single response
    const state = {
      jobs,
      crackedHashes,
      potfileContent,
      systemInfo,
    };

    return NextResponse.json(state);
  } catch (error) {
    logger.error('Error in state endpoint:', error);
    return NextResponse.json({ error: 'Failed to retrieve application state' }, { status: 500 });
  }
}
