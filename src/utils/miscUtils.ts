import fs from 'fs';

import { jobQueue } from './jobQueue';
import { logger } from './logger';

// Define the client type for better type safety
export interface SSEClient {
  controller: ReadableStreamDefaultController;
  id: string;
}

// Initialize global variables with proper types
declare global {
  var eventClients: Set<SSEClient>;
  var systemInfoInterval: NodeJS.Timeout | undefined;
  var fileWatcher: fs.FSWatcher | undefined;
}

export function sendEventToAll(event: string, data: any) {
  global.eventClients.forEach((client: SSEClient) => {
    try {
      client.controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error(`Error sending event to client ${client.id}:`, error);
    }
  });
}

// Manual job update function since we don't have event emitters in jobQueue
export function sendJobsToAll() {
  const jobs = Array.from(jobQueue.getJobs()).map(job => ({
    ...job,
    startTime: job.startTime,
    endTime: job.endTime,
  }));
  sendEventToAll('jobUpdate', { jobs });
}
