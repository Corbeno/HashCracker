import { expect, Page, test } from '@playwright/test';

import { gotoCracker } from './utils/navigation';

function visibleStatusLabel(page: Page) {
  return page.locator('span.text-sm.text-gray-400:visible').filter({
    hasText: /^(connected|disconnected)$/,
  });
}

async function getVisibleConnectionStatus(page: Page): Promise<string> {
  const label = visibleStatusLabel(page).first();
  await expect(label).toBeVisible();
  return ((await label.textContent()) ?? '').trim();
}

test.describe('Connection Status', () => {
  test('stays connected while switching between Hash Cracker and Credential Vault tabs', async ({
    page,
  }) => {
    let sseRequestCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/events')) {
        sseRequestCount += 1;
      }
    });

    await gotoCracker(page);

    await expect
      .poll(() => getVisibleConnectionStatus(page), {
        timeout: 15000,
      })
      .toBe('connected');

    const initialSseRequestCount = sseRequestCount;

    await page.getByRole('link', { name: 'Credential Vault', exact: true }).click();
    await expect(page).toHaveURL(/\/vault/);
    await expect(page.getByRole('heading', { name: 'Credential Vault' })).toBeVisible();

    await expect
      .poll(() => getVisibleConnectionStatus(page), {
        timeout: 15000,
      })
      .toBe('connected');
    await expect(visibleStatusLabel(page).filter({ hasText: /^disconnected$/ })).toHaveCount(0);
    expect(sseRequestCount).toBe(initialSseRequestCount);

    await page.getByRole('link', { name: 'Hash Cracker', exact: true }).click();
    await expect(page).toHaveURL(/\/cracker/);
    await expect(page.getByTestId('hash-input')).toBeVisible();

    await expect
      .poll(() => getVisibleConnectionStatus(page), {
        timeout: 15000,
      })
      .toBe('connected');
    await expect(visibleStatusLabel(page).filter({ hasText: /^disconnected$/ })).toHaveCount(0);
    expect(sseRequestCount).toBe(initialSseRequestCount);
  });
});
