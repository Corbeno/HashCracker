import { expect, test } from '@playwright/test';

import {
  crackedHashesTbody,
  selectAttackMode,
  selectHashType as selectCrackerHashType,
  startCracking,
  waitForJobVisible,
} from './utils/cracker';
import { gotoCracker } from './utils/navigation';
import {
  createVaultTab,
  deleteAllE2ETabs,
  editTextCell,
  expectQueueCrackJobsModalOpen,
  expectQueueCrackJobsSummary,
  expectGridReady,
  getVaultTabLabels,
  gotoVault,
  gridCellByRowIndex,
  gridRowByIndex,
  moveTabAfter,
  moveTabLeft,
  moveTabRight,
  queueCrackJobsAndWait,
  selectQueueCrackAttackMode,
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

  test('keeps Shared first and supports moving tabs', async ({ page }) => {
    const alpha = `E2E-Alpha-${Date.now()}`;
    const bravo = `E2E-Bravo-${Date.now()}`;
    const charlie = `E2E-Charlie-${Date.now()}`;

    await createVaultTab(page, alpha);
    await createVaultTab(page, bravo);
    await createVaultTab(page, charlie);

    await expect.poll(async () => (await getVaultTabLabels(page))[0]).toBe('Shared');

    const initialLabels = await getVaultTabLabels(page);
    const alphaInitialIndex = initialLabels.indexOf(alpha);
    const bravoInitialIndex = initialLabels.indexOf(bravo);
    const charlieInitialIndex = initialLabels.indexOf(charlie);
    expect(alphaInitialIndex).toBeGreaterThanOrEqual(0);
    expect(bravoInitialIndex).toBeGreaterThan(alphaInitialIndex);
    expect(charlieInitialIndex).toBeGreaterThan(bravoInitialIndex);

    await moveTabLeft(page, bravo);
    const movedLeftLabels = await getVaultTabLabels(page);
    expect(movedLeftLabels.indexOf(bravo)).toBeLessThan(movedLeftLabels.indexOf(alpha));

    await moveTabRight(page, bravo);
    const movedRightLabels = await getVaultTabLabels(page);
    expect(movedRightLabels.indexOf(alpha)).toBeLessThan(movedRightLabels.indexOf(bravo));

    await moveTabAfter(page, charlie, alpha);
    const movedAfterLabels = await getVaultTabLabels(page);
    const alphaAfterIndex = movedAfterLabels.indexOf(alpha);
    expect(movedAfterLabels.indexOf(charlie)).toBe(alphaAfterIndex + 1);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Credential Vault' })).toBeVisible();
    await expect.poll(async () => (await getVaultTabLabels(page))[0]).toBe('Shared');

    const reloadedLabels = await getVaultTabLabels(page);
    const alphaReloadIndex = reloadedLabels.indexOf(alpha);
    expect(alphaReloadIndex).toBeGreaterThanOrEqual(0);
    expect(reloadedLabels.indexOf(charlie)).toBe(alphaReloadIndex + 1);
  });

  test('edits a row, sets hash type, auto-appends, and persists after reload', async ({ page }) => {
    const username = `alice-${Date.now()}`;
    const password = 'hunter2';
    const hash = '8846f7eaee8fb117ad06bdd830b7586c';
    const notes = 'Cracked during engagement';

    await editTextCell(page, 0, 'username', username);
    await editTextCell(page, 0, 'password', password);
    await editTextCell(page, 0, 'hash', hash);
    await setHashType(page, 0, 1000);
    await editTextCell(page, 0, 'notes', notes);

    // Auto-append should create a second row after editing the last row.
    await expect(gridRowByIndex(page, 1)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Credential Vault' })).toBeVisible();
    await expectGridReady(page);

    await expect(gridCellByRowIndex(page, 0, 'username')).toContainText(username);
    await expect(gridCellByRowIndex(page, 0, 'password')).toContainText(password);
    await expect(gridCellByRowIndex(page, 0, 'hash')).toContainText(hash);
    await expect(gridCellByRowIndex(page, 0, 'hashType')).toContainText('1000');
    await expect(gridCellByRowIndex(page, 0, 'notes')).toContainText(notes);
  });

  test('autofills password from cracked table when hash and hash type are both known', async ({
    page,
  }) => {
    const hash = '5f4dcc3b5aa765d61d8327deb882cf99';
    const username = `vault-autofill-${Date.now()}`;

    await gotoCracker(page);
    await selectCrackerHashType(page, 0);
    await selectAttackMode(page, 'rockyou');
    await startCracking(page, hash);
    await expect(crackedHashesTbody(page)).toContainText(hash, { timeout: 60000 });
    await expect(crackedHashesTbody(page)).toContainText('password', { timeout: 60000 });

    await gotoVault(page);
    await expectGridReady(page);

    await editTextCell(page, 0, 'username', username);
    await editTextCell(page, 0, 'hash', hash);
    await setHashType(page, 0, 0);

    await expect(gridCellByRowIndex(page, 0, 'password')).toContainText('password');
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

  test('queues selected vault rows as grouped crack jobs', async ({ page }) => {
    const firstHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const secondHash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    await editTextCell(page, 0, 'username', `queue-one-${Date.now()}`);
    await editTextCell(page, 0, 'hash', firstHash);
    await setHashType(page, 0, 0);

    await expect(gridRowByIndex(page, 1)).toBeVisible();
    await editTextCell(page, 1, 'username', `queue-two-${Date.now()}`);
    await editTextCell(page, 1, 'hash', secondHash);
    await setHashType(page, 1, 0);

    await selectRowCheckbox(page, 0);
    await selectRowCheckbox(page, 1);

    await page.getByRole('button', { name: 'Crack Selected' }).click();
    await expectQueueCrackJobsModalOpen(page);
    await expectQueueCrackJobsSummary(page, { jobs: 1, rows: 2, uniqueHashes: 2 });
    await selectQueueCrackAttackMode(page, 'rockyou', /RockYou/i);
    const { payload, response } = await queueCrackJobsAndWait(page);

    expect(payload.mode).toBe('rockyou');
    expect(payload.type).toBe(0);
    expect([...payload.hashes].sort()).toEqual([firstHash, secondHash].sort());
    expect(response.ok()).toBeTruthy();

    await expect(
      page.getByText('Queued 1 job. Open Hash Cracker to monitor progress.')
    ).toBeVisible();

    await gotoCracker(page);
    const queuedJobCard = await waitForJobVisible(page, firstHash);
    await expect(queuedJobCard).toContainText(secondHash);
    await expect(queuedJobCard.getByText('Type: MD5')).toBeVisible();
    await expect(queuedJobCard.getByText('Mode: RockYou')).toBeVisible();
  });

  test('copies only selected rows from the floating action bar', async ({ page }) => {
    const rowOne = {
      username: `copy-ignore-${Date.now()}`,
      password: 'ignore-pass',
      hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const rowTwo = {
      username: `copy-keep-${Date.now()}`,
      password: 'keep-pass',
      hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    };

    await editTextCell(page, 0, 'username', rowOne.username);
    await editTextCell(page, 0, 'password', rowOne.password);
    await editTextCell(page, 0, 'hash', rowOne.hash);

    await expect(gridRowByIndex(page, 1)).toBeVisible();
    await editTextCell(page, 1, 'username', rowTwo.username);
    await editTextCell(page, 1, 'password', rowTwo.password);
    await editTextCell(page, 1, 'hash', rowTwo.hash);

    const copyButton = page.getByRole('button', { name: 'Copy selected credentials' });
    await expect(copyButton).toBeHidden();

    await selectRowCheckbox(page, 1);
    await expect(copyButton).toBeVisible();

    await page.evaluate(() => {
      let copiedText = '';
      Object.defineProperty(window, '__e2eCopiedText', {
        configurable: true,
        get: () => copiedText,
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            copiedText = text;
          },
        },
      });
    });

    await copyButton.click();
    await expect(page.getByText('Copied 1 credential to clipboard.')).toBeVisible();

    const copiedText = await page.evaluate(
      () => (window as { __e2eCopiedText?: string }).__e2eCopiedText
    );
    expect(copiedText).toBe(`${rowTwo.username}\t\t${rowTwo.password}\t\t${rowTwo.hash}`);
    expect(copiedText).not.toContain(rowOne.username);

    await selectRowCheckbox(page, 0);
    await expect(page.getByText('2 selected')).toBeVisible();
    await copyButton.click();
    await expect(page.getByText('Copied 2 credentials to clipboard.')).toBeVisible();

    const copiedTwoRows = await page.evaluate(
      () => (window as { __e2eCopiedText?: string }).__e2eCopiedText
    );
    const expectedTwoRows = [
      `${rowTwo.username}\t\t${rowTwo.password}\t\t${rowTwo.hash}`,
      `${rowOne.username}\t\t${rowOne.password}\t\t${rowOne.hash}`,
    ].join('\n');
    expect(copiedTwoRows).toBe(expectedTwoRows);
    expect(copiedTwoRows?.split('\n')).toHaveLength(2);
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

  test('imports additional secretsdump formats (status and cached domain)', async ({ page }) => {
    const domainUsername = `john-${Date.now()}`;
    const domainUser = `OFFSEC\\${domainUsername}`;
    const localUser = `local-${Date.now()}`;
    const cachedUser = `cached-${Date.now()}`;
    const ntlmOne = '97f2592347d8fbe42be381726ff9ea83';
    const ntlmTwo = '31d6cfe0d16ae931b73c59d7e0c089c0';
    const cachedHash = '8f4b9a2e89f4966c5b56b7f97f1b52fd';

    await page.getByRole('button', { name: 'Log Import' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toBeVisible();

    const rawLog = [
      `${domainUser}:1107:aad3b435b51404eeaad3b435b51404ee:${ntlmOne}::: (status=Enabled)`,
      `${localUser}:501:aad3b435b51404eeaad3b435b51404ee:${ntlmTwo}:::`,
      `OFFSEC/${cachedUser}:${cachedHash}`,
    ].join('\n');

    await page.locator('#log-import-raw').fill(rawLog);
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.getByText('Parsed: 3')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toHaveCount(0);

    await expect(page.locator('.ag-center-cols-container')).toContainText(domainUsername);
    await expect(page.locator('.ag-center-cols-container')).toContainText(localUser);
    await expect(page.locator('.ag-center-cols-container')).toContainText(cachedUser);
    await expect(page.locator('.ag-center-cols-container')).toContainText(ntlmOne);
    await expect(page.locator('.ag-center-cols-container')).toContainText(cachedHash);
  });

  test('imports mimikatz log with both NTLM and plaintext passwords', async ({ page }) => {
    const adminUser = `mimi-admin-${Date.now()}`;
    const passwordOnlyUser = `mimi-user-${Date.now()}`;
    const adminHash = 'e52cac67419a9a22ecb08369099ed302';
    const adminPassword = 'vagrant!';
    const secondPassword = 'Passw0rd!';

    await page.getByRole('button', { name: 'Log Import' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toBeVisible();
    await page.locator('#log-import-type').selectOption('mimikatz');

    const rawLog = [
      'mimikatz # sekurlsa::logonpasswords',
      '',
      `User Name         : ${adminUser}`,
      'Domain            : LAB',
      'msv :',
      ' [00000003] Primary',
      ` * Username : ${adminUser}`,
      ' * Domain   : LAB',
      ` * NTLM     : ${adminHash}`,
      'tspkg :',
      ` * Username : ${adminUser}`,
      ' * Domain   : LAB',
      ` * Password : ${adminPassword}`,
      'wdigest :',
      ` * Username : ${adminUser}`,
      ' * Domain   : LAB',
      ' * Password : (null)',
      'kerberos :',
      ` * Username : ${passwordOnlyUser}`,
      ' * Domain   : LAB',
      ` * Password : ${secondPassword}`,
    ].join('\n');

    await page.locator('#log-import-raw').fill(rawLog);
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.getByText('Parsed: 2')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toHaveCount(0);

    await expect(page.locator('.ag-center-cols-container')).toContainText(adminUser);
    await expect(page.locator('.ag-center-cols-container')).toContainText(adminHash);
    await expect(page.locator('.ag-center-cols-container')).toContainText(adminPassword);
    await expect(page.locator('.ag-center-cols-container')).toContainText(passwordOnlyUser);
    await expect(page.locator('.ag-center-cols-container')).toContainText(secondPassword);
  });

  test('imports generic username/password formats', async ({ page }) => {
    const userColon = `generic-colon-${Date.now()}`;
    const userDash = `generic-dash-${Date.now()}`;
    const userSpace = `generic-space-${Date.now()}`;

    await page.getByRole('button', { name: 'Log Import' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toBeVisible();
    await page.locator('#log-import-type').selectOption('generic');

    const rawLog = [
      `${userColon}:P@ssw0rd123`,
      `${userDash} - Winter2026!`,
      `${userSpace} springtime!`,
      '# comment line should be ignored',
    ].join('\n');

    await page.locator('#log-import-raw').fill(rawLog);
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.getByText('Parsed: 3')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toHaveCount(0);

    await expect(page.locator('.ag-center-cols-container')).toContainText(userColon);
    await expect(page.locator('.ag-center-cols-container')).toContainText('P@ssw0rd123');
    await expect(page.locator('.ag-center-cols-container')).toContainText(userDash);
    await expect(page.locator('.ag-center-cols-container')).toContainText('Winter2026!');
    await expect(page.locator('.ag-center-cols-container')).toContainText(userSpace);
    await expect(page.locator('.ag-center-cols-container')).toContainText('springtime!');
  });

  test('routes shared-username imports to Shared unless hash conflicts', async ({ page }) => {
    const sourceTabName = `E2E-Import-${Date.now()}`;
    const sharedUsername = `shareduser${Date.now()}`;
    const sharedHash = '8846f7eaee8fb117ad06bdd830b7586c';
    const conflictingHash = '5f4dcc3b5aa765d61d8327deb882cf99';

    await createVaultTab(page, sourceTabName);

    await page.getByRole('button', { name: 'Shared', exact: true }).click();
    await page.getByRole('button', { name: 'Log Import' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toBeVisible();
    await page
      .locator('#log-import-raw')
      .fill(`${sharedUsername}:500:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:${sharedHash}:::`);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByText(/Parsed: 1/)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: sourceTabName, exact: true }).click();
    await page.getByRole('button', { name: 'Log Import' }).click();
    await expect(page.getByRole('heading', { name: 'Log Import' })).toBeVisible();

    const rawLog = [
      `${sharedUsername}:500:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:${sharedHash}:::`,
      `${sharedUsername}:500:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:${conflictingHash}:::`,
    ].join('\n');

    await page.locator('#log-import-raw').fill(rawLog);
    const importResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/log-import') && response.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    const importResponse = await importResponsePromise;
    const importPayload = (await importResponse.json()) as {
      result?: {
        parsedCount?: number;
        sharedCount?: number;
      };
    };

    expect(importPayload.result?.parsedCount).toBe(2);
    expect(importPayload.result?.sharedCount).toBe(1);

    await expect(page.getByText(/Parsed: 2/)).toBeVisible();
    await expect(page.getByText(/Shared:/)).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page.locator('.ag-center-cols-container')).toContainText(sharedUsername);
    await expect(page.locator('.ag-center-cols-container')).toContainText(conflictingHash);

    await page.getByRole('button', { name: 'Shared', exact: true }).click();
    await expect(page.locator('.ag-center-cols-container')).toContainText(sharedUsername);
    await expect(page.locator('.ag-center-cols-container')).toContainText(sharedHash);
    await expect(page.locator('.ag-center-cols-container')).not.toContainText(conflictingHash);
  });
});
