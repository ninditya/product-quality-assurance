import { expect, test } from '../fixtures';
import { bankTransfer, billingAddress, customer, JANE_EMAIL, US1, US2, US3, US4 } from '../data/test-data';
import { isBetterThan } from '../helpers/co2';
import { formatCents, percentOf, priceToCents, toCents } from '../helpers/money';
import type { ProductCard } from '../pages/ProductsPage';

/**
 * E2E-01 (docs/test-scenarios.md): the journey of US-1 → US-4 in one browser session.
 *
 * - A1 workaround: the product is chosen from the UNFILTERED Power Tools list by its CO2 badge,
 *   so that US-2 to US-4 stay testable. This test does not claim that US-1 is met; UI-01 judges the filter.
 * - Steps marked [S1] check the brief. Steps marked [S2] are additional checks based on the Sprint 5
 *   stories (A5, A6); a failure there is reported against S2, not as a breach of the brief.
 * - Expected totals are computed here from API prices, never read from the app.
 * - Each run places one real order on the shared demo account.
 */
test(`E2E-01 ${customer.name} buys 2 of a Power Tool rated better than E plus a 10-hour Excavator rental`, { tag: '@P1' }, async ({
  page,
  catalog,
  products,
  productDetails,
  cart,
  login,
  billing,
  payment,
  invoice,
}) => {
  test.info().annotations.push({ type: 'workaround', description: 'A1: product picked from the unfiltered Power Tools list; US-1 is judged by UI-01' });
  test.info().annotations.push(
    customer.email === JANE_EMAIL
      ? { type: 'account', description: 'Jane Doe (required by the brief)' }
      : { type: 'account', description: `ALTERNATE ACCOUNT VALIDATION (${customer.name}): not final evidence for the brief, which requires Jane Doe` },
  );
  test.info().annotations.push({ type: 'synchronisation', description: 'Billing waits for the late account pre-fill before typing (candidate C7, reproduced by UI-26b)' });

  let product!: ProductCard;
  let rentalRateCents!: number;
  let invoiceNumber!: string;
  const productLine = () => US3.updatedQuantity * product.priceCents;
  const rentalLine = () => US4.rentalHours * rentalRateCents;
  const subtotal = () => productLine() + rentalLine();
  const discount = () => percentOf(subtotal(), US4.combinationDiscountPercent);

  await test.step('[S1] US-1 (A1 workaround): pick a Power Tools product rated better than E from the unfiltered list', async () => {
    await products.gotoCategory(US1.categorySlug);
    const qualifying = (await products.readCards()).filter((card) => isBetterThan(card.co2, US1.threshold));
    expect(qualifying.length, 'Power Tools products rated better than E on the list (none: the flow cannot start)').toBeGreaterThan(0);
    product = qualifying[0];
  });

  await test.step('[S1] US-2: the detail page matches the selected product', async () => {
    await products.openProduct(product.name);
    await expect(productDetails.name).toHaveText(product.name);
    expect(await productDetails.unitPriceCents(), 'detail price = price on the selected card').toBe(product.priceCents);
    const apiProduct = await catalog.product(productDetails.productId());
    expect(apiProduct.name, 'product data for this id').toBe(product.name);
    expect(product.priceCents, 'card price = price in the product data').toBe(priceToCents(apiProduct.price));
    await expect(productDetails.activeCo2Rating).toHaveText(product.co2);
  });

  await test.step('[S1] US-2: add 3; the cart shows quantity 3 and line total 3 × unit price', async () => {
    await productDetails.setQuantity(US2.initialQuantity);
    await productDetails.addToCart();
    await cart.goto();
    await expect(cart.rows).toHaveCount(1);
    await expect(cart.row(product.name).quantity).toHaveValue(String(US2.initialQuantity));
    await expect(cart.row(product.name).lineTotal).toHaveText(formatCents(US2.initialQuantity * product.priceCents));
  });

  await test.step('[S1] US-3: reduce to 2; line total and cart total become 2 × unit price', async () => {
    await cart.changeQuantity(product.name, US3.updatedQuantity);
    // toHaveText retries until the delayed update shows the computed value (no fixed wait).
    await expect(cart.row(product.name).quantity).toHaveValue(String(US3.updatedQuantity));
    await expect(cart.row(product.name).lineTotal).toHaveText(formatCents(productLine()));
    await expect(cart.total).toHaveText(formatCents(productLine()));
  });

  await test.step(`[S1] US-3: checkout asks for a login; log in as ${customer.name}`, async () => {
    await cart.proceed.click();
    await expect(login.email).toBeVisible();
    await expect(login.proceed, 'no way to proceed before logging in on this tab').toBeHidden();
    await login.logInExpectingSuccess(customer.email, customer.password);
    // S2 Checkout Sign In AC5: the customer's name is shown. The exact wording differs from S2 (observation O3).
    await expect(login.alreadyLoggedInMessage).toContainText(customer.name);
  });

  await test.step('[S1] US-3: enter the billing address and reach the payment step', async () => {
    await login.proceed.click();
    await billing.waitForAccountPrefill();
    await billing.enterAddress(billingAddress);
    await billing.proceed.click();
    await expect(payment.method).toBeVisible();
  });

  await test.step('[S1] US-4: before paying, add the Excavator for 10 hours at rate × 10', async () => {
    rentalRateCents = priceToCents((await catalog.rentalProduct(US4.rentalProduct)).price);
    await products.gotoRentals();
    await products.openRental(US4.rentalProduct);
    await expect(productDetails.name).toHaveText(US4.rentalProduct);
    expect(await productDetails.unitPriceCents(), 'hourly rate = rate in the product data').toBe(rentalRateCents);
    await productDetails.setRentalHours(US4.rentalHours);
    await expect.poll(() => productDetails.rentalTotalCents(), { message: 'rental total on the detail page' }).toBe(rentalLine());
    await productDetails.addToCart();
  });

  await test.step('[S1] US-3/US-4: the cart holds the product × 2 and the Excavator × 10 h with correct line prices', async () => {
    await cart.goto();
    await expect(cart.rows).toHaveCount(2);
    await expect(cart.row(product.name).quantity).toHaveValue(String(US3.updatedQuantity));
    await expect(cart.row(product.name).lineTotal).toHaveText(formatCents(productLine()));
    await expect(cart.row(US4.rentalProduct).quantity).toHaveValue(String(US4.rentalHours));
    await expect(cart.row(US4.rentalProduct).lineTotal).toHaveText(formatCents(rentalLine()));
  });

  await test.step('[S2] cart: subtotal, 15 % combination discount and total (A5, A6)', async () => {
    await expect(cart.subtotal).toHaveText(formatCents(subtotal()));
    await expect(cart.discount).toContainText(formatCents(discount()));
    await expect(cart.total).toHaveText(formatCents(subtotal() - discount()));
  });

  await test.step('[S1] US-4: pay by Bank Transfer; the order is confirmed with an invoice number', async () => {
    await cart.proceed.click();
    await expect(login.alreadyLoggedInMessage).toContainText(customer.name);
    await login.proceed.click();
    // D4: the login persists, but the billing address has to be entered again (observation C6).
    await billing.waitForAccountPrefill();
    await billing.enterAddress(billingAddress);
    await billing.proceed.click();
    await payment.payByBankTransfer(bankTransfer);
    const confirmation = await payment.confirmOrder();
    const match = confirmation.match(/INV-\d+/);
    expect(match, `invoice number in the confirmation: "${confirmation}"`).not.toBeNull();
    invoiceNumber = match![0];
    test.info().annotations.push({ type: 'invoice', description: invoiceNumber });
  });

  await test.step('[S2] the cart is cleared after the order (S2 Payment AC9)', async () => {
    await expect(cart.headerBadge).toBeHidden();
  });

  await test.step('[S1] US-3/US-4: the invoice of this order lists the product × 2 and the Excavator × 10 h', async () => {
    await invoice.open(invoiceNumber);
    await expect(invoice.row(product.name).quantity).toHaveText(String(US3.updatedQuantity));
    expect(toCents(await invoice.row(product.name).lineTotal.innerText()), 'product line on the invoice').toBe(productLine());
    await expect(invoice.row(US4.rentalProduct).quantity).toHaveText(String(US4.rentalHours));
    expect(toCents(await invoice.row(US4.rentalProduct).lineTotal.innerText()), 'rental line on the invoice').toBe(rentalLine());
  });

  await test.step('[S2] invoice: subtotal, 15 % discount and total (S2 Combination Discount AC4)', async () => {
    expect(toCents(await invoice.subtotal.inputValue()), 'invoice subtotal').toBe(subtotal());
    expect(toCents(await invoice.discount.inputValue()), 'invoice discount').toBe(discount());
    expect(toCents(await invoice.total.inputValue()), 'invoice total').toBe(subtotal() - discount());
  });
});
