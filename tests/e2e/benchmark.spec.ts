import { expect, test } from '@playwright/test';

test.describe('Benchmark Modal', () => {
  // Benchmarks can take a while on slower machines.
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    // Mock benchmark API so E2E doesn't depend on local hashcat performance/config.
    await page.route('**/api/benchmark*', async route => {
      const url = new URL(route.request().url());
      const hashTypeParam = url.searchParams.get('hashType');
      const requestedType = hashTypeParam != null ? Number(hashTypeParam) : null;

      const nameForType = (t: number) => {
        if (t === 0) return 'MD5';
        if (t === 1000) return 'NTLM';
        if (t === 100) return 'SHA1';
        return `Hash type ${t}`;
      };

      const results =
        requestedType != null && !Number.isNaN(requestedType)
          ? [
              {
                hashType: requestedType,
                hashName: nameForType(requestedType),
                speed: '123.45 MH/s',
                speedPerHash: 123_450_000,
                unit: 'MH/s',
              },
              {
                hashType: requestedType,
                hashName: nameForType(requestedType),
                speed: '120.01 MH/s',
                speedPerHash: 120_010_000,
                unit: 'MH/s',
              },
            ]
          : [
              {
                hashType: 0,
                hashName: 'MD5',
                speed: '123.45 MH/s',
                speedPerHash: 123_450_000,
                unit: 'MH/s',
              },
              {
                hashType: 1000,
                hashName: 'NTLM',
                speed: '98.76 MH/s',
                speedPerHash: 98_760_000,
                unit: 'MH/s',
              },
              {
                hashType: 100,
                hashName: 'SHA1',
                speed: '1.23 GH/s',
                speedPerHash: 1_230_000_000,
                unit: 'GH/s',
              },
            ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results }),
      });
    });

    await page.goto('/');
  });

  test('should open and close the Benchmark modal', async ({ page }) => {
    const benchmarkButton = page.getByRole('button', { name: 'Benchmark' });
    await benchmarkButton.click();
    await expect(page.getByRole('heading', { name: 'Hashcat Benchmark' })).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Hashcat Benchmark' })).not.toBeVisible();
  });

  test('should run benchmark and display results', async ({ page }) => {
    const benchmarkButton = page.getByRole('button', { name: 'Benchmark' });
    await benchmarkButton.click();

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Hashcat Benchmark' });

    // Check initial empty state
    await expect(modal.getByText('Run a benchmark to see results')).toBeVisible();

    // Click run - this will actually run hashcat benchmark
    await modal.getByRole('button', { name: 'Run Benchmark' }).click();

    // Wait for results (benchmark can take a while)
    const tableBody = modal.locator('tbody');
    await expect(tableBody.getByText(/Type\s+\d+/).first()).toBeVisible({ timeout: 120000 });

    // Verify we have actual benchmark data
    // Should have hash names and speed values
    await expect(tableBody).toContainText(/MD5|SHA|NTLM/);
    await expect(tableBody).toContainText(/H\/s|kH\/s|MH\/s|GH\/s/);
  });

  test('should benchmark specific hash type', async ({ page }) => {
    await page.getByRole('button', { name: 'Benchmark' }).click();

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Hashcat Benchmark' });

    // Select MD5 (hash type 0)
    const dropdown = modal.getByPlaceholder('Select hash type or benchmark all types...');
    await dropdown.click();
    await page.locator('#dropdown-option-0').click();

    // Run benchmark
    await modal.getByRole('button', { name: 'Run Benchmark' }).click();

    // Wait for results
    const tableBody = modal.locator('tbody');
    await expect(tableBody.getByText(/Type\s+0/).first()).toBeVisible({ timeout: 120000 });

    // Hashcat can emit multiple rows for a single type (e.g. multiple devices).
    const rowCount = await tableBody.locator('tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify all rows are MD5 / Type 0
    await expect(tableBody).toContainText('MD5');
    const metaLines = await tableBody.locator('div.text-xs.text-gray-400').allTextContents();
    const typeLines = metaLines.filter(t => t.trim().startsWith('Type'));
    expect(typeLines.length).toBeGreaterThan(0);
    expect(typeLines.every(t => t.includes('Type 0'))).toBe(true);
  });
});
