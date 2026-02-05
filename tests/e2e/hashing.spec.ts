import { expect, test } from '@playwright/test';

test.describe('Hashing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should validate empty input', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Cracking' }).click();
    await expect(page.getByText('Please enter at least one hash')).toBeVisible();
  });

  test('should submit hash for cracking', async ({ page }) => {
    // Fill input with a known MD5 hash (password = "password")
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');

    // Submit
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Input should be cleared
    await expect(page.locator('#hash-input')).toBeEmpty();

    // Job should appear in Active Jobs panel
    await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible();
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99').first()).toBeVisible();
  });

  test('should crack a simple MD5 hash', async ({ page }) => {
    // Submit known MD5 hash (password = "password")
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for job to appear
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99').first()).toBeVisible();

    // Wait for job to show running status
    await expect(page.getByText('Running').or(page.getByText('Queued')).first()).toBeVisible({
      timeout: 10000,
    });

    // Wait for hash to be cracked and appear in Cracked Hashes panel
    // This should be fast with rockyou wordlist
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99:password')).toBeVisible({
      timeout: 60000,
    });

    // Verify job shows completed status
    await expect(page.getByText('Completed').or(page.getByText('Exhausted')).first()).toBeVisible({
      timeout: 65000,
    });
  });

  test('should crack multiple hashes', async ({ page }) => {
    // Submit multiple known MD5 hashes
    const hashes = [
      '5f4dcc3b5aa765d61d8327deb882cf99', // password
      '098f6bcd4621d373cade4e832627b4f6', // test
    ].join('\n');

    await page.locator('#hash-input').fill(hashes);
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for both hashes to appear in job
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99').first()).toBeVisible();
    await expect(page.getByText('098f6bcd4621d373cade4e832627b4f6').first()).toBeVisible();

    // Wait for at least one to be cracked
    await expect(
      page
        .getByText('5f4dcc3b5aa765d61d8327deb882cf99:password')
        .or(page.getByText('098f6bcd4621d373cade4e832627b4f6:test'))
    ).toBeVisible({ timeout: 60000 });
  });

  test('should show job progress', async ({ page }) => {
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for job to start running
    await expect(page.getByText('Running').first()).toBeVisible({ timeout: 10000 });

    // Click "Show Details" to see debug info
    await page.getByRole('button', { name: 'Show Details' }).first().click();

    // Should show some debug information
    await expect(page.getByText(/Status:|Progress:|Speed:/)).toBeVisible();
  });

  test('should cancel a running job', async ({ page }) => {
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for job to start
    await expect(page.getByText('Running').or(page.getByText('Queued')).first()).toBeVisible({
      timeout: 10000,
    });

    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).first().click();

    // Job should show cancelled status
    await expect(page.getByText('Cancelled').first()).toBeVisible({ timeout: 5000 });
  });

  test('should select different hash type', async ({ page }) => {
    // Select NTLM (hash type 1000)
    const hashTypeDropdown = page.locator('form').getByPlaceholder('Select hash type...');
    await hashTypeDropdown.click();

    // Search for NTLM
    const searchInput = page.getByPlaceholder('Search hash type by name or ID...');
    await searchInput.fill('1000');

    // Select NTLM
    await page.locator('#dropdown-option-1000').click();

    // Verify selection
    await expect(hashTypeDropdown).toHaveValue(/1000/);

    // Submit a hash (this is NTLM hash of "password")
    await page.locator('#hash-input').fill('8846f7eaee8fb117ad06bdd830b7586c');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Verify job shows NTLM type
    await expect(page.getByText('Type: NTLM').or(page.getByText('Type: 1000'))).toBeVisible({
      timeout: 5000,
    });
  });

  test('should select different attack mode', async ({ page }) => {
    // Select attack mode dropdown
    const attackModeDropdown = page.locator('form').getByPlaceholder('Select attack mode...');
    await attackModeDropdown.click();

    // Should show attack mode options
    await expect(page.getByText(/rockyou|Dictionary/i).first()).toBeVisible();

    // Select first option (rockyou is default, just verify it works)
    await page.keyboard.press('Escape');

    // Submit hash
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Verify job appears
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99')).toBeVisible();
  });

  test('should highlight cracked hashes in job panel', async ({ page }) => {
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for hash to be cracked
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99:password')).toBeVisible({
      timeout: 60000,
    });

    // In the Active Jobs panel, the cracked hash should be highlighted
    // Look for the hash with green color (text-green-400 class)
    const jobPanel = page.locator('.bg-gray-800\\/50').filter({ hasText: 'Active Jobs' });
    const crackedHashInJob = jobPanel
      .locator('.text-green-400')
      .filter({ hasText: '5f4dcc3b5aa765d61d8327deb882cf99' });
    await expect(crackedHashInJob).toBeVisible();
  });

  test('should copy job hashes to input', async ({ page }) => {
    // First crack a hash
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for job to appear
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99').first()).toBeVisible();

    // Add another hash to input
    await page.locator('#hash-input').fill('098f6bcd4621d373cade4e832627b4f6');

    // Click the "Replace" button on the job (icon button)
    const jobPanel = page
      .locator('.bg-gray-900\\/50')
      .filter({ hasText: '5f4dcc3b5aa765d61d8327deb882cf99' })
      .first();
    const replaceButton = jobPanel.getByRole('button', { name: 'Replace input with all' }).first();
    await replaceButton.click();

    // Input should now have the job's hash
    await expect(page.locator('#hash-input')).toHaveValue('5f4dcc3b5aa765d61d8327deb882cf99');
  });
});
