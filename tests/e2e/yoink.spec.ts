import { expect, test } from '@playwright/test';

import { gotoCracker } from './utils/navigation';
import {
  openYoink,
  selectYoinkHashType,
  setYoinkInput,
  useUncrackedHashes,
  yoinkModal,
  yoinkOutput,
} from './utils/yoink';

test.describe('Yoink Modal', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCracker(page);
  });

  test('should open and close the Yoink modal', async ({ page }) => {
    await openYoink(page);
    await expect(page.getByRole('heading', { name: 'Yoink Hashes from your logs!' })).toBeVisible();

    await yoinkModal(page).getByTestId('yoink-close').click();
    await expect(page.getByTestId('yoink-modal')).toBeHidden();
  });

  test('should load hash types from API', async ({ page }) => {
    await openYoink(page);

    // Wait for hash types to load
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    // Verify dropdown is populated
    const dropdownTrigger = yoinkModal(page).getByTestId('yoink-hash-type-trigger');
    await expect(dropdownTrigger).toBeVisible();
    await expect(dropdownTrigger).toHaveValue(/\d+ - /);
  });

  test('should extract MD5 hashes from text', async ({ page }) => {
    await openYoink(page);

    // Wait for loading to complete
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    // Scope to modal
    await selectYoinkHashType(page, 0);

    // Input text with a known MD5 hash
    const testText = 'Here is a hash: 5f4dcc3b5aa765d61d8327deb882cf99 in some text';
    await setYoinkInput(page, testText);

    // Wait for debounced extraction (500ms + processing time)
    await page.waitForTimeout(1000);

    // Verify hash was extracted
    await expect(yoinkOutput(page).getByText('5f4dcc3b5aa765d61d8327deb882cf99')).toBeVisible();
  });

  test('should handle text with no hashes', async ({ page }) => {
    await openYoink(page);
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    await selectYoinkHashType(page, 0);

    await setYoinkInput(page, 'This text has no hashes at all');

    // Wait for processing
    await page.waitForTimeout(1000);

    // Should show placeholder text
    await expect(yoinkOutput(page).getByText('Extracted hashes will appear here...')).toBeVisible();
  });

  test('should extract multiple hashes', async ({ page }) => {
    await openYoink(page);
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    await selectYoinkHashType(page, 0);

    // Multiple MD5 hashes
    const testText = `
      Hash 1: 5f4dcc3b5aa765d61d8327deb882cf99
      Hash 2: 098f6bcd4621d373cade4e832627b4f6
      Hash 3: 21232f297a57a5a743894a0e4a801fc3
    `;
    await setYoinkInput(page, testText);

    await page.waitForTimeout(1000);

    await expect(yoinkOutput(page).getByText('5f4dcc3b5aa765d61d8327deb882cf99')).toBeVisible();
    await expect(yoinkOutput(page).getByText('098f6bcd4621d373cade4e832627b4f6')).toBeVisible();
    await expect(yoinkOutput(page).getByText('21232f297a57a5a743894a0e4a801fc3')).toBeVisible();
  });

  test('should use extracted hashes in main form', async ({ page }) => {
    await openYoink(page);
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    await selectYoinkHashType(page, 0);

    // Use a hash that's extremely unlikely to already be in the potfile.
    const uncrackedHash = '0123456789abcdef0123456789abcdef';
    await setYoinkInput(page, `Hash: ${uncrackedHash}`);
    await page.waitForTimeout(1000);

    // Click "Use Uncracked Hashes"
    await useUncrackedHashes(page);

    // Modal should close
    await expect(page.getByTestId('yoink-modal')).toBeHidden();

    // Wait a moment for the hash to populate
    await page.waitForTimeout(500);

    // Hash should be in main input
    const mainInput = page.locator('#hash-input');
    await expect(mainInput).toHaveValue(new RegExp(uncrackedHash));
  });

  test('should clear input', async ({ page }) => {
    await openYoink(page);
    await expect(page.getByText('Loading hash types...')).not.toBeVisible({ timeout: 10000 });

    await setYoinkInput(page, 'Some text here');

    // Click Clear button
    await page.getByRole('button', { name: 'Clear' }).click();

    // Input should be empty
    await expect(yoinkModal(page).getByTestId('yoink-input')).toBeEmpty();
  });
});
