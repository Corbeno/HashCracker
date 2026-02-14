import { expect, test } from '@playwright/test';

import {
  benchmarkResultsTbody,
  mockBenchmarkApi,
  openBenchmark,
  runBenchmark,
  selectBenchmarkHashType,
} from './utils/benchmark';
import { gotoCracker } from './utils/navigation';

test.describe('Benchmark Modal', () => {
  // Benchmarks can take a while on slower machines.
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await mockBenchmarkApi(page);
    await gotoCracker(page);
  });

  test('should open and close the Benchmark modal', async ({ page }) => {
    await openBenchmark(page);
    await page.getByTestId('benchmark-close').click();
    await expect(page.getByRole('heading', { name: 'Hashcat Benchmark' })).not.toBeVisible();
  });

  test('should run benchmark and display results', async ({ page }) => {
    await openBenchmark(page);
    await expect(page.getByText('Run a benchmark to see results')).toBeVisible();
    await runBenchmark(page);

    await expect(
      benchmarkResultsTbody(page)
        .getByText(/Type\s+\d+/)
        .first()
    ).toBeVisible();
    await expect(benchmarkResultsTbody(page)).toContainText(/MD5|SHA|NTLM/);
    await expect(benchmarkResultsTbody(page)).toContainText(/H\/s|kH\/s|MH\/s|GH\/s/);
  });

  test('should benchmark specific hash type', async ({ page }) => {
    await openBenchmark(page);
    await selectBenchmarkHashType(page, 0);
    await runBenchmark(page);

    await expect(
      benchmarkResultsTbody(page)
        .getByText(/Type\s+0/)
        .first()
    ).toBeVisible();

    const rows = benchmarkResultsTbody(page).locator('tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i)).toContainText('MD5');
      await expect(rows.nth(i)).toContainText(/Type\s+0/);
    }
  });
});
