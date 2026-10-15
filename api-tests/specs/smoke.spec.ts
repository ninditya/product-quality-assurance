import { test, expect } from '@playwright/test';

// Read-only check that the API under test answers with product data. Changes no data.
test('SMOKE-API GET /products returns 200 with products', { tag: '@smoke' }, async ({ request }) => {
  const response = await request.get('/products');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.length).toBeGreaterThan(0);
});
