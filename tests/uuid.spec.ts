import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/utils/uuid.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadUUID(globals: Record<string, unknown>) {
  const context = { exports: {} as { generateUUID: () => string }, ...globals };
  runInNewContext(source, context);
  return context.exports.generateUUID;
}

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('UUID uses native randomUUID with the correct receiver', () => {
  const crypto = {
    randomUUID() {
      expect(this).toBe(crypto);
      return '12345678-1234-4234-8234-123456789abc';
    },
  };
  expect(loadUUID({ crypto })()).toBe('12345678-1234-4234-8234-123456789abc');
});

test('UUID uses getRandomValues when randomUUID is unavailable over HTTP', () => {
  const crypto = {
    getRandomValues(bytes: Uint8Array) {
      expect(this).toBe(crypto);
      expect(bytes.length).toBe(16);
      return bytes.fill(255);
    },
  };
  expect(loadUUID({ crypto })()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
});

for (const [name, globals] of Object.entries({
  'absent crypto': {},
  'undefined crypto': { crypto: undefined },
  'missing methods': { crypto: {} },
})) {
  test(`UUID handles ${name}`, () => {
    const generateUUID = loadUUID(globals);
    const ids = Array.from({ length: 1000 }, () => generateUUID());
    for (const id of ids) expect(id).toMatch(uuidV4);
    expect(new Set(ids).size).toBe(ids.length);
  });
}
