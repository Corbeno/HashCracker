import { expect, Locator, Page } from '@playwright/test';

const dropdownTriggerTestId = (base: string) => `${base}-trigger`;
const dropdownSearchTestId = (base: string) => `${base}-search`;

export function hashInput(page: Page) {
  return page.getByTestId('hash-input');
}

export async function startCracking(page: Page, hashes: string | string[]) {
  const value = Array.isArray(hashes) ? hashes.join('\n') : hashes;
  await hashInput(page).fill(value);
  await page.getByTestId('start-cracking').click();
}

export async function openYoink(page: Page) {
  await page.getByTestId('open-yoink').click();
  await expect(page.getByTestId('yoink-modal')).toBeVisible();
}

export async function openBenchmark(page: Page) {
  await page.getByTestId('open-benchmark').click();
  await expect(page.getByTestId('benchmark-modal')).toBeVisible();
}

export async function selectHashType(page: Page, hashTypeId: number) {
  await page.getByTestId(dropdownTriggerTestId('hash-type-dropdown')).click();
  await page.getByTestId(dropdownSearchTestId('hash-type-dropdown')).fill(String(hashTypeId));
  await page.locator(`#dropdown-option-${hashTypeId}`).click();
}

export async function selectAttackMode(page: Page, searchTerm: string) {
  await page.getByTestId(dropdownTriggerTestId('attack-mode-dropdown')).click();
  await page.getByTestId(dropdownSearchTestId('attack-mode-dropdown')).fill(searchTerm);
  // First matching option after filtering.
  await page.getByRole('option').first().click();
}

export async function selectAttackModeById(page: Page, modeId: string) {
  await page.getByTestId(dropdownTriggerTestId('attack-mode-dropdown')).click();
  await page.getByTestId(dropdownSearchTestId('attack-mode-dropdown')).fill(modeId);
  await page.locator(`#dropdown-option-${modeId}`).click();
}

export function activeJobsPanel(page: Page) {
  return page.getByTestId('active-jobs-panel');
}

export function crackedHashesPanel(page: Page) {
  return page.getByTestId('cracked-hashes-panel');
}

export function crackedHashesTbody(page: Page) {
  return page.getByTestId('cracked-hashes-tbody');
}

export function jobCards(page: Page) {
  return page.getByTestId('job-card');
}

export function jobCardByHash(page: Page, hash: string) {
  return jobCards(page).filter({ hasText: hash }).first();
}

export async function waitForJobVisible(page: Page, hash: string) {
  const card = jobCardByHash(page, hash);
  await expect(card).toBeVisible();
  return card;
}

export async function openJobDetails(jobCard: Locator) {
  const toggle = jobCard.getByTestId('job-toggle-details');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toContainText('Hide Details');
}

export async function cancelJob(page: Page, jobCard: Locator) {
  const cancelButton = jobCard.getByTestId('job-cancel');
  await expect(cancelButton).toBeVisible();

  const [cancelResponse] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/crack?jobId=') && r.request().method() === 'DELETE'
    ),
    cancelButton.click(),
  ]);
  expect(cancelResponse.ok()).toBeTruthy();
}
