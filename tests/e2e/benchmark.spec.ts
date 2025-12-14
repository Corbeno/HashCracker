import { expect, test } from '@playwright/test';

test.describe('Benchmark Modal', () => {
  test.beforeEach(async ({ page }) => {
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
    // Mock benchmark API with query param matching using wildcard
    await page.route('/api/benchmark*', async (route) => {
      const json = {
        results: [
          {
            hashType: 0,
            hashName: 'MD5',
            speed: '1000 kH/s',
            speedPerHash: 1000000,
            unit: 'kH/s'
          }
        ]
      };
      await route.fulfill({ json });
    });

    const benchmarkButton = page.getByRole('button', { name: 'Benchmark' });
    await benchmarkButton.click();
    
    // Check initial empty state
    await expect(page.getByText('Run a benchmark to see results')).toBeVisible();

    // Click run
    await page.getByRole('button', { name: 'Run Benchmark' }).click();
    
    // Check result
    // Check result
    // Scope to table rows or look for exact text in table
    const table = page.locator('table');
    await expect(table.getByText('MD5', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('1000 kH/s')).toBeVisible();
  });
});
