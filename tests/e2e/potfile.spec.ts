import { expect, test } from '@playwright/test';

test.describe('Potfile Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close the Potfile modal', async ({ page }) => {
    // Mock potfile content
    await page.route('/api/potfile', async (route) => {
       await route.fulfill({ json: { content: '5f4dcc3b5aa765d61d8327deb882cf99:password' } });
    });

    const potfileButton = page.getByRole('button', { name: 'View Potfile' });
    await potfileButton.click();
    await expect(page.getByRole('heading', { name: 'Potfile Contents' })).toBeVisible();
    await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99:password')).toBeVisible();

    // Close using the X button
    const closeButton = page
      .locator('button')
      .filter({ has: page.locator('svg path[d="M6 18L18 6M6 6l12 12"]') })
      .first();
    await closeButton.click();
    await expect(page.getByRole('heading', { name: 'Potfile Contents' })).not.toBeVisible();
  });

  test('should show empty state', async ({ page }) => {
    await page.route('/api/potfile', async (route) => {
       await route.fulfill({ json: { content: '' } });
    });
    
    await page.getByRole('button', { name: 'View Potfile' }).click();
    await expect(page.getByText('No content in potfile yet.')).toBeVisible();
  });
});
