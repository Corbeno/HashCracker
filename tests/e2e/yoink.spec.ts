import { expect, test } from '@playwright/test';

test.describe('Yoink Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close the Yoink modal', async ({ page }) => {
    const yoinkButton = page.getByRole('button', { name: 'Yoink' });
    await yoinkButton.click();
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).not.toBeVisible();
  });

  test('should load hash types from API', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();
    
    // Wait for hash types to load
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify dropdown is populated
    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    const dropdown = modal.getByPlaceholder('Select hash type...');
    await expect(dropdown).toBeVisible();
    
    // Should have a default value (likely MD5)
    await expect(dropdown).toHaveValue(/\d+ - /);
  });

  test('should extract MD5 hashes from text', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();
    
    // Wait for loading to complete
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });
    
    // Scope to modal
    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    
    // Select MD5 hash type
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();
    await page.locator('#dropdown-option-0').click();

    // Input text with a known MD5 hash
    const testText = 'Here is a hash: 5f4dcc3b5aa765d61d8327deb882cf99 in some text';
    await page.locator('#input-text').fill(testText);
    
    // Wait for debounced extraction (500ms + processing time)
    await page.waitForTimeout(1000);
    
    // Verify hash was extracted
    const resultArea = page.locator('.bg-gray-700.text-white.p-3.rounded-md.flex-1.overflow-auto');
    await expect(resultArea.getByText('5f4dcc3b5aa765d61d8327deb882cf99')).toBeVisible();
  });

  test('should handle text with no hashes', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();
    await page.locator('#dropdown-option-0').click();

    await page.locator('#input-text').fill('This text has no hashes at all');
    
    // Wait for processing
    await page.waitForTimeout(1000);
    
    // Should show placeholder text
    await expect(page.getByText('Extracted hashes will appear here...')).toBeVisible();
  });

  test('should extract multiple hashes', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();
    await page.locator('#dropdown-option-0').click();

    // Multiple MD5 hashes
    const testText = `
      Hash 1: 5f4dcc3b5aa765d61d8327deb882cf99
      Hash 2: 098f6bcd4621d373cade4e832627b4f6
      Hash 3: 21232f297a57a5a743894a0e4a801fc3
    `;
    await page.locator('#input-text').fill(testText);
    
    await page.waitForTimeout(1000);
    
    const resultArea = page.locator('.bg-gray-700.text-white.p-3.rounded-md.flex-1.overflow-auto');
    await expect(resultArea.getByText('5f4dcc3b5aa765d61d8327deb882cf99')).toBeVisible();
    await expect(resultArea.getByText('098f6bcd4621d373cade4e832627b4f6')).toBeVisible();
    await expect(resultArea.getByText('21232f297a57a5a743894a0e4a801fc3')).toBeVisible();
  });

  test('should use extracted hashes in main form', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();
    await page.locator('#dropdown-option-0').click();

    await page.locator('#input-text').fill('Hash: 5f4dcc3b5aa765d61d8327deb882cf99');
    await page.waitForTimeout(1000);
    
    // Click "Use Uncracked Hashes"
    await page.getByRole('button', { name: 'Use Uncracked Hashes' }).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).not.toBeVisible();
    
    // Wait a moment for the hash to populate
    await page.waitForTimeout(500);
    
    // Hash should be in main input
    const mainInput = page.locator('#hash-input');
    await expect(mainInput).toHaveValue(/5f4dcc3b5aa765d61d8327deb882cf99/);
  });

  test('should clear input', async ({ page }) => {
    await page.getByRole('button', { name: 'Yoink' }).click();
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    await page.locator('#input-text').fill('Some text here');
    
    // Click Clear button
    await page.getByRole('button', { name: 'Clear' }).click();
    
    // Input should be empty
    await expect(page.locator('#input-text')).toBeEmpty();
  });
});
