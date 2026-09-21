import { expect, test } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ensureDirectory, ensureDirectorySync } from '@/utils/directoryUtils';

const context = { caller: 'test.directory', source: 'HASHES_DIR' };

for (const directory of ['', ' \t ']) {
  for (const asynchronous of [false, true]) {
    test(`rejects ${JSON.stringify(directory)} (${asynchronous ? 'async' : 'sync'}) with diagnostics`, async () => {
      const messages: unknown[][] = [];
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        messages.push(args);
      };
      try {
        if (asynchronous) {
          await expect(ensureDirectory(directory, context)).rejects.toThrow('HASHES_DIR');
        } else {
          expect(() => ensureDirectorySync(directory, context)).toThrow('HASHES_DIR');
        }
        expect(messages).toHaveLength(1);
        expect(messages[0][1]).toMatchObject({
          ...context,
          directory,
          cwd: process.cwd(),
          message: expect.stringContaining('empty or whitespace-only path'),
          stack: expect.stringContaining('directory-utils.spec.ts'),
        });
      } finally {
        console.error = originalError;
      }
    });
  }
}

test('creates nested directories and accepts existing directories in both modes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-utils-'));
  try {
    const syncPath = path.join(root, 'sync', 'nested');
    const asyncPath = path.join(root, 'async', 'nested');
    ensureDirectorySync(syncPath, context);
    ensureDirectorySync(syncPath, context);
    await ensureDirectory(asyncPath, context);
    await ensureDirectory(asyncPath, context);
    expect(fs.statSync(syncPath).isDirectory()).toBe(true);
    expect(fs.statSync(asyncPath).isDirectory()).toBe(true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
