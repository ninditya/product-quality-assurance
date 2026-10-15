import { expect, test } from '../fixtures';
import { NON_EXISTENT_ID, Product } from '../helpers/product-api';
import { paginatedProductsSchema, productSchema, relatedProductsSchema, schemaErrors } from '../helpers/schemas';

/**
 * Part B, read endpoints of the Product collection (docs/test-scenarios.md, API-01 to API-17).
 * Brief: "Include status codes, response schema and key data validation, plus negative cases."
 * Expected sets are computed from the full catalogue of the SAME API (decision A2), never hard-coded.
 * Read-only: no data is changed.
 */

const ids = (products: Product[]) => products.map((p) => p.id).sort((a, b) => a - b);

/**
 * "Only and all": attaches expected and actual (ids + names) as evidence, then compares the full id sets.
 * The attachment keeps the actual response visible when the assertion fails (e.g. API-06b).
 */
async function expectSameProducts(label: string, expected: Product[], actual: Product[]) {
  const view = (list: Product[]) => list.map((p) => ({ id: p.id, name: p.name })).sort((a, b) => a.id - b.id);
  await test.info().attach(`${label} expected vs actual`, {
    contentType: 'application/json',
    body: JSON.stringify({ expected: view(expected), actual: view(actual) }, null, 2),
  });
  expect(ids(actual), `${label}: product ids (only and all)`).toEqual(ids(expected));
}

test.describe('Product read endpoints', () => {
  // S5: GET /products returns a paginated product list.
  test('API-01 GET /products returns 200 and a body matching the product list schema', { tag: '@P1' }, async ({ api }) => {
    const response = await api.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(schemaErrors(paginatedProductsSchema, body), 'schema errors').toEqual([]);
    expect(body.data.length, 'precondition: the list is not empty').toBeGreaterThan(0);
  });

  // S5 pagination: two pages of the same list share no product.
  test('API-02 page 2 of the product list shares no product with page 1', { tag: '@P2' }, async ({ api }) => {
    const response1 = await api.list({ page: 1 });
    expect(response1.status(), 'page 1 status').toBe(200);
    const page1 = await response1.json();
    expect(page1.last_page, 'precondition: the list has at least 2 pages').toBeGreaterThanOrEqual(2);
    const response2 = await api.list({ page: 2 });
    expect(response2.status(), 'page 2 status').toBe(200);
    const page2 = await response2.json();
    expect(page2.data.length, 'precondition: page 2 has products').toBeGreaterThan(0);
    const overlap = ids(page1.data).filter((id) => ids(page2.data).includes(id));
    expect(overlap, 'product ids on both page 1 and page 2').toEqual([]);
  });

  // S5 by_category: only AND all products of that category.
  test('API-04 by_category returns only and all products of that category', { tag: '@P1' }, async ({ api }) => {
    const catalogue = await api.catalogue();
    const categoryId = catalogue[0].category.id;
    await expectSameProducts(`by_category=${categoryId}`, catalogue.filter((p) => p.category.id === categoryId), await api.listAll({ by_category: categoryId }));
  });

  // S5 by_brand: only AND all products of that brand.
  test('API-05 by_brand returns only and all products of that brand', { tag: '@P2' }, async ({ api }) => {
    const catalogue = await api.catalogue();
    const brandId = catalogue[0].brand.id;
    await expectSameProducts(`by_brand=${brandId}`, catalogue.filter((p) => p.brand.id === brandId), await api.listAll({ by_brand: brandId }));
  });

  // S5 is_rental=true: rentals only.
  test('API-06 is_rental=true returns rental products only', { tag: '@P2' }, async ({ api }) => {
    const rentals = await api.listAll({ is_rental: 'true' });
    expect(rentals.length, 'precondition: rentals exist').toBeGreaterThan(0);
    expect(rentals.filter((p) => p.is_rental !== 1).map((p) => p.name), 'non-rental products in the result').toEqual([]);
  });

  // S5 + S6 is_rental=false: only AND all products for sale.
  test('API-06b is_rental=false returns only and all products that are not rentals', { tag: '@P2' }, async ({ api }) => {
    const catalogue = await api.catalogue();
    await expectSameProducts('is_rental=false', catalogue.filter((p) => p.is_rental === 0), await api.listAll({ is_rental: 'false' }));
  });

  // S5 between=price,10,30: only AND all products priced within [10, 30] (inclusive bounds: assumption).
  test('API-07 between=price,10,30 returns only and all products priced from 10 to 30', { tag: '@P2' }, async ({ api }) => {
    const catalogue = await api.catalogue();
    await expectSameProducts('between=price,10,30', catalogue.filter((p) => p.price >= 10 && p.price <= 30), await api.listAll({ between: 'price,10,30' }));
  });

  // S5 sort: the order holds across ALL pages, and no product is lost.
  for (const { id, sort, key, direction } of [
    { id: 'API-08a', sort: 'price,asc', key: 'price', direction: 1 },
    { id: 'API-08b', sort: 'price,desc', key: 'price', direction: -1 },
    { id: 'API-08c', sort: 'name,asc', key: 'name', direction: 1 },
  ] as const) {
    test(`${id} sort=${sort} orders the products across all pages`, { tag: '@P2' }, async ({ api }) => {
      const sorted = await api.listAll({ sort });
      const unsorted = await api.listAll();
      expect(ids(sorted), 'same products as the unsorted list').toEqual(ids(unsorted));
      // Names: case-insensitive comparison (assumption: the collation is not specified).
      const compare = (a: Product, b: Product) =>
        key === 'price' ? a.price - b.price : a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
      const outOfOrder = sorted.slice(1).filter((p, i) => direction * compare(sorted[i], p) > 0).map((p) => p.name);
      expect(outOfOrder, `products out of ${sort} order`).toEqual([]);
    });
  }

  // S6 (S5 is silent): is_eco_friendly follows the rating rule of the reference deployment. Only ratings with
  // a clear mapping in S6 are judged; ratings without an S6 example are reported as a limitation (annotation),
  // never counted as right or wrong.
  test('API-09 is_eco_friendly agrees with the CO2 rating rule of the reference deployment', { tag: '@P2' }, async ({ api, reference }) => {
    const rule = new Map<string, Set<boolean>>();
    for (const p of await reference.allProducts()) rule.set(p.co2_rating, (rule.get(p.co2_rating) ?? new Set()).add(p.is_eco_friendly));
    const ambiguous = [...rule].filter(([, values]) => values.size > 1).map(([rating]) => rating);
    expect(ambiguous, 'precondition: S6 gives one eco value per rating').toEqual([]);
    const catalogue = await api.catalogue();
    const noReference = [...new Set(catalogue.map((p) => p.co2_rating).filter((r) => !rule.has(r)))];
    if (noReference.length) test.info().annotations.push({ type: 'no S6 reference', description: `ratings not checked: ${noReference.join(', ')}` });
    const wrong = catalogue
      .filter((p) => rule.has(p.co2_rating) && ![...rule.get(p.co2_rating)!].includes(p.is_eco_friendly))
      .map((p) => `${p.name} (${p.co2_rating}, is_eco_friendly=${p.is_eco_friendly})`);
    await test.info().attach('API-09 S6 rule', { contentType: 'application/json', body: JSON.stringify(Object.fromEntries([...rule].map(([r, v]) => [r, [...v]]))) });
    expect(wrong, 'products whose is_eco_friendly differs from the S6 rule').toEqual([]);
  });

  // S5: GET /products/{id} returns that product (the spec's BrandResponse reference is a documentation error).
  test('API-10 GET /products/{id} returns 200, a valid product and the same data as the list', { tag: '@P1' }, async ({ api }) => {
    const listed = (await (await api.list()).json()).data[0];
    const response = await api.get(listed.id);
    expect(response.status()).toBe(200);
    const detail = await response.json();
    expect(schemaErrors(productSchema, detail), 'schema errors').toEqual([]);
    expect(detail, 'detail contains the listed data').toMatchObject(listed);
  });

  // S5: an unknown id answers 404.
  test('API-11 GET /products/{id} with an unknown id returns 404', { tag: '@P1' }, async ({ api }) => {
    expect((await api.get(NON_EXISTENT_ID)).status()).toBe(404);
  });

  // S5 "Search is performed on the name column" + S6 (case-insensitive): only AND all matching names.
  test('API-13 search returns 200, a valid body, and only and all products whose name contains the query', { tag: '@P1' }, async ({ api }) => {
    const q = 'hammer';
    const response = await api.search(q);
    expect(response.status()).toBe(200);
    expect(schemaErrors(paginatedProductsSchema, await response.json()), 'schema errors').toEqual([]);
    const expected = (await api.catalogue()).filter((p) => p.name.toLowerCase().includes(q));
    expect(expected.length, 'precondition: the catalogue has matching products').toBeGreaterThan(0);
    await expectSameProducts(`search q=${q}`, expected, await api.searchAll(q));
  });

  // S6 behaviour observed on 2026-10-15 (S5 is silent): "claw hammer" and "hammer claw" both return only the
  // names containing BOTH words, in any order, case-insensitive. So: every word must appear, not the exact phrase.
  test('API-13c a multi-word search returns only and all products whose name contains every word', { tag: '@P2' }, async ({ api }) => {
    test.info().annotations.push({ type: 'basis', description: 'S6 observed rule: every word of the query, any order (S5 is silent)' });
    const q = 'claw hammer';
    const words = q.split(' ');
    const expected = (await api.catalogue()).filter((p) => words.every((w) => p.name.toLowerCase().includes(w)));
    expect(expected.length, 'precondition: the catalogue has products with every word').toBeGreaterThan(0);
    await expectSameProducts(`search q="${q}"`, expected, await api.searchAll(q));
  });

  // S5 (status, schema) + ASSUMPTION ("related" excludes the product itself; not stated by S1, S2 or S5).
  // A failure of the last assertion is a finding to clarify, not a confirmed bug.
  test('API-15 related products are valid and do not include the product itself', { tag: '@P2' }, async ({ api }) => {
    test.info().annotations.push({ type: 'basis', description: 'S5 for status and schema; "excludes itself" is an assumption to clarify' });
    const product = (await (await api.list()).json()).data[0];
    const response = await api.related(product.id);
    expect(response.status()).toBe(200);
    const related = await response.json();
    expect(schemaErrors(relatedProductsSchema, related), 'schema errors').toEqual([]);
    expect(related.map((p: Product) => p.id), 'the product itself among its related products').not.toContain(product.id);
  });

  // S5: related products of an unknown id answer 404 (never 5xx).
  test('API-17 related products of an unknown id return 404', { tag: '@P2' }, async ({ api }) => {
    expect((await api.related(NON_EXISTENT_ID)).status()).toBe(404);
  });
});
