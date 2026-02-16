import { expect, test } from '@playwright/test';

import {
  createVaultTab,
  deleteAllE2ETabs,
  editTextCell,
  expectGridReady,
  gotoVault,
  gridCellByRowIndex,
  gridRowByIndex,
  selectRowCheckbox,
  setHashType,
} from './utils/vault';

test.describe('Credential Vault', () => {
  test.beforeEach(async ({ page }) => {
    await gotoVault(page);
    await deleteAllE2ETabs(page);
    await createVaultTab(page);
    await expectGridReady(page);
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup; keep this UI-only per project constraints.
    await gotoVault(page);
    await deleteAllE2ETabs(page);
  });

  test('loads vault and shows core controls', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Credential Vault' })).toBeVisible();
    await expect(page.getByPlaceholder('Search all columns...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Row' })).toBeVisible();
  });

  test('edits a row, sets hash type, auto-appends, and persists after reload', async ({ page }) => {
    const username = `alice-${Date.now()}`;
    const password = 'hunter2';
    const hash = '8846f7eaee8fb117ad06bdd830b7586c';
    const device = 'VM-01';

    await editTextCell(page, 0, 'username', username);
    await editTextCell(page, 0, 'password', password);
    await editTextCell(page, 0, 'hash', hash);
    await setHashType(page, 0, 1000);
    await editTextCell(page, 0, 'device', device);

    // Auto-append should create a second row after editing the last row.
    await expect(gridRowByIndex(page, 1)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Credential Vault' })).toBeVisible();
    await expectGridReady(page);

    await expect(gridCellByRowIndex(page, 0, 'username')).toContainText(username);
    await expect(gridCellByRowIndex(page, 0, 'password')).toContainText(password);
    await expect(gridCellByRowIndex(page, 0, 'hash')).toContainText(hash);
    await expect(gridCellByRowIndex(page, 0, 'hashType')).toContainText('1000');
    await expect(gridCellByRowIndex(page, 0, 'device')).toContainText(device);
  });

  test('selects and deletes a row using the bottom action bar', async ({ page }) => {
    const marker = `delete-me-${Date.now()}`;

    // Make sure we have content + an appended row.
    await editTextCell(page, 0, 'username', marker);
    await expect(gridRowByIndex(page, 1)).toBeVisible();

    await selectRowCheckbox(page, 0);
    await expect(page.getByText('1 selected')).toBeVisible();

    await page.getByRole('button', { name: 'Delete Selected' }).click();
    await expect(page.getByText('1 selected')).toBeHidden();
    await expect(page.locator('.ag-center-cols-container')).not.toContainText(marker);
  });

  test('imports credentials from an impacket NTLM log', async ({ page }) => {
    await page.getByRole('button', { name: 'Log Import' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toBeVisible();

    const rawLog = [
      'Administrator:500:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:8846f7eaee8fb117ad06bdd830b7586c:::',
      'bob:1001:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:5f4dcc3b5aa765d61d8327deb882cf99:::',
    ].join('\n');

    await page.locator('#log-import-raw').fill(rawLog);
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.getByText('Parsed: 2')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toHaveCount(0);

    await expect(page.locator('.ag-center-cols-container')).toContainText('Administrator');
    await expect(page.locator('.ag-center-cols-container')).toContainText('bob');
    await expect(page.locator('.ag-center-cols-container')).toContainText(
      '8846f7eaee8fb117ad06bdd830b7586c'
    );
  });
});
