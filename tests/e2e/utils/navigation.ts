import { expect, Page } from '@playwright/test';

export async function gotoCracker(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('hash-input')).toBeVisible();
}
