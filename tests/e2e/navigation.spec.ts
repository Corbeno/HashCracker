import { expect, test } from '@playwright/test';

test.describe('Navigation & Static Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Hash Cracker/);
    await expect(page.getByRole('link', { name: 'Hash Cracker Logo Hash Cracker' })).toBeVisible();
  });

  test('should show system info panel', async ({ page }) => {
    // Check for CPU, RAM, GPU icons/labels (they show as alt text on images)
    await expect(page.getByAltText('CPU')).toBeVisible();
    await expect(page.getByAltText('RAM')).toBeVisible();
    await expect(page.getByAltText('GPU')).toBeVisible();
  });
});
