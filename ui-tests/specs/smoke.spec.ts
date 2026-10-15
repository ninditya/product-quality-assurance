import { test, expect } from '@playwright/test';

// Read-only check that the UI under test is reachable and shows products. Changes no data.
test('SMOKE-UI the home page lists product cards', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-name').first()).toBeVisible();
});
