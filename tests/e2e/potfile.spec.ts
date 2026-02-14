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

  test('should display potfile contents', async ({ page }) => {
    await openPotfile(page);

    // Wait for content to load (either empty message or actual content)
    await expect(potfileContent(page)).toBeVisible();
    await expect(potfileContent(page)).toContainText(/Loading\.|No content in potfile yet\.|:/);
  });
});
