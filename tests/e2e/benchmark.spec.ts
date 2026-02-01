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
    const benchmarkButton = page.getByRole('button', { name: 'Benchmark' });
    await benchmarkButton.click();
    
    // Check initial empty state
    await expect(page.getByText('Run a benchmark to see results')).toBeVisible();

    // Click run - this will actually run hashcat benchmark
    await page.getByRole('button', { name: 'Run Benchmark' }).click();
    
    // Wait for loading state
    await expect(page.getByText('Running...')).toBeVisible();
    
    // Wait for results (benchmark can take 10-30 seconds)
    // Look for the table to have content
    const table = page.locator('table tbody');
    await expect(table.locator('tr').first()).toBeVisible({ timeout: 120000 });
    
    // Verify we have actual benchmark data
    // Should have hash names and speed values
    await expect(table.locator('tr').first()).toContainText(/MD5|SHA|NTLM/);
    await expect(table).toContainText(/H\/s|kH\/s|MH\/s|GH\/s/);
  });

  test('should benchmark specific hash type', async ({ page }) => {
    await page.getByRole('button', { name: 'Benchmark' }).click();
    
    // Select MD5 (hash type 0)
    const dropdown = page.getByPlaceholder('Select hash type or benchmark all types...');
    await dropdown.click();
    await page.locator('#dropdown-option-0').click();
    
    // Run benchmark
    await page.getByRole('button', { name: 'Run Benchmark' }).click();
    
    // Wait for results
    const table = page.locator('table tbody');
    await expect(table.locator('tr').first()).toBeVisible({ timeout: 120000 });
    
    // Should only have one result (MD5)
    const rowCount = await table.locator('tr').count();
    expect(rowCount).toBe(1);
    
    // Verify it's MD5
    await expect(table).toContainText('MD5');
  });
});
