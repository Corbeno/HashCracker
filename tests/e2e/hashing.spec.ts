import { expect, test } from '@playwright/test';

test.describe('Hashing Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Default empty state
        await page.route('/api/state', async (route) => {
            await route.fulfill({ json: { jobs: [], crackedHashes: [], potfileContent: '' } });
        });
        await page.route('/api/events', async (route) => {
             // Mock an open connection that sends nothing or closes immediately
             // Ideally we'd keep it open but closing is fine, client will retry
             await route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' });
        });
        await page.goto('/');
    });

  test('should validate empty input', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Cracking' }).click();
    await expect(page.getByText('Please enter at least one hash')).toBeVisible();
  });

  test('should submit start cracking request', async ({ page }) => {
    // Mock crack API
    let requestBody: any;
    await page.route('/api/crack', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ json: { success: true, jobId: 'job-123' } });
    });

    // Fill input
    await page.locator('#hash-input').fill('5f4dcc3b5aa765d61d8327deb882cf99');
    
    // Select hash type (default is MD5 0, but let's be explicit)
    // The dropdown might default to 0. 
    // Let's verify we can change it to NTLM (id 1000)
    // IMPORTANT: The UI loads hash types from config, so we assume client config has these.
    // The HashInputForm uses `config.hashcat.hashTypes`.
    // We cannot mock the config file easily as it is imported. 
    // We'll proceed assuming default config or just select item by text if present.
    // We'll stick to default MD5 for simplicity or check if dropdown works.
    
    await page.getByRole('button', { name: 'Start Cracking' }).click();

    // Verify request
    expect(requestBody).toBeTruthy();
    expect(requestBody.hashes).toEqual(['5f4dcc3b5aa765d61d8327deb882cf99']);
    expect(requestBody.type).toBe(0); // Default
    expect(requestBody.mode).toBe('rockyou'); // Default

    // Verify input cleared
    await expect(page.locator('#hash-input')).toBeEmpty();
  });

  test('should display active jobs from state', async ({ page }) => {
     // Mock state with a running job
     const runningJob = {
        id: 'job-123',
        startTime: Date.now(),
        status: 'running',
        type: { name: 'MD5', id: 0 },
        mode: { name: 'Brute Force', id: 'brute' },
        hashes: ['hash1'],
        debugInfo: {
            statusJson: {
                progress: [50, 100],
                estimated_stop: Date.now() + 10000
            }
        }
     };

     await page.route('/api/state', async (route) => {
        await route.fulfill({ json: { jobs: [runningJob], crackedHashes: [], potfileContent: '' } });
     });
     
     await page.reload();

     await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible();
     await expect(page.getByText('Running')).toBeVisible();
     await expect(page.getByText('Type: MD5')).toBeVisible();
     await expect(page.getByText('hash1')).toBeVisible();
  });

  test('should display cracked hashes from state', async ({ page }) => {
      // Mock state with cracked hashes
       const cracked = [
          { hash: '5f4dcc3b5aa765d61d8327deb882cf99', password: 'password', isCaseSensitive: false }
       ];
  
       await page.route('/api/state', async (route) => {
          await route.fulfill({ json: { jobs: [], crackedHashes: cracked, potfileContent: '' } });
       });
       
       await page.reload();
  
       await expect(page.getByRole('heading', { name: 'Cracked Hashes' })).toBeVisible();
       await expect(page.getByText('5f4dcc3b5aa765d61d8327deb882cf99:password')).toBeVisible();
  });
});
