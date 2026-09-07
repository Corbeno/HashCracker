import crypto from 'crypto';

import { NextRequest } from 'next/server';

import config from '@/config/config';
import { logger } from '@/utils/logger';
import { sendEventToAll, SSEClient } from '@/utils/miscUtils';
import { getSystemInfo, initSystemInfoCache } from '@/utils/systemInfoCache';

function ensureEventInfrastructure(): void {
  if (!global.eventClients) {
    global.eventClients = new Set<SSEClient>();
  }

  if (!global.__systemInfoCache__?.updateIntervalId) {
    logger.info(
      `Initializing system info cache from events route with ${config.hashcat.statusTimer} second interval`
    );
    initSystemInfoCache(config.hashcat.statusTimer * 1000);
  }

  if (!global.systemInfoInterval) {
    global.systemInfoInterval = setInterval(async () => {
      if (global.eventClients.size === 0) return;

      try {
        const systemInfo = await getSystemInfo();
        sendEventToAll('systemInfo', { data: systemInfo });
      } catch (error) {
        logger.error('Error sending system info event:', error);
      }
    }, config.hashcat.statusTimer * 1000);
  }
}

export async function GET(_req: NextRequest) {
  ensureEventInfrastructure();
  // Store a reference to the client's controller that we can use in the cancel method
  let clientController: ReadableStreamDefaultController | null = null;
  let clientId: string | null = null;

  const customReadable = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      // Generate a unique ID for this client
      clientId = crypto.randomUUID();
      clientController = controller;

      // Add this client to our set
      global.eventClients.add({ controller, id: clientId });
      console.log(`Client ${clientId} connected. Total clients: ${global.eventClients.size}`);
    },
    cancel(reason) {
      if (!clientController || !clientId) return;

      // Find the specific client with this controller
      global.eventClients.forEach(client => {
        if (client.id === clientId) {
          global.eventClients.delete(client);
          console.log(
            `Client ${clientId} disconnected. Reason: ${reason}. Remaining: ${global.eventClients.size}`
          );
        }
      });

      // Reset references
      clientController = null;
      clientId = null;
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
