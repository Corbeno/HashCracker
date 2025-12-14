import { expect, test } from '@playwright/test';

test.describe('Hash Cracker E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Hash Cracker/);
    await expect(page.getByRole('link', { name: 'Hash Cracker Logo Hash Cracker' })).toBeVisible();
  });

  test('should allow entering hashes manually', async ({ page }) => {
    const hashInput = page.locator('#hash-input');
    await hashInput.fill('5f4dcc3b5aa765d61d8327deb882cf99'); // 'password' in md5
    await expect(hashInput).toHaveValue('5f4dcc3b5aa765d61d8327deb882cf99');
  });

  test('should open and close the Yoink modal', async ({ page }) => {
    const yoinkButton = page.getByRole('button', { name: 'Yoink' });
    await yoinkButton.click();

    // Check if modal is visible
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).toBeVisible();

    // Close it using the Close button at the bottom
    const closeButton = page.getByRole('button', { name: 'Close' });
    await closeButton.click();

    await expect(
      page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })
    ).not.toBeVisible();
  });

  test('should open and close the Benchmark modal', async ({ page }) => {
    const benchmarkButton = page.getByRole('button', { name: 'Benchmark' });
    await benchmarkButton.click();

    await expect(page.getByRole('heading', { name: 'Hashcat Benchmark' })).toBeVisible();

    // Close it
    const closeButton = page.getByRole('button', { name: 'Close' });
    await closeButton.click();
    await expect(page.getByRole('heading', { name: 'Hashcat Benchmark' })).not.toBeVisible();
  });

  test('should open Potfile modal', async ({ page }) => {
    const potfileButton = page.getByRole('button', { name: 'View Potfile' });
    await potfileButton.click();
    await expect(page.getByRole('heading', { name: 'Potfile Contents' })).toBeVisible();

    const closeButton = page
      .locator('button')
      .filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') })
      .first();
    // Alternatively, just matching the only button in the header is easier if identifiable.
    // Let's use the svg path logic or just first button in modal.
    await closeButton.click();
    await expect(page.getByRole('heading', { name: 'Potfile Contents' })).not.toBeVisible();
  });

  test('should extract hashes in Yoink modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();

    // Wait for the modal to load hash types (it might show "Loading hash types..." initially)
    await expect(page.getByText('Loading hash types...')).not.toBeVisible();

    // Scope to modal to avoid finding the "Hash Type" dropdown in the background form
    // The modal has a specific heading
    const modal = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Yoink Hashes from your logs!' }) })
      .first();

    // Check if we need to select MD5 or if it's already selected
    // The dropdown input will have value "0 - MD5" if selected
    // We can try to strictly Select MD5 to be sure.
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();

    // Select MD5
    // After clicking, the dropdown opens in a Portal (document.body), so we can search globally for the option
    // But we need to make sure we select the right one if multiple exist?
    // The portal is top-level.
    await page.getByText('0 - MD5', { exact: false }).last().click();
    // using last() because if the background form has one too? No, hidden ones shouldn't appear in portal.
    // Actually, checking "0 - MD5" text visibility is enough.

    // Ensure the input field for text is filled
    const input = page.locator('#input-text');
    await input.fill('This is a test hash: 5f4dcc3b5aa765d61d8327deb882cf99 embedded in text');

    // Wait for processing (it is debounced 500ms)
    await page.waitForTimeout(2000);

    // Use regex to match the hash even if it has a suffix like "-> password"
    // Scoping to modal output area
    const outputArea = modal.locator('.bg-gray-700.text-white.p-3.rounded-md.flex-1.overflow-auto');
    await expect(outputArea.getByText(/5f4dcc3b5aa765d61d8327deb882cf99/)).toBeVisible();
  });
});
