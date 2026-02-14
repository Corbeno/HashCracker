import { expect, Page } from '@playwright/test';

const dropdownTriggerTestId = (base: string) => `${base}-trigger`;
const dropdownSearchTestId = (base: string) => `${base}-search`;

export function yoinkModal(page: Page) {
  return page.getByTestId('yoink-modal');
}

export async function openYoink(page: Page) {
  await page.getByTestId('open-yoink').click();
  await expect(yoinkModal(page)).toBeVisible();
}

export async function closeYoink(page: Page) {
  await yoinkModal(page).getByTestId('yoink-close').click();
  await expect(yoinkModal(page)).toBeHidden();
}

export async function selectYoinkHashType(page: Page, hashTypeId: number) {
  await yoinkModal(page).getByTestId(dropdownTriggerTestId('yoink-hash-type')).click();
  await page.getByTestId(dropdownSearchTestId('yoink-hash-type')).fill(String(hashTypeId));
  await page.locator(`#dropdown-option-${hashTypeId}`).click();
}

export async function setYoinkInput(page: Page, text: string) {
  await yoinkModal(page).getByTestId('yoink-input').fill(text);
}

export function yoinkOutput(page: Page) {
  return yoinkModal(page).getByTestId('yoink-output');
}

export async function useUncrackedHashes(page: Page) {
  await yoinkModal(page).getByTestId('yoink-use-uncracked').click();
}
