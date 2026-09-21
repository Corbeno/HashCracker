import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

import type { HashJob, JobQueue } from '../src/utils/jobQueue';

const source = ts.transpileModule(readFileSync('src/utils/jobQueue.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

for (const path of ['submission', 'queued'] as const) {
  for (const updatedCount of [0, 1]) {
    test(`cached completion syncs credentials: ${path}, ${updatedCount} updates`, async () => {
      const results = [{ hash: 'ABC', password: '' }];
      const syncCalls: unknown[] = [];
      const events: unknown[] = [];
      const vault = { tabs: [] };
      const modules: Record<string, unknown> = {
        child_process: { exec() {} },
        util: { promisify: () => () => Promise.resolve() },
        './credentialVaultStore': {
          applyCrackedPasswordsToCredentialVault(type: number, entries: unknown) {
            syncCalls.push({ type, entries });
            return { vault, updatedCount };
          },
        },
        './hashNormalization': {
          normalizeHashForType: (_type: number, hash: string) => hash.toLowerCase(),
        },
        './hashUtils': {
          HashCracker: class {
            constructor() {
              throw new Error('Cached jobs must not start hashcat');
            }
          },
        },
        './hashVaultStore': {
          readHashVaultByType: () => [{ hash: 'abc', password: '' }],
        },
        './logger': { logger: { info() {} } },
        './miscUtils': {
          sendJobsToAll() {},
          sendEventToAll: (name: string, payload: unknown) => events.push({ name, payload }),
        },
      };
      const context = {
        exports: {} as { JobQueue: new () => JobQueue },
        global: {},
        require(name: string) {
          if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
          return modules[name];
        },
      };
      runInNewContext(source, context);
      const queue = new context.exports.JobQueue();
      const job = {
        id: 'cached-job',
        hashes: ['ABC'],
        type: { id: 1000 },
        mode: {},
        status: 'pending',
        startTime: new Date().toISOString(),
      } as HashJob;

      if (path === 'submission') {
        await expect(queue.addJob(job)).resolves.toEqual({ isQueued: false });
      } else {
        // Simulate a waiting job whose hashes became known before it starts.
        const internal = queue as unknown as {
          queue: HashJob[];
          processNextJob: () => void;
        };
        internal.queue.push(job);
        internal.processNextJob();
      }

      expect(syncCalls).toEqual([{ type: 1000, entries: results }]);
      expect(events).toEqual(
        updatedCount ? [{ name: 'credentialVaultUpdated', payload: { vault } }] : []
      );
      expect(job.status).toBe('completed');
      expect(job.results).toEqual(results);
      expect(job.endTime).toBeTruthy();
      expect(queue.getCurrentJob()).toBeNull();
      expect(queue.getJobs()).toEqual([job]);
    });
  }
}
