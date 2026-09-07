import { expect, test } from '@playwright/test';

import { gotoCracker } from './utils/navigation';
import { closePotfile, openPotfile, potfileContent, potfileModal } from './utils/potfile';

test.describe('Potfile Modal', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCracker(page);
  });

  test('should open and close the Potfile modal', async ({ page }) => {
    await openPotfile(page);
    await expect(potfileModal(page)).toBeVisible();
    await closePotfile(page);
  });

  test('should fetch potfile contents only when the modal is opened', async ({ page }) => {
    let potfileRequestCount = 0;
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/potfile') {
        potfileRequestCount += 1;
      }
    });

    await page.reload();
    await expect(page.getByTestId('open-potfile')).toBeVisible();
    expect(potfileRequestCount).toBe(0);

    await openPotfile(page);
    await expect.poll(() => potfileRequestCount).toBeGreaterThan(0);
  });

  test('should display potfile contents', async ({ page }) => {
    await openPotfile(page);

    // Wait for content to load (either empty message or actual content)
    await expect(potfileContent(page)).toBeVisible();
    await expect(potfileContent(page)).toContainText(/Loading\.|No content in potfile yet\.|:/);
  });
});
