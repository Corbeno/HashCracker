import { expect, test } from '@playwright/test';

test.describe('Open crack API', () => {
  test('returns cracked hashes and preserves duplicate already-cracked inputs', async ({
    request,
  }) => {
    test.setTimeout(120000);

    const hash = '5f4dcc3b5aa765d61d8327deb882cf99';

    const firstResponse = await request.post('/api/open/crack', {
      data: {
        hashes: [hash],
        hashType: 0,
      },
    });

    expect(firstResponse.ok()).toBeTruthy();
    const firstPayload = await firstResponse.json();
    expect(firstPayload).toEqual({
      mode: 'smart',
      hashType: {
        id: 0,
        name: 'MD5',
      },
      crackedCount: 1,
      results: [
        {
          hash,
          password: 'password',
        },
      ],
    });

    const duplicateResponse = await request.post('/api/open/crack', {
      data: {
        hashes: [hash, hash],
        hashType: 0,
      },
    });

    expect(duplicateResponse.ok()).toBeTruthy();
    const duplicatePayload = await duplicateResponse.json();

    expect(duplicatePayload.crackedCount).toBe(2);
    expect(duplicatePayload.results).toEqual([
      {
        hash,
        password: 'password',
      },
      {
        hash,
        password: 'password',
      },
    ]);
  });
});
