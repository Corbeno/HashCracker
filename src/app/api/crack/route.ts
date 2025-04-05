import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import config from '@/config';
import { isHashTypeCaseSensitive } from '@/config/hashTypes';
import { HashJob, jobQueue } from '@/utils/jobQueue';
import { logger } from '@/utils/logger';

export interface CrackRequest {
  hashes: string[];
  type: number;
  mode: string;
}

export async function POST(req: NextRequest) {
  try {
    const { hashes, type, mode } = (await req.json()) as CrackRequest;

    if (!hashes || hashes.length === 0) {
      return NextResponse.json({ error: 'No hashes provided' }, { status: 400 });
    }

    if (type === undefined) {
      return NextResponse.json({ error: 'Hash type is required' }, { status: 400 });
    }

    const hashType = config.hashcat.hashTypes[type];
    const attackMode = config.hashcat.attackModes[mode];

    if (!hashType) {
      return NextResponse.json({ error: 'Invalid hash type' }, { status: 400 });
    }

    if (!attackMode) {
      return NextResponse.json({ error: 'Invalid attack mode' }, { status: 400 });
    }

    // Create a new job
    const job: HashJob = {
      id: crypto.randomUUID(),
      hashes: hashes,
      type: hashType,
      mode: attackMode,
      status: 'pending',
      startTime: new Date().toISOString(),
      results: [],
      isCaseSensitive: isHashTypeCaseSensitive(hashType)
    };

    // Add job to queue
    const { isQueued } = await jobQueue.addJob(job);

    return NextResponse.json({
      message: 'Hash cracking job added to queue',
      jobId: job.id,
      isQueued,
    });
  } catch (error) {
    console.error('Error in crack API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const activeJob = jobQueue.getCurrentJob();
    if (activeJob && activeJob.id === jobId) {
      // Cancel the currently running job
      const success = await jobQueue.cancelCurrentJob();
      if (success) {
        return NextResponse.json({ success, message: 'Job cancelled' });
      } else {
        return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
      }
    } else {
      // Check if this is a queued job and cancel it
      const success = jobQueue.cancelQueuedJob(jobId);
      if (success) {
        return NextResponse.json({ success, message: 'Queued job cancelled' });
      } else {
        return NextResponse.json({ error: 'Job not found or already completed' }, { status: 404 });
      }
    }
  } catch (error) {
    logger.error('Error cancelling job:', error);
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
  }
}
