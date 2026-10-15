import { test as base, expect } from '@playwright/test';
import { ProductApi, ReferenceApi } from './helpers/product-api';

/** Products created by ONE test. Only these ids are ever deleted. */
export interface CreatedProducts {
  register(id: number): void;
  readonly ids: readonly number[];
}

interface ApiFixtures {
  api: ProductApi;
  reference: ReferenceApi;
  adminToken: string;
  customerToken: string;
  created: CreatedProducts;
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
  adminToken: async ({ api }, use) => use(await api.token(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, 'admin')),
  customerToken: async ({ api }, use) => use(await api.token(process.env.CUSTOMER_EMAIL, process.env.CUSTOMER_PASSWORD, 'customer')),
  /**
   * Clean-up registry (decision A3). A test registers an id only AFTER the API created that product.
   * The teardown runs even when an assertion failed and handles ONLY the registered ids (never by name,
   * never seeded data). It deletes each one as admin, then GET decides the outcome:
   *   GET 404  -> removed (whatever the DELETE status: the test itself may already have deleted it)
   *   GET 200  -> STILL EXISTS: clean-up failed
   *   other    -> UNVERIFIABLE: the product's state is unknown; reported with the actual status
   * Only "removed" is acceptable; anything else fails the test loudly, with the report attached.
   */
  created: async ({ api, adminToken }, use, testInfo) => {
    const ids: number[] = [];
    await use({ register: (id) => ids.push(id), ids });
    const report: { id: number; deleteStatus: number; getAfter: number; outcome: 'removed' | 'STILL EXISTS' | 'UNVERIFIABLE' }[] = [];
    for (const id of ids) {
      const deleteStatus = (await api.remove(id, adminToken)).status(); // recorded for diagnosis, not judged
      const getAfter = (await api.get(id)).status();
      const outcome = getAfter === 404 ? 'removed' : getAfter === 200 ? 'STILL EXISTS' : 'UNVERIFIABLE';
      report.push({ id, deleteStatus, getAfter, outcome });
    }
    await testInfo.attach('clean-up', { contentType: 'application/json', body: JSON.stringify(report, null, 2) });
    const problems = report.filter((r) => r.outcome !== 'removed');
    expect(problems, 'CLEAN-UP: products of this test that still exist or whose state could not be verified').toEqual([]);
  },
});

export { expect };
