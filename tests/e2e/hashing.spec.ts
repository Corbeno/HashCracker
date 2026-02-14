import { expect, test } from '@playwright/test';

import { gotoCracker } from './utils/navigation';
import {
  cancelJob,
  crackedHashesTbody,
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

    // Ensure live updates are enabled for this test.
    await page.evaluate(() => {
      localStorage.setItem('enableLiveViewing', 'true');
    });
    await page.reload();
    await expect(page.getByTestId('hash-input')).toBeVisible();

    // Use several unknown hashes so the job lasts long enough to observe progress.
    const longRunningHashes = [
      '0123456789abcdef0123456789abcdef',
      'deadbeefdeadbeefdeadbeefdeadbeef',
      'feedfacefeedfacefeedfacefeedface',
      'baadf00dbaadf00dbaadf00dbaadf00d',
      'cafebabecafebabecafebabecafebabe',
      '0badc0de0badc0de0badc0de0badc0de',
    ].join('\n');

    const firstHash = '0123456789abcdef0123456789abcdef';
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
    const firstHash = '0123456789abcdef0123456789abcdef';
    const longRunningHashes = [
      firstHash,
      'deadbeefdeadbeefdeadbeefdeadbeef',
      'feedfacefeedfacefeedfacefeedface',
      'baadf00dbaadf00dbaadf00dbaadf00d',
      'cafebabecafebabecafebabecafebabe',
      '0badc0de0badc0de0badc0de0badc0de',
    ].join('\n');

    await startCracking(page, longRunningHashes);
    const jobCard = await waitForJobVisible(page, firstHash);
    await cancelJob(page, jobCard);

    await expect(jobCard.getByTestId('job-status')).toContainText(
      /Cancelled|Completed|Exhausted|Failed/,
      { timeout: 30000 }
    );
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
});
