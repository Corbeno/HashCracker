import { expect, Locator, Page, Request, Response } from '@playwright/test';

function uniqueName(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${stamp}-${rand}`;
}

export async function gotoVault(page: Page) {
  await page.goto('/vault');
  await expect(page.getByRole('heading', { name: 'Credential Vault' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Add Row' })).toBeVisible();
}

function waitForVaultPost(page: Page) {
  return page.waitForResponse(
    response =>
      response.url().includes('/api/credential-vault') && response.request().method() === 'POST',
    { timeout: 15000 }
  );
}

function vaultTabStrip(page: Page): Locator {
  return page.getByTestId('vault-tab-strip');
}

export async function createVaultTab(page: Page, name?: string): Promise<string> {
  const tabName = name ?? uniqueName('E2E-');

  await page.getByTestId('vault-tab-add').click();
  const input = page.locator('input[aria-label="New tab name"]');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(tabName);

  const vaultPost = waitForVaultPost(page);
  await input.press('Enter');
  await vaultPost;

  const strip = vaultTabStrip(page);
  const tabButton = strip.getByRole('button', { name: tabName, exact: true });
  await expect(tabButton).toBeVisible();
  await tabButton.click();
  return tabName;
}

export async function openTabContextMenu(page: Page, tabName: string) {
  const strip = vaultTabStrip(page);
  const tabButton = strip.getByRole('button', { name: tabName, exact: true });
  await expect(tabButton).toBeVisible();
  await tabButton.click({ button: 'right' });
  await expect(page.getByRole('button', { name: 'Move Tab After', exact: true })).toBeVisible();
}

export async function getVaultTabLabels(page: Page): Promise<string[]> {
  const labels = await page
    .locator(
      '[data-testid^="vault-tab-"]:not([data-testid="vault-tab-strip"]):not([data-testid="vault-tab-add"])'
    )
    .allTextContents();
  return labels.map(text => text.trim()).filter(text => text.length > 0 && text !== '+');
}

export async function moveTabLeft(page: Page, tabName: string) {
  await openTabContextMenu(page, tabName);
  const moveLeft = page.getByRole('button', { name: 'Move Left', exact: true });
  await expect(moveLeft).toBeVisible();
  const vaultPost = waitForVaultPost(page);
  await moveLeft.click();
  await vaultPost;
}

export async function moveTabRight(page: Page, tabName: string) {
  await openTabContextMenu(page, tabName);
  const moveRight = page.getByRole('button', { name: 'Move Right', exact: true });
  await expect(moveRight).toBeVisible();
  const vaultPost = waitForVaultPost(page);
  await moveRight.click();
  await vaultPost;
}

export async function moveTabAfter(page: Page, tabName: string, afterTabName: string) {
  await openTabContextMenu(page, tabName);
  await page.getByRole('button', { name: 'Move Tab After', exact: true }).click();

  const strip = vaultTabStrip(page);
  const destinationTab = strip.getByRole('button', { name: afterTabName, exact: true });
  await expect(destinationTab).toBeVisible();

  const vaultPost = waitForVaultPost(page);
  await destinationTab.click();
  await vaultPost;
}

export async function renameTab(page: Page, tabName: string, newName: string): Promise<string> {
  await openTabContextMenu(page, tabName);
  await page.getByRole('button', { name: 'Rename Tab', exact: true }).click();

  const input = page.locator('input[aria-label="Rename tab"]');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(newName);

  const vaultPost = waitForVaultPost(page);
  await input.press('Enter');
  await vaultPost;

  const strip = vaultTabStrip(page);
  await expect(strip.getByRole('button', { name: newName, exact: true })).toBeVisible();
  return newName;
}

export async function deleteTab(page: Page, tabName: string): Promise<boolean> {
  await openTabContextMenu(page, tabName);
  const deleteButton = page.getByRole('button', { name: 'Delete Tab', exact: true });
  await expect(deleteButton).toBeVisible();

  if (await deleteButton.isDisabled()) {
    await page.keyboard.press('Escape');
    return false;
  }

  const vaultPost = waitForVaultPost(page);
  await deleteButton.click();
  await vaultPost;
  await expect(vaultTabStrip(page).getByRole('button', { name: tabName, exact: true })).toHaveCount(
    0
  );
  return true;
}

export async function clickAddRow(page: Page) {
  const vaultPost = waitForVaultPost(page);
  await page.getByRole('button', { name: '+ Add Row', exact: true }).click();
  await vaultPost;
}

export async function deleteAllE2ETabs(page: Page, prefix = 'E2E-') {
  const strip = vaultTabStrip(page);

  // Collect visible tab labels (excluding the "+" button).
  const buttons = strip.locator('button');
  const labels = (await buttons.allTextContents())
    .map(text => text.trim())
    .filter(text => text.length > 0 && text !== '+');

  const e2eTabs = labels.filter(label => label.startsWith(prefix));
  if (e2eTabs.length === 0) return;

  // If deletion is disabled because there's only one tab, create a baseline tab first.
  const deleteOk = await deleteTab(page, e2eTabs[0]);
  if (!deleteOk) {
    await createVaultTab(page, uniqueName('Baseline-'));
  }

  // Re-scan and delete all E2E tabs.
  const nextLabels = (await strip.locator('button').allTextContents())
    .map(text => text.trim())
    .filter(text => text.length > 0 && text !== '+');
  const nextE2eTabs = nextLabels.filter(label => label.startsWith(prefix));

  for (const tab of nextE2eTabs) {
    // Best-effort: keep trying, but avoid infinite loops.
    const deleted = await deleteTab(page, tab);
    if (!deleted) {
      // If we still can't delete, stop.
      break;
    }
  }
}

function gridRoot(page: Page): Locator {
  return page.locator('.ag-root');
}

export async function expectGridReady(page: Page) {
  await expect(gridRoot(page)).toBeVisible();
}

export function gridRowByIndex(page: Page, rowIndex: number): Locator {
  return page.locator(`.ag-center-cols-container .ag-row[row-index="${rowIndex}"]`).first();
}

export function gridCellByRowIndex(page: Page, rowIndex: number, colId: string): Locator {
  return gridRowByIndex(page, rowIndex).locator(`[col-id="${colId}"]`).first();
}

export async function editTextCell(page: Page, rowIndex: number, colId: string, value: string) {
  const cell = gridCellByRowIndex(page, rowIndex, colId);
  await expect(cell).toBeVisible();
  await cell.click();

  const editor = page.locator('.ag-cell-inline-editing input, .ag-cell-inline-editing textarea');
  await expect(editor.first()).toBeVisible();
  await editor.first().fill(value);

  const vaultPost = waitForVaultPost(page);
  await editor.first().press('Enter');
  await vaultPost;

  await expect(page.locator('.ag-cell-inline-editing')).toHaveCount(0);
  await expect(cell).toContainText(value);
}

export async function setHashType(page: Page, rowIndex: number, hashTypeId: number) {
  const cell = gridCellByRowIndex(page, rowIndex, 'hashType');
  await expect(cell).toBeVisible();
  await cell.click();

  const search = page.locator('input[data-searchable-dropdown-search="true"]').first();
  await expect(search).toBeVisible();
  await search.fill(String(hashTypeId));

  // The dropdown assigns ids like #dropdown-option-1000.
  const vaultPost = waitForVaultPost(page);
  await page.locator(`#dropdown-option-${hashTypeId}`).click();
  await vaultPost;

  // Cell should now render the human label (e.g. "1000 - NTLM").
  await expect(cell).toContainText(String(hashTypeId));
}

export async function selectRowCheckbox(page: Page, rowIndex: number) {
  const row = gridRowByIndex(page, rowIndex);
  await expect(row).toBeVisible();

  const checkboxInput = row.locator('input[type="checkbox"]').first();
  if (await checkboxInput.count()) {
    await checkboxInput.check();
    return;
  }

  const checkboxWrapper = row
    .locator('.ag-selection-checkbox, .ag-checkbox-input-wrapper, .ag-checkbox')
    .first();
  await expect(checkboxWrapper).toBeVisible();
  await checkboxWrapper.click();
}

export async function expectQueueCrackJobsModalOpen(page: Page) {
  await expect(page.getByRole('heading', { name: 'Queue Crack Jobs' })).toBeVisible();
}

export async function expectQueueCrackJobsSummary(
  page: Page,
  values: { jobs: number; rows: number; uniqueHashes: number }
) {
  await expect(
    page.getByText(
      new RegExp(
        `Jobs:\\s*${values.jobs}\\s*\\|\\s*Rows:\\s*${values.rows}\\s*\\|\\s*Unique hashes:\\s*${values.uniqueHashes}`
      )
    )
  ).toBeVisible();
}

export function queueCrackAttackModeTrigger(page: Page): Locator {
  return page
    .locator('label', { hasText: 'Attack Mode (applies to all jobs)' })
    .locator('xpath=following-sibling::div//input[@data-searchable-dropdown-trigger="true"]');
}

export async function selectQueueCrackAttackMode(page: Page, modeId: string, displayName: RegExp) {
  const trigger = queueCrackAttackModeTrigger(page);
  await trigger.click();
  await page.locator('input[data-searchable-dropdown-search="true"]:visible').fill(modeId);
  await page.locator(`#dropdown-option-${modeId}`).click();
  await expect(trigger).toHaveValue(displayName);
}

export interface QueueCrackRequestPayload {
  hashes: string[];
  mode: string;
  type: number;
}

export async function queueCrackJobsAndWait(page: Page): Promise<{
  payload: QueueCrackRequestPayload;
  request: Request;
  response: Response;
}> {
  const crackRequestPromise = page.waitForRequest(
    request => request.url().includes('/api/crack') && request.method() === 'POST',
    { timeout: 15000 }
  );
  const crackResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/crack') && response.request().method() === 'POST',
    { timeout: 15000 }
  );

  await page.getByRole('button', { name: 'Queue Jobs' }).click();

  const request = await crackRequestPromise;
  const response = await crackResponsePromise;
  const payload = request.postDataJSON() as QueueCrackRequestPayload;

  return { payload, request, response };
}
