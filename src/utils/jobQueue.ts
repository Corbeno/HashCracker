import { exec } from 'child_process';
import { promisify } from 'util';

import { HashcatStatusJson, HashCracker, HashResult } from './hashUtils';
import { logger } from './logger';
import { sendJobsToAll } from './miscUtils';

import { HashcatMode } from '@/config/config';
import { HashType } from '@/config/hashTypes';

const execAsync = promisify(exec);

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'queued'
  | 'cancelled'
  | 'exhausted';

export interface DebugInfo {
  command: string;
  output: string[];
  error: string | string[];
  statusJson?: HashcatStatusJson;
}

export interface HashJob {
  id: string;
  hashes: string[];
  type: HashType;
  mode: HashcatMode;
  status: JobStatus;
  startTime: string;
  endTime?: string;
  results?: HashResult[];
  debugInfo?: DebugInfo;
  isCaseSensitive?: boolean; // Whether the hash type is case-sensitive
}

// Declare the global variable for Next.js hot reloading
declare global {
  var _jobQueueInstance: JobQueue | undefined;
}

export class JobQueue {
  private queue: HashJob[] = [];
  private queueHistory: HashJob[] = [];
  private isProcessing: boolean = false;
  private currentJob: HashJob | null = null;
  private maxHistorySize: number = 50; // Limit history to 50 jobs

  async addJob(job: HashJob) {
    if (this.isProcessing) {
      this.queue.push(job);
      sendJobsToAll();
      return { isQueued: true };
    }

    this.isProcessing = true;
    this.currentJob = job;
    job.status = 'running';
    sendJobsToAll();
    this.startJob(job);
    return { isQueued: false };
  }

  getCurrentJob(): HashJob | null {
    return this.currentJob;
  }

  getJobs(): HashJob[] {
    // Return current job, queued jobs, and job history
    const allJobs = [...this.queue];
    if (this.currentJob) {
      allJobs.unshift(this.currentJob);
    }
    // Add history jobs at the end
    return [...allJobs, ...this.queueHistory].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  async cancelCurrentJob(): Promise<boolean> {
    if (this.currentJob) {
      try {
        await this.killAnyHashcat();
        this.currentJob.status = 'cancelled';
        this.currentJob.endTime = new Date().toISOString();

        // Add to history
        this.addToHistory(this.currentJob);
      } catch (error) {
        console.error('Error cancelling job:', error);
      }
      this.isProcessing = false;
      this.currentJob = null;

      this.processNextJob();
      sendJobsToAll();
      return true;
    }
    return false;
  }

  private async killAnyHashcat(): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM hashcat.exe /T');
      } else {
        await execAsync('pkill -f hashcat');
      }
    } catch (_error) {
      // Ignore errors if no processes were found
    }
  }

  private completeCurrentJob() {
    if (this.currentJob) {
      this.currentJob.endTime = new Date().toISOString();

      // Add to history
      this.addToHistory(this.currentJob);

      this.isProcessing = false;
      this.currentJob = null;
      this.processNextJob();
    }
  }

  private failCurrentJob(error: any) {
    if (this.currentJob) {
      this.currentJob.endTime = new Date().toISOString();

      // Add to history
      this.addToHistory(this.currentJob);
    }
    this.isProcessing = false;
    this.currentJob = null;
    this.processNextJob();
  }

  private async startJob(job: HashJob) {
    // Kill any existing hashcat processes
    await this.killAnyHashcat();
    await new Promise(resolve => setTimeout(resolve, 500));

    const hashCracker = new HashCracker();

    hashCracker.on('debug', debugInfo => {
      job.debugInfo = debugInfo;
      sendJobsToAll();
    });

    hashCracker
      .execute(job.hashes, job.type, job.mode)
      .then(result => {
        // A lot of time can pass here, so we need to check if the job was cancelled
        if (this.currentJob?.id !== job.id) {
          logger.debug("Current job doesn't match job id when finished!");
          return;
        }

        job.status = result.status;
        job.results = result.results;
        job.debugInfo = result.debugInfo;

        this.completeCurrentJob();
        sendJobsToAll();
      })
      .catch(error => {
        job.status = 'failed';
        job.results = job.hashes.map(hash => ({ hash, password: null }));
        this.failCurrentJob(error.message);
        sendJobsToAll();
      });
  }

  // Helper method to add a job to history with size limit
  private addToHistory(job: HashJob) {
    // Set end time if not already set
    if (!job.endTime) {
      job.endTime = new Date().toISOString();
    }

    // Add to history
    this.queueHistory.push(job);

    // Limit history size
    if (this.queueHistory.length > this.maxHistorySize) {
      this.queueHistory = this.queueHistory.slice(-this.maxHistorySize);
    }
  }

  private processNextJob() {
    if (this.queue.length > 0 && !this.isProcessing) {
      const nextJob = this.queue.shift();
      if (nextJob) {
        this.isProcessing = true;
        this.currentJob = nextJob;
        nextJob.status = 'running';
        this.startJob(nextJob);
      }
    }
  }
}

// Create or get the singleton instance
const getJobQueue = (): JobQueue => {
  if (!global._jobQueueInstance) {
    global._jobQueueInstance = new JobQueue();
  }
  return global._jobQueueInstance;
};

// Export the singleton instance
export const jobQueue = getJobQueue();
