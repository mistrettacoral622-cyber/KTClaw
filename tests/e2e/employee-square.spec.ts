import { expect, test } from '@playwright/test';

test('opens the Employee Square create sheet', async ({ page }) => {
  await page.goto('/agents', { waitUntil: 'commit' });

  await expect(page.locator('#root')).toBeVisible();
  const createButton = page.getByRole('button', { name: /Add Agent|添加 Agent/ });
  await expect(createButton).toBeVisible();

  await createButton.click();
  await expect(page.getByRole('button', { name: /Create Agent|创建 Agent/ })).toBeVisible();
  await expect(page.getByLabel(/Name|Agent 名称/)).toBeVisible();
});

test('shows the not-found fallback when a direct agent route is unavailable in browser preview', async ({ page }) => {
  await page.goto('/agents/main', { waitUntil: 'commit' });

  await expect(page.locator('#root')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agent not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to agents' })).toBeVisible();
});
