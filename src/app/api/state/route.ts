import { NextRequest, NextResponse } from 'next/server';

import config from '@/config/config';
import { readHashVault } from '@/utils/hashVaultStore';
import { jobQueue } from '@/utils/jobQueue';
import { logger } from '@/utils/logger';
import { getSystemInfo, initSystemInfoCache } from '@/utils/systemInfoCache';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

export async function GET(_req: NextRequest) {
  try {
    if (!global.__systemInfoCache__?.updateIntervalId) {
      logger.info(
        `Initializing system info cache with ${config.hashcat.statusTimer} second interval`
      );
      initSystemInfoCache(config.hashcat.statusTimer * 1000);
    }

    // Run all data fetching operations in parallel
    const [jobs, crackedHashes, systemInfo] = await Promise.all([
      // 1. Get job history
      Promise.resolve(
        Array.from(jobQueue.getJobs()).map(job => ({
          ...job,
          startTime: job.startTime,
          endTime: job.endTime,
        }))
      ),

      // 2. Get cracked hashes
      Promise.resolve(readHashVault()),

      // 3. Get system info from cache
      getSystemInfo(),
    ]);

    // Combine all data into a single response
    const state = {
      jobs,
      crackedHashes,
      systemInfo,
    };

    return NextResponse.json(state);
  } catch (error) {
    logger.error('Error in state endpoint:', error);
    return NextResponse.json({ error: 'Failed to retrieve application state' }, { status: 500 });
  }
}
