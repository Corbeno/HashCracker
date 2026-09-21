import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

import type { showToast, ToastMessage } from '../src/utils/toast';

const source = ts.transpileModule(readFileSync('src/utils/toast.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadToast(window?: { dispatchEvent: (event: CustomEvent<ToastMessage>) => boolean }) {
  const context = { exports: {} as { showToast: typeof showToast }, window, CustomEvent };
  runInNewContext(source, context);
  return context.exports.showToast;
}

test('toast dispatches defaults and custom options', () => {
  const events: CustomEvent<ToastMessage>[] = [];
  const show = loadToast({
    dispatchEvent: event => {
      events.push(event);
      return true;
    },
  });
  show('Hello');
  show('Saved', { type: 'success', duration: 2000 });
  expect(events.map(event => ({ type: event.type, detail: event.detail }))).toEqual([
    { type: 'app:toast', detail: { message: 'Hello', type: 'info', duration: 1000 } },
    { type: 'app:toast', detail: { message: 'Saved', type: 'success', duration: 2000 } },
  ]);
});

test('toast is safe outside the browser', () => {
  expect(() => loadToast()('Hello')).not.toThrow();
});
