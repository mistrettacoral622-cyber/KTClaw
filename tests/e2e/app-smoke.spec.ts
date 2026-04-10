import { expect, test } from '@playwright/test';

test('loads the browser preview shell without triggering the error boundary', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#root')).toBeVisible();
  await expect(page.getByText(/加载中|鍔犺浇中/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);
});
