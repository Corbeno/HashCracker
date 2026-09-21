import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

// Execute the helper with isolated browser globals for each test.
const source = ts.transpileModule(readFileSync('src/utils/clipboard.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const toastSource = ts.transpileModule(readFileSync('src/utils/toast.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

for (const mode of ['modern', 'missing', 'rejected', 'failed', 'throws'] as const) {
  test(`clipboard: ${mode}`, async () => {
    const text = 'pässword\nsecond line 🔑';
    let copied: string | undefined;
    const events: { type: string; detail: unknown }[] = [];
    let removed = false;
    let restored = false;
    const textarea = {
      value: '',
      style: {},
      focus() {},
      select() {},
      setSelectionRange() {},
      remove() {
        removed = true;
      },
    };
    const context = {
      exports: {} as { copyTextToClipboard: (text: string) => Promise<boolean> },
      navigator:
        mode === 'missing'
          ? {}
          : {
              clipboard: {
                async writeText(value: string) {
                  if (mode !== 'modern') throw new Error('NotAllowedError');
                  copied = value;
                },
              },
            },
      document: {
        activeElement: {
          focus() {
            restored = true;
          },
        },
        createElement: () => textarea,
        body: { appendChild() {} },
        execCommand(command: string) {
          expect(command).toBe('copy');
          if (mode === 'throws') throw new Error('Copy not supported');
          copied = textarea.value;
          return mode !== 'failed';
        },
      },
      CustomEvent,
      window: {
        getSelection: () => null,
        dispatchEvent(event: CustomEvent) {
          events.push({ type: event.type, detail: event.detail });
          return true;
        },
      },
      HTMLInputElement: class {},
      HTMLTextAreaElement: class {},
    };
    const toastContext = { exports: {}, window: context.window, CustomEvent };
    runInNewContext(toastSource, toastContext);
    runInNewContext(source, {
      ...context,
      require: (module: string) => {
        expect(module).toBe('./toast');
        return toastContext.exports;
      },
    });
    const result = context.exports.copyTextToClipboard(text);
    const failed = mode === 'failed' || mode === 'throws';
    await expect(result).resolves.toBe(!failed);
    expect(events).toEqual(
      failed
        ? [
            {
              type: 'app:toast',
              detail: {
                message: 'Unable to copy to clipboard. Select the text and copy it manually.',
                type: 'error',
                duration: 1000,
              },
            },
          ]
        : [
            {
              type: 'app:toast',
              detail: { message: 'Copied to clipboard.', type: 'success', duration: 1000 },
            },
          ]
    );
    if (!failed) expect(copied).toBe(text);
    expect(removed).toBe(mode !== 'modern');
    expect(restored).toBe(mode !== 'modern');
  });
}
