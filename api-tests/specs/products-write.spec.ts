import { CreatedProducts, expect, test } from '../fixtures';
import { NON_EXISTENT_ID, Product, ProductRequest } from '../helpers/product-api';
import { ASSUMED_REQUIRED_FIELDS, NAME_PREFIX, RUN_ID, validProductRequest } from '../helpers/test-data';

/**
 * Part B, write endpoints of the Product collection (docs/test-scenarios.md, API-20 to API-32).
 * Brief: tests "must be re-runnable without manual setup". Every test creates its OWN product, registers
 * its id right after the API created it, and the `created` fixture deletes exactly that id afterwards,
 * even when an assertion failed (decision A3). Seeded products are never modified.
 * For refused changes, expect.soft() reports the wrong status AND the data check still runs, so one run
 * shows both the status and whether the product was changed or deleted.
 */

type Api = Parameters<Parameters<typeof test>[2]>[0]['api'];

async function referenceProduct(api: Api): Promise<Product> {
  return (await (await api.list()).json()).data[0];
}

/**
 * Registers a product the API created (201) for clean-up. If a 201 carries no usable id, the product
 * cannot be cleaned up safely: it is reported as a LEAK needing manual handling (never deleted by name).
 */
function registerIfCreated(status: number, body: { id?: unknown }, created: CreatedProducts) {
  if (status !== 201) return;
  if (typeof body.id === 'number') created.register(body.id);
  else test.info().annotations.push({ type: 'LEAK', description: 'API answered 201 without an id: product cannot be cleaned up automatically, handle manually' });
}

/** Precondition for update/delete tests: create the test's own product (201 with an id), register it, return it. */
async function createOwnProduct(api: Api, created: CreatedProducts, label: string) {
  const body = validProductRequest(await referenceProduct(api), label);
  const response = await api.create(body);
  const product = await response.json();
  registerIfCreated(response.status(), product, created);
  expect(response.status(), 'precondition: the test product is created').toBe(201);
  expect(typeof product.id, 'precondition: the created product has an id').toBe('number');
  return { body, product };
}

/** The product as stored, limited to the ProductResponse fields of the spec (S5). Read with GET. */
async function storedSnapshot(api: Api, id: number) {
  const response = await api.get(id);
  expect(response.status(), `GET /products/${id}`).toBe(200);
  const p = await response.json();
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    is_location_offer: p.is_location_offer,
    is_rental: p.is_rental,
    co2_rating: p.co2_rating,
    is_eco_friendly: p.is_eco_friendly,
    brand: p.brand,
    category: p.category,
    product_image: p.product_image,
  };
}

test.describe('Product write endpoints', () => {
  // S5: POST /products returns 201 with the stored product; a later GET returns it.
  test('API-20 POST /products creates a product that a later GET returns', { tag: '@P1' }, async ({ api, created }) => {
    const body = validProductRequest(await referenceProduct(api), 'create');
    const response = await api.create(body);
    expect(response.status()).toBe(201);
    const stored = await response.json();
    registerIfCreated(response.status(), stored, created);
    expect(stored, 'response echoes the input').toMatchObject({ name: body.name, description: body.description, price: body.price });
    expect(typeof stored.id, 'id').toBe('number');
    const fetched = await api.get(stored.id);
    expect(fetched.status()).toBe(200);
    expect(await fetched.json(), 'GET returns the created product').toMatchObject({ id: stored.id, name: body.name, price: body.price });
  });

  // S5 documents 422. Which fields are required is an ASSUMPTION (S5 marks none); only status + presence of errors are asserted.
  test('API-21 POST /products with an empty body is refused with 422 and validation errors', { tag: '@P1' }, async ({ api, created }) => {
    test.info().annotations.push({ type: 'assumption', description: `expected required fields (not in S5): ${ASSUMED_REQUIRED_FIELDS.join(', ')}` });
    const response = await api.create({});
    const body = await response.json().catch(() => ({}));
    registerIfCreated(response.status(), body, created); // a defect that creates data is cleaned up too
    await test.info().attach('API-21 response', { contentType: 'application/json', body: JSON.stringify({ status: response.status(), body }, null, 2) });
    expect(response.status()).toBe(422);
    expect(Object.keys(body).length, 'the 422 body contains validation errors').toBeGreaterThan(0);
  });

  for (const { id, label, override, basis } of [
    { id: 'API-22a', label: 'a negative price', override: { price: -1 }, basis: 'ASSUMPTION: S5 sets no minimum price (question Q-API-1)' },
    { id: 'API-22b', label: 'a non-numeric price', override: { price: 'abc' }, basis: 'S5: price is a number' },
    { id: 'API-22c', label: 'CO2 rating "Z"', override: { co2_rating: 'Z' }, basis: 'S5: co2_rating enum A–E' },
    { id: 'API-22d', label: 'an unknown category id', override: { category_id: NON_EXISTENT_ID }, basis: 'ASSUMPTION: a referenced category must exist' },
  ] as { id: string; label: string; override: Partial<ProductRequest>; basis: string }[]) {
    test(`${id} POST /products with ${label} is refused with 422`, { tag: '@P2' }, async ({ api, created }) => {
      test.info().annotations.push({ type: 'basis', description: basis });
      const response = await api.create({ ...validProductRequest(await referenceProduct(api), id), ...override });
      const body = await response.json().catch(() => ({}));
      registerIfCreated(response.status(), body, created);
      expect(response.status(), `status for ${label}`).toBe(422);
    });
  }

  // S5: PUT returns 200 and the change is stored.
  test('API-23 PUT /products/{id} updates the product and the change persists', { tag: '@P2' }, async ({ api, created }) => {
    const { body: original, product } = await createOwnProduct(api, created, 'update');
    const response = await api.update(product.id, { ...original, price: 23.45 });
    expect(response.status()).toBe(200);
    expect((await (await api.get(product.id)).json()).price, 'stored price after the update').toBe(23.45);
  });

  // S5: DELETE is secured and documents 401. The product must still exist afterwards.
  test('API-24 DELETE /products/{id} without a token is refused with 401 and the product still exists', { tag: '@P1' }, async ({ api, created }) => {
    const { product } = await createOwnProduct(api, created, 'delete-no-token');
    expect.soft((await api.remove(product.id)).status(), 'DELETE status without a token').toBe(401);
    expect((await api.get(product.id)).status(), 'the product still exists').toBe(200);
  });

  // S5: DELETE by an admin returns 204; the product is gone.
  test('API-25 DELETE /products/{id} as admin returns 204 and the product is gone', { tag: '@P2' }, async ({ api, adminToken, created }) => {
    const { product } = await createOwnProduct(api, created, 'delete-admin');
    expect((await api.remove(product.id, adminToken)).status()).toBe(204);
    expect((await api.get(product.id)).status(), 'GET after delete').toBe(404);
  });

  // S5: "Admin role is required to delete a specific product". A customer token must be rejected (401 or 403).
  test('API-27 DELETE /products/{id} with a customer token is rejected and the product still exists', { tag: '@P1' }, async ({ api, customerToken, created }) => {
    const { product } = await createOwnProduct(api, created, 'delete-customer');
    const status = (await api.remove(product.id, customerToken)).status();
    expect.soft([401, 403].includes(status), `DELETE with a customer token returned ${status}; expected 401 or 403`).toBe(true);
    expect((await api.get(product.id)).status(), 'the product still exists').toBe(200);
  });

  // S5: PUT documents 422; a non-numeric price must be refused like POST, and the product must not change.
  test('API-31 PUT /products/{id} with a non-numeric price is refused with 422 and the product is unchanged', { tag: '@P2' }, async ({ api, created }) => {
    const { body: original, product } = await createOwnProduct(api, created, 'put-bad-price');
    const before = await storedSnapshot(api, product.id);
    expect.soft((await api.update(product.id, { ...original, price: 'abc' })).status(), 'PUT status').toBe(422);
    expect(await storedSnapshot(api, product.id), 'every stored field is unchanged').toEqual(before);
  });

  // S5 (422) + the required-field assumption of API-21: an empty PUT must be refused and change nothing.
  test('API-32 PUT /products/{id} with an empty body is refused with 422 and the product is unchanged', { tag: '@P2' }, async ({ api, created }) => {
    const { product } = await createOwnProduct(api, created, 'put-empty');
    const before = await storedSnapshot(api, product.id);
    expect.soft((await api.update(product.id, {})).status(), 'PUT status').toBe(422);
    expect(await storedSnapshot(api, product.id), 'every stored field is unchanged').toEqual(before);
  });
});

/**
 * Leak check (extra safety, A3): after all write tests, no product of THIS run may remain.
 * It only reports; it never deletes by name.
 */
test.afterAll('no product of this run is left on the shared API', async ({ playwright }) => {
  const context = await playwright.request.newContext({ baseURL: process.env.API_BASE_URL, extraHTTPHeaders: { Accept: 'application/json' } });
  const leftovers: string[] = [];
  for (const params of [{}, { is_rental: 'true' }] as Record<string, string>[]) {
    for (let page = 1; ; page++) {
      const body = await (await context.get('/products', { params: { ...params, page } })).json();
      leftovers.push(...body.data.map((p: Product) => p.name).filter((n: string) => n.startsWith(`${NAME_PREFIX} ${RUN_ID}`)));
      if (page >= body.last_page) break;
    }
  }
  await context.dispose();
  expect(leftovers, `products of ${RUN_ID} left on the API`).toEqual([]);
});
