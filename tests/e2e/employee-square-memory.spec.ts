import { expect, test } from '@playwright/test';

test('loads the memory deep-link route without triggering the error boundary in browser preview', async ({ page }) => {
  await page.goto('/agents/main?tab=memory', { waitUntil: 'commit' });

  await expect(page.locator('#root')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);
});
