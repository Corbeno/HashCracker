import { expect, test } from '@playwright/test';

import { randomHex } from './utils/random';

import { gotoCracker } from './utils/navigation';
import {
  cancelJob,
  crackedHashesTbody,
  hashInput,
  openJobDetails,
  selectAttackMode,
  selectHashType,
  startCracking,
  waitForJobVisible,
} from './utils/cracker';

test.describe('Hashing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCracker(page);
  });

  test('should validate empty input', async ({ page }) => {
    await page.getByTestId('start-cracking').click();
    await expect(page.getByText('Please enter at least one hash')).toBeVisible();
  });

  test('should submit hash for cracking', async ({ page }) => {
    // Fill input with a known MD5 hash (password = "password")
    const hash = '5f4dcc3b5aa765d61d8327deb882cf99';
    await startCracking(page, hash);

    // Input should be cleared
    await expect(page.locator('#hash-input')).toBeEmpty();

    // Job should appear in Active Jobs panel
    await waitForJobVisible(page, hash);
  });

  test('should queue three jobs in Smart mode', async ({ page }) => {
    const firstHash = randomHex();
    const secondHash = randomHex();

    await selectHashType(page, 0);
    await selectAttackMode(page, 'smart');
    await startCracking(page, [firstHash, secondHash]);

    const superJobs = page.getByTestId('job-card').filter({ hasText: firstHash });
    await expect(superJobs).toHaveCount(3, { timeout: 15000 });

    await expect(superJobs.filter({ hasText: 'Mode: TSI' })).toHaveCount(1);
    await expect(superJobs.filter({ hasText: 'One Rule To Rule Them Still' })).toHaveCount(1);
    await expect(
      superJobs
        .filter({ hasText: 'Mode: RockYou' })
        .filter({ hasNotText: 'One Rule To Rule Them Still' })
    ).toHaveCount(1);
  });

  test('should crack a simple MD5 hash', async ({ page }) => {
    // Submit known MD5 hash (password = "password")
    const hash = '5f4dcc3b5aa765d61d8327deb882cf99';
    await startCracking(page, hash);
    await waitForJobVisible(page, hash);

    // Wait for hash to be cracked and appear in Cracked Hashes panel
    // This should be fast with rockyou wordlist
    await expect(crackedHashesTbody(page).getByRole('cell', { name: hash })).toBeVisible({
      timeout: 60000,
    });
    await expect(
      crackedHashesTbody(page).getByRole('button', { name: 'password' }).first()
    ).toBeVisible({
      timeout: 60000,
    });
    await expect(crackedHashesTbody(page)).toContainText(/\b0\b\s*-\s*MD5/i, { timeout: 60000 });
  });

  test('should crack multiple hashes', async ({ page }) => {
    // Submit multiple known MD5 hashes
    const hashList = [
      '5f4dcc3b5aa765d61d8327deb882cf99', // password
      '098f6bcd4621d373cade4e832627b4f6', // test
    ];

    await startCracking(page, hashList);

    // Wait for both hashes to appear in job
    await waitForJobVisible(page, hashList[0]);
    await waitForJobVisible(page, hashList[1]);

    // Wait for at least one to be cracked
    await expect(crackedHashesTbody(page)).toContainText(
      /5f4dcc3b5aa765d61d8327deb882cf99|098f6bcd4621d373cade4e832627b4f6/,
      { timeout: 60000 }
    );
    await expect(crackedHashesTbody(page)).toContainText(/password|test/, { timeout: 60000 });
  });

  test('should show job progress', async ({ page }) => {
    test.setTimeout(120000);

    // Use several unknown hashes so the job lasts long enough to observe progress.
    const firstHash = randomHex();
    const longRunningHashes = [
      firstHash,
      randomHex(),
      randomHex(),
      randomHex(),
      randomHex(),
      randomHex(),
    ].join('\n');

    await startCracking(page, longRunningHashes);

    const jobCard = await waitForJobVisible(page, firstHash);
    await openJobDetails(jobCard);

    await expect(jobCard.getByText('Recovered hashes for this job:')).toBeVisible({
      timeout: 60000,
    });
  });

  test('should cancel a running job', async ({ page }) => {
    test.setTimeout(120000);

    // Use unknown hashes so the job is still running when we cancel.
    const firstHash = randomHex();
    const longRunningHashes = [
      firstHash,
      randomHex(),
      randomHex(),
      randomHex(),
      randomHex(),
      randomHex(),
    ].join('\n');

    await startCracking(page, longRunningHashes);
    const jobCard = await waitForJobVisible(page, firstHash);
    await cancelJob(page, jobCard);

    // A cancelled job should remain visible and show cancelled status.
    await expect(jobCard.getByTestId('job-status')).toContainText('Cancelled', { timeout: 30000 });
  });

  test('should select different hash type', async ({ page }) => {
    await selectHashType(page, 1000);

    // Submit a hash (this is NTLM hash of "password")
    const ntlmHash = '8846f7eaee8fb117ad06bdd830b7586c';
    await startCracking(page, ntlmHash);

    // Verify job shows NTLM type
    const ntlmJobCard = await waitForJobVisible(page, ntlmHash);
    await expect(ntlmJobCard.getByText('Type: NTLM')).toBeVisible({ timeout: 10000 });
  });

  test('should select different attack mode', async ({ page }) => {
    // Select attack mode dropdown (rockyou is default; just verify selection works)
    await selectAttackMode(page, 'rockyou');

    // Submit hash
    const hash = '5f4dcc3b5aa765d61d8327deb882cf99';
    await startCracking(page, hash);
    await waitForJobVisible(page, hash);
  });

  test('should highlight cracked hashes in job panel', async ({ page }) => {
    const hash = '5f4dcc3b5aa765d61d8327deb882cf99';
    await startCracking(page, hash);

    // Wait for hash to be cracked
    await expect(crackedHashesTbody(page).getByRole('cell', { name: hash })).toBeVisible({
      timeout: 60000,
    });
    await expect(
      crackedHashesTbody(page).getByRole('button', { name: 'password' }).first()
    ).toBeVisible({
      timeout: 60000,
    });

    // In the Active Jobs panel, the cracked hash should show the recovered password.
    const card = await waitForJobVisible(page, hash);
    await expect(
      card
        .getByTestId('job-hash')
        .filter({ hasText: `${hash}->password` })
        .first()
    ).toBeVisible();
  });

  test('should show newest cracked hash at the top', async ({ page }) => {
    const firstHash = '5f4dcc3b5aa765d61d8327deb882cf99'; // password
    const secondHash = '098f6bcd4621d373cade4e832627b4f6'; // test

    await startCracking(page, firstHash);
    await expect(crackedHashesTbody(page).getByRole('cell', { name: firstHash })).toBeVisible({
      timeout: 60000,
    });

    await startCracking(page, secondHash);
    await expect(crackedHashesTbody(page).getByRole('cell', { name: secondHash })).toBeVisible({
      timeout: 60000,
    });

    await expect(crackedHashesTbody(page).locator('tr').first()).toContainText(secondHash);
  });

  test('should copy job hashes to input', async ({ page }) => {
    // Start a job with an unlikely-to-crack hash so it remains "uncracked".
    const uncrackedHash = '0123456789abcdef0123456789abcdef';

    await startCracking(page, uncrackedHash);
    const jobCard = await waitForJobVisible(page, uncrackedHash);

    // Add some other content to ensure it gets replaced.
    await page.locator('#hash-input').fill('will be replaced');

    // Click the "Replace" button on the job (icon button)
    await jobCard.getByTestId('job-replace-input').click();

    // Input should now have the job's hash
    await expect(page.locator('#hash-input')).toHaveValue(uncrackedHash);
  });

  test('should persist cracking form choices across page refresh', async ({ page }) => {
    const storageKey = 'hash-cracker:cracker-form-state';
    const draftInput = ['persisted-hash-a', 'persisted-hash-b'].join('\n');

    await page.evaluate(key => window.localStorage.removeItem(key), storageKey);
    await page.reload();
    await expect(hashInput(page)).toBeVisible();

    await hashInput(page).fill(draftInput);
    await selectHashType(page, 1000);
    await selectAttackMode(page, 'all six chars');

    await expect(page.getByTestId('hash-type-dropdown-trigger')).toHaveValue('1000 - NTLM');
    await expect(page.getByTestId('attack-mode-dropdown-trigger')).toHaveValue('All Six Chars');

    await page.reload();
    await expect(hashInput(page)).toHaveValue(draftInput);
    await expect(page.getByTestId('hash-type-dropdown-trigger')).toHaveValue('1000 - NTLM');
    await expect(page.getByTestId('attack-mode-dropdown-trigger')).toHaveValue('All Six Chars');

    await page.evaluate(key => window.localStorage.removeItem(key), storageKey);
  });
});
