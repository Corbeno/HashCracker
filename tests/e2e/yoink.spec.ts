import { expect, test } from '@playwright/test';

test.describe('Yoink Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the hash types API
    await page.route('/api/hash-types-with-regex', async (route) => {
      const json = {
        hashTypes: [
          { id: 0, name: 'MD5', category: 'Raw Hash', regex: '^[a-f0-9]{32}$' },
          { id: 1000, name: 'NTLM', category: 'Details', regex: '^[a-f0-9]{32}$' }
        ]
      };
      await route.fulfill({ json });
    });
    
    // Mock cracked hashes API (empty by default)
    await page.route('/api/cracked-hashes', async (route) => {
        await route.fulfill({ json: { crackedHashes: {} } });
    });

    await page.goto('/');
  });

  test('should open and close the Yoink modal', async ({ page }) => {
    const yoinkButton = page.getByRole('button', { name: 'Yoink' });
    await yoinkButton.click();
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).not.toBeVisible();
  });

  test('should extract hashes successfully', async ({ page }) => {
    // Mock extraction
    await page.route('/api/extract-hashes', async (route) => {
       await route.fulfill({ json: { hashes: ['5f4dcc3b5aa765d61d8327deb882cf99'], hashType: 'MD5', count: 1 } });
    });

    await page.getByRole('button', { name: 'Yoink' }).click();
    
    // Check loading types is gone
    await expect(page.getByText('Loading hash types...')).not.toBeVisible();
    
    // Select MD5 (id: 0)
    // The SearchableDropdown uses logic to show options.
    // Scope to modal
    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();
    await page.locator('#dropdown-option-0').click();

    // Input text
    await page.locator('#input-text').fill('search 5f4dcc3b5aa765d61d8327deb882cf99 here');
    
    // Wait for the debounced api call (we can wait for the result in UI)
    const resultArea = page.locator('.bg-gray-700.text-white.p-3.rounded-md.flex-1.overflow-auto');
    await expect(resultArea.getByText('5f4dcc3b5aa765d61d8327deb882cf99')).toBeVisible();
  });

  test('should handle no hashes found/empty result', async ({ page }) => {
     await page.route('/api/extract-hashes', async (route) => {
       await route.fulfill({ json: { hashes: [], hashType: 'MD5', count: 0 } });
    });

    await page.getByRole('button', { name: 'Yoink' }).click();
    await expect(page.getByText('Loading hash types...')).not.toBeVisible();

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Yoink Hashes from your logs!' });
    const dropdownTrigger = modal.getByPlaceholder('Select hash type...');
    await dropdownTrigger.click();
    // Assuming 0 is MD5 based on our mock
    await page.locator('#dropdown-option-0').click();

    await page.locator('#input-text').fill('no hashes here');
    
    // The UI stays in default state if empty
    await expect(page.getByText('Extracted hashes will appear here...')).toBeVisible();
  });
});
