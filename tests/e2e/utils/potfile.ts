import { expect, Page } from '@playwright/test';

export function potfileModal(page: Page) {
  return page.getByTestId('potfile-modal');
}

export async function openPotfile(page: Page) {
  await page.getByTestId('open-potfile').click();
  await expect(potfileModal(page)).toBeVisible();
}

export async function closePotfile(page: Page) {
  await potfileModal(page).getByTestId('potfile-close').click();
  await expect(potfileModal(page)).toBeHidden();
}

export function potfileContent(page: Page) {
  return potfileModal(page).getByTestId('potfile-content');
}
