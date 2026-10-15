import { test as base, expect } from '@playwright/test';
import { ProductApi, ReferenceApi } from './helpers/product-api';

interface ApiFixtures {
  api: ProductApi;
  reference: ReferenceApi;
}

export const test = base.extend<ApiFixtures>({
  // The API under test (API_BASE_URL from the "api" project).
  api: async ({ request }, use) => use(new ProductApi(request)),
  // The reference deployment without bugs (S6), separate HTTP context.
  reference: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: process.env.UI_API_URL, timeout: 30_000 });
    await use(new ReferenceApi(context));
    await context.dispose();
  },
});

export { expect };
