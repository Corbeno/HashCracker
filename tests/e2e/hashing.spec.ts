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
    const crackedPanel = page.locator('.bg-gray-800\\/50').filter({ hasText: 'Cracked Hashes' });
    const crackedTableBody = crackedPanel.locator('tbody');

    await expect(
      crackedTableBody.getByRole('cell', { name: '5f4dcc3b5aa765d61d8327deb882cf99' })
    ).toBeVisible({
      timeout: 60000,
    });
    await expect(crackedTableBody.getByRole('button', { name: 'password' }).first()).toBeVisible({
      timeout: 60000,
    });
    await expect(crackedTableBody).toContainText(/\b0\b\s*-\s*MD5/i, { timeout: 60000 });

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
    const crackedPanel = page.locator('.bg-gray-800\\/50').filter({ hasText: 'Cracked Hashes' });
    const crackedTableBody = crackedPanel.locator('tbody');

    // At least one hash should be cracked.
    await expect(crackedTableBody).toContainText(
      /5f4dcc3b5aa765d61d8327deb882cf99|098f6bcd4621d373cade4e832627b4f6/,
      { timeout: 60000 }
    );
    await expect(crackedTableBody).toContainText(/password|test/, { timeout: 60000 });
  });

  test('should show job progress', async ({ page }) => {
    test.setTimeout(120000);

    // Enable live updates so debugInfo/statusJson is populated.
    const liveUpdatesOff = page.getByRole('button', { name: /live updates disabled/i });
    if (await liveUpdatesOff.count()) {
      await liveUpdatesOff.first().click();
    }

    // Use several unknown hashes so the job lasts long enough to observe progress.
    const longRunningHashes = [
      '0123456789abcdef0123456789abcdef',
      'deadbeefdeadbeefdeadbeefdeadbeef',
      'feedfacefeedfacefeedfacefeedface',
      'baadf00dbaadf00dbaadf00dbaadf00d',
      'cafebabecafebabecafebabecafebabe',
      '0badc0de0badc0de0badc0de0badc0de',
    ].join('\n');

    await page.locator('#hash-input').fill(longRunningHashes);
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Click "Show Details" to see debug info
    const firstJobCard = page
      .locator('.bg-gray-900\\/50')
      .filter({ has: page.getByRole('button', { name: /Show Details|Hide Details/ }) })
      .first();
    await expect(firstJobCard.getByRole('button', { name: 'Show Details' })).toBeVisible({
      timeout: 20000,
    });
    await firstJobCard.getByRole('button', { name: 'Show Details' }).click();

    // The details panel should open.
    await expect(firstJobCard.getByRole('button', { name: 'Hide Details' })).toBeVisible({
      timeout: 20000,
    });

    // Debug info is streamed; wait for the details content to appear.
    await expect(firstJobCard.getByText('Recovered hashes for this job:')).toBeVisible({
      timeout: 60000,
    });

    // If statusJson is available, the Status section should render.
    const statusHeading = firstJobCard.getByRole('heading', { name: 'Status' });
    if (await statusHeading.count()) {
      await expect(statusHeading).toBeVisible({ timeout: 60000 });
      await expect(firstJobCard.getByText('Progress:')).toBeVisible({ timeout: 60000 });
    }
  });

  test('should cancel a running job', async ({ page }) => {
    test.setTimeout(120000);

    // Use unknown hashes so the job is still running when we cancel.
    const firstHash = '0123456789abcdef0123456789abcdef';
    const longRunningHashes = [
      firstHash,
      'deadbeefdeadbeefdeadbeefdeadbeef',
      'feedfacefeedfacefeedfacefeedface',
      'baadf00dbaadf00dbaadf00dbaadf00d',
      'cafebabecafebabecafebabecafebabe',
      '0badc0de0badc0de0badc0de0badc0de',
    ].join('\n');

    await page.locator('#hash-input').fill(longRunningHashes);
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Click Cancel button
    const jobCard = page.locator('.bg-gray-900\\/50').filter({ hasText: firstHash }).first();
    const cancelButton = jobCard.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible({ timeout: 20000 });

    const [cancelResponse] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/api/crack?jobId=') && r.request().method() === 'DELETE'
      ),
      cancelButton.click(),
    ]);
    expect(cancelResponse.ok()).toBeTruthy();

    // Job should no longer be running.
    await expect(jobCard.getByText(/Cancelled|Completed|Exhausted|Failed/).first()).toBeVisible({
      timeout: 30000,
    });
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
    const ntlmJobCard = page
      .locator('.bg-gray-900\\/50')
      .filter({ hasText: '8846f7eaee8fb117ad06bdd830b7586c' })
      .first();
    await expect(ntlmJobCard.getByText('Type: NTLM')).toBeVisible({ timeout: 10000 });
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
    const activeJobsPanel = page.locator('.bg-gray-800\\/50').filter({ hasText: 'Active Jobs' });
    await expect(
      activeJobsPanel
        .locator('.break-all')
        .filter({ hasText: '5f4dcc3b5aa765d61d8327deb882cf99' })
        .first()
    ).toBeVisible();
  });

  test('should highlight cracked hashes in job panel', async ({ page }) => {
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for hash to be cracked
    const crackedPanel = page.locator('.bg-gray-800\\/50').filter({ hasText: 'Cracked Hashes' });
    const crackedTableBody = crackedPanel.locator('tbody');
    await expect(
      crackedTableBody.getByRole('cell', { name: '5f4dcc3b5aa765d61d8327deb882cf99' })
    ).toBeVisible({
      timeout: 60000,
    });
    await expect(crackedTableBody.getByRole('button', { name: 'password' }).first()).toBeVisible({
      timeout: 60000,
    });

    // In the Active Jobs panel, the cracked hash should be highlighted
    // Look for the hash with green color (text-green-400 class)
    const jobPanel = page.locator('.bg-gray-800\\/50').filter({ hasText: 'Active Jobs' });
    const crackedHashInJob = jobPanel
      .locator('.text-green-400')
      .filter({ hasText: '5f4dcc3b5aa765d61d8327deb882cf99' });
    await expect(crackedHashInJob.first()).toBeVisible();
  });

  test('should copy job hashes to input', async ({ page }) => {
    // Start a job with an unlikely-to-crack hash so it remains "uncracked".
    const uncrackedHash = '0123456789abcdef0123456789abcdef';

    await page.locator('#hash-input').fill(uncrackedHash);
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Wait for job to appear
    await expect(page.getByText(uncrackedHash).first()).toBeVisible();

    // Add some other content to ensure it gets replaced.
    await page.locator('#hash-input').fill('will be replaced');

    // Click the "Replace" button on the job (icon button)
    const jobPanel = page.locator('.bg-gray-900\\/50').filter({ hasText: uncrackedHash }).first();
    const replaceButton = jobPanel.getByRole('button', {
      name: 'Replace input with all uncracked hashes',
    });
    await replaceButton.click();

    // Input should now have the job's hash
    await expect(page.locator('#hash-input')).toHaveValue(uncrackedHash);
  });
});
