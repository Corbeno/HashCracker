import { expect, test } from '@playwright/test';

test.describe('Potfile Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close the Potfile modal', async ({ page }) => {
    const potfileButton = page.getByRole('button', { name: 'View Potfile' });
    await potfileButton.click();

    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: 'Potfile Contents' })).toBeVisible();

    // Close using the X button
    const closeButton = page
      .locator('button')
      .filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') })
      .first();
    await closeButton.click();

    await expect(page.getByRole('heading', { name: 'Potfile Contents' })).not.toBeVisible();
  });

  test('should display potfile contents', async ({ page }) => {
    await page.getByRole('button', { name: 'View Potfile' }).click();

    // Wait for content to load (either empty message or actual content)
    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Potfile Contents' });
    await expect(
      modal.getByText('No content in potfile yet.').or(modal.locator('pre'))
    ).toBeVisible();
  });
});
