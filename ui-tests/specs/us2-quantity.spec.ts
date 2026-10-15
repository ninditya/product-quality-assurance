import { expect, test } from '../fixtures';
import { US1 } from '../data/test-data';

/**
 * US-2 quantity boundaries on the product detail page (docs/test-scenarios.md).
 * The product is the first card of the unfiltered Power Tools list, so nothing is hard-coded.
 * Read-only: nothing is added to the cart.
 */
test.describe('US-2 quantity lower boundary on the product detail page', () => {
  test.beforeEach(async ({ products, productDetails }) => {
    await products.gotoCategory(US1.categorySlug);
    const [first] = await products.readCards();
    expect(first, 'precondition: the Power Tools list shows a product').toBeDefined();
    await products.openProduct(first.name);
    await expect(productDetails.name).toHaveText(first.name);
  });

  // S2 Product Detail AC6: "Given the quantity is 1, when I click the minus button, then the quantity remains at 1."
  test('UI-12 pressing minus at quantity 1 keeps the quantity at 1', { tag: '@P2' }, async ({ productDetails }) => {
    await expect(productDetails.quantity, 'precondition: default quantity').toHaveValue('1');
    await productDetails.decreaseQuantity.click();
    await expect(productDetails.quantity).toHaveValue('1');
  });

  // S2 Product Detail AC7: a typed value "is clamped between 1 and 999,999,999"; 0 is below the minimum.
  test('UI-13 typing 0 as quantity is corrected to 1', { tag: '@P2' }, async ({ productDetails }) => {
    await productDetails.quantity.fill('0');
    await productDetails.quantity.blur();
    await expect(productDetails.quantity).toHaveValue('1');
  });
});
