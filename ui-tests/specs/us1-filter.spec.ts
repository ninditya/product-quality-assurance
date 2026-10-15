import { expect, test } from '../fixtures';
import { US1 } from '../data/test-data';
import { isBetterThan } from '../helpers/co2';
import { priceToCents } from '../helpers/money';

/**
 * UI-01 (docs/test-scenarios.md), US-1 acceptance criterion, decision D1:
 * after the environmental filter is applied in Power Tools, the list shows ONLY AND ALL products
 * rated better than E (A–D).
 *
 * - Expected set: from the product data of the API the UI uses, filtered with isBetterThan(); no
 *   product name or count is hard-coded.
 * - Actual set: the cards the UI lists after the filter.
 * - Comparing the full sorted sets catches both a missing qualifying product and a wrong one.
 *   An "only" check alone would pass on an empty list; this one does not.
 * - Read-only: no login, no order, no change to shared data.
 */
test('UI-01 the environmental filter in Power Tools lists only and all products rated better than E', { tag: '@P1' }, async ({
  catalog,
  products,
}) => {
  const powerTools = await catalog.productsInCategory(US1.category);
  const expected = powerTools.filter((p) => isBetterThan(p.co2_rating, US1.threshold)).map((p) => p.name).sort();
  expect(expected.length, 'precondition: the product data has at least one Power Tools product rated better than E').toBeGreaterThan(0);

  await products.gotoCategory(US1.categorySlug);
  await products.applyEcoFriendlyFilter();
  const actual = (await products.readCards()).map((card) => card.name).sort();

  await test.info().attach('UI-01 expected vs actual', {
    contentType: 'application/json',
    body: JSON.stringify({ expectedFromApi: expected, actualInUi: actual }, null, 2),
  });
  expect(
    actual,
    `Power Tools listed after the environmental filter.\n` +
      `Expected (product data, rating A–D): ${JSON.stringify(expected)}\n` +
      `Actual (UI): ${JSON.stringify(actual)}`,
  ).toEqual(expected);
});

/**
 * UI-02 (docs/test-scenarios.md): every card in the UNFILTERED Power Tools list shows the price and
 * CO2 rating stored for that product. This proves consistency between the UI and the product data,
 * not that a price is "correct". The filter is not used here; UI-01 judges it.
 * Cards are matched to the product data by name, after checking that names are unique on both sides.
 * A card without a matching product fails the test; nothing is skipped.
 */
test('UI-02 each Power Tools card shows the price and CO2 rating stored for that product', { tag: '@P2' }, async ({
  catalog,
  products,
}) => {
  const powerTools = await catalog.productsInCategory(US1.category);
  const apiNames = powerTools.map((p) => p.name);
  expect(new Set(apiNames).size, `product names are unique in the product data: ${JSON.stringify(apiNames)}`).toBe(apiNames.length);

  await products.gotoCategory(US1.categorySlug);
  const cards = await products.readCards();
  const cardNames = cards.map((c) => c.name);
  expect(cards.length, 'precondition: the Power Tools list shows cards').toBeGreaterThan(0);
  expect(new Set(cardNames).size, `card names are unique in the UI: ${JSON.stringify(cardNames)}`).toBe(cardNames.length);

  const byName = new Map(powerTools.map((p) => [p.name, p]));
  const shown = cards.map((c) => ({ name: c.name, priceCents: c.priceCents, co2: c.co2 }));
  const stored = cards.map((c) => {
    const p = byName.get(c.name);
    return p ? { name: p.name, priceCents: priceToCents(p.price), co2: p.co2_rating } : { name: c.name, priceCents: 'NO MATCHING PRODUCT', co2: 'NO MATCHING PRODUCT' };
  });

  await test.info().attach('UI-02 shown vs stored', {
    contentType: 'application/json',
    body: JSON.stringify({ shownInUi: shown, storedInProductData: stored }, null, 2),
  });
  expect(shown, 'price and CO2 rating per card (UI) vs product data for the same product').toEqual(stored);
});
