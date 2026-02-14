import { expect, Page } from '@playwright/test';

const dropdownTriggerTestId = (base: string) => `${base}-trigger`;
const dropdownSearchTestId = (base: string) => `${base}-search`;

export async function mockBenchmarkApi(page: Page) {
  await page.route('**/api/benchmark*', async route => {
    const url = new URL(route.request().url());
    const hashTypeParam = url.searchParams.get('hashType');
    const requestedType = hashTypeParam != null ? Number(hashTypeParam) : null;

    const nameForType = (t: number) => {
      if (t === 0) return 'MD5';
      if (t === 1000) return 'NTLM';
      if (t === 100) return 'SHA1';
      return `Hash type ${t}`;
    };

    const results =
      requestedType != null && !Number.isNaN(requestedType)
        ? [
            {
              hashType: requestedType,
              hashName: nameForType(requestedType),
              speed: '123.45 MH/s',
              speedPerHash: 123_450_000,
              unit: 'MH/s',
            },
            {
              hashType: requestedType,
              hashName: nameForType(requestedType),
              speed: '120.01 MH/s',
              speedPerHash: 120_010_000,
              unit: 'MH/s',
            },
          ]
        : [
            {
              hashType: 0,
              hashName: 'MD5',
              speed: '123.45 MH/s',
              speedPerHash: 123_450_000,
              unit: 'MH/s',
            },
            {
              hashType: 1000,
              hashName: 'NTLM',
              speed: '98.76 MH/s',
              speedPerHash: 98_760_000,
              unit: 'MH/s',
            },
            {
              hashType: 100,
              hashName: 'SHA1',
              speed: '1.23 GH/s',
              speedPerHash: 1_230_000_000,
              unit: 'GH/s',
            },
          ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results }),
    });
  });
}

export function benchmarkModal(page: Page) {
  return page.getByTestId('benchmark-modal');
}

export async function openBenchmark(page: Page) {
  await page.getByTestId('open-benchmark').click();
  await expect(benchmarkModal(page)).toBeVisible();
}

export async function selectBenchmarkHashType(page: Page, hashTypeId: number) {
  await benchmarkModal(page).getByTestId(dropdownTriggerTestId('benchmark-hash-type')).click();
  await page.getByTestId(dropdownSearchTestId('benchmark-hash-type')).fill(String(hashTypeId));
  await page.locator(`#dropdown-option-${hashTypeId}`).click();
}

export async function runBenchmark(page: Page) {
  await benchmarkModal(page).getByTestId('benchmark-run').click();
}

export function benchmarkResultsTbody(page: Page) {
  return benchmarkModal(page).getByTestId('benchmark-results-tbody');
}
