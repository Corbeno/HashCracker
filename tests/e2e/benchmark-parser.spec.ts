import { expect, test } from '@playwright/test';

import { gotoCracker } from './utils/navigation';
import { openBenchmark, runBenchmark } from './utils/benchmark';

import { parseHashcatMachineReadableBenchmark } from '@/utils/hashcatBenchmark';

test.describe('Benchmark Parsing', () => {
  test('does not confuse device id with hash mode', async ({ page }) => {
    const injectedStdout = [
      // device-id:hash-mode:?:?:?:hashes-per-second
      '1:0:1683:4513:55.02:10240000000',
      '2:0:1683:4513:55.82:10183130102',
      'Started: Thu Nov  2 15:08:04 2017',
      'Stopped: Thu Nov  2 15:08:20 2017',
    ].join('\n');

    await page.route('**/api/benchmark*', async route => {
      const results = parseHashcatMachineReadableBenchmark(injectedStdout);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results }),
      });
    });

    await gotoCracker(page);
    await openBenchmark(page);
    await runBenchmark(page);

    const tbody = page.getByTestId('benchmark-results-tbody');
    await expect(tbody).toContainText('MD5');
    await expect(tbody).toContainText(/Type\s+0/);

    // Regression: would show Type 1 / Hash type 1 if device id was parsed as hash mode.
    await expect(tbody).not.toContainText(/Type\s+1/);
    await expect(tbody).not.toContainText('Hash type 1');
  });
});
