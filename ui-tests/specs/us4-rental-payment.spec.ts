import { errors, Locator } from '@playwright/test';
import { expect, test } from '../fixtures';
import { badlyFormattedCard, billingAddress, expiredCard, guest, invalidBankTransfer, messages, US1, US4 } from '../data/test-data';
import { formatCents, priceToCents } from '../helpers/money';

/** True if the element becomes visible within `ms`; false only on a timeout, other errors are re-thrown. */
async function becomesVisibleWithin(locator: Locator, ms: number): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout: ms });
    return true;
  } catch (error) {
    if (error instanceof errors.TimeoutError) return false;
    throw error;
  }
}

/**
 * US-4 rental and payment validation (docs/test-scenarios.md).
 * No login and no order: rental tests only use the cart; payment tests stop before "Confirm".
 */
test.describe('US-4 Excavator rental', () => {
  test.beforeEach(async ({ products, productDetails }) => {
    await products.gotoRentals();
    await products.openRental(US4.rentalProduct);
    await expect(productDetails.name).toHaveText(US4.rentalProduct);
  });

  // S2 Rental AC3 / Product Detail AC10: a 1–10 h slider, total = hourly rate × hours.
  test('UI-33 the rental slider stops at 1 and 10 hours and the total is rate × hours at both ends', { tag: '@P2' }, async ({ catalog, productDetails }) => {
    test.info().annotations.push({ type: 'basis', description: 'S2 Rental AC3 + Product Detail AC10 (supporting source; S1 only says "for 10 hours")' });
    const rateCents = priceToCents((await catalog.rentalProduct(US4.rentalProduct)).price);
    await productDetails.setRentalHours(1);
    await expect.poll(() => productDetails.rentalTotalCents(), { message: 'total at 1 h' }).toBe(rateCents);
    await productDetails.pushRentalSliderToMaximumAndBeyond();
    expect(await productDetails.rentalHours(), 'slider value after End + one more step').toBe(10);
    await expect.poll(() => productDetails.rentalTotalCents(), { message: 'total at 10 h' }).toBe(10 * rateCents);
  });

  // S2 Cart Review AC8: removing all rental items removes the 15 % combination discount.
  test('UI-34 removing the rental from a mixed cart removes the 15 % discount', { tag: '@P2' }, async ({ catalog, products, productDetails, cart }) => {
    test.info().annotations.push({ type: 'basis', description: 'S2 Cart Review AC8 (supporting source; the brief does not mention the discount)' });
    await productDetails.addToCart(); // Excavator, 1 h
    await products.gotoCategory(US1.categorySlug);
    const [first] = await products.readCards();
    await products.openProduct(first.name);
    await productDetails.addToCart();
    await cart.goto();
    await expect(cart.rows, 'precondition: product + rental in the cart').toHaveCount(2);
    await expect(cart.discount, 'precondition: the combination discount is shown (S2 Cart Review AC7)').toBeVisible();

    await cart.row(US4.rentalProduct).remove.click();
    await expect(cart.rows).toHaveCount(1);
    await expect(cart.discount, 'discount after removing the rental').toBeHidden();
    const product = (await catalog.productsInCategory(US1.category)).find((p) => p.name === first.name);
    expect(product, `${first.name} in the product data`).toBeDefined();
    const productPriceCents = priceToCents(product!.price);
    // S2 Cart Review AC8: "the total reverts to the regular subtotal" = the sum of the remaining line(s), no discount.
    await expect(cart.row(first.name).lineTotal, 'remaining product line = 1 × unit price').toHaveText(formatCents(productPriceCents));
    await expect(cart.total, 'total = the remaining product line, without discount').toHaveText(formatCents(productPriceCents));
  });

  // Inference from S2 Product Detail AC10 (1–10 h); PO question 7. The stored cart (after a reload) is the truth.
  test('UI-35 the cart does not keep more than 10 rental hours', { tag: '@P2' }, async ({ page, catalog, productDetails, cart }) => {
    test.info().annotations.push({ type: 'basis', description: 'Inference from S2 Product Detail AC10; neither S1 nor S2 states a cart limit (PO question 7)' });
    const rateCents = priceToCents((await catalog.rentalProduct(US4.rentalProduct)).price);
    await productDetails.addToCart();
    await cart.goto();
    const hours = cart.row(US4.rentalProduct).quantity;
    await hours.fill('11');
    await hours.press('Tab');
    // The app confirms an accepted change with "Product quantity updated." (S2 Cart Review AC2); wait for it or 10 s.
    await becomesVisibleWithin(page.getByText(messages.quantityUpdated).first(), 10_000);
    await cart.goto(); // reload: read what the cart actually stored
    const storedHours = Number(await hours.inputValue());
    await test.info().attach('UI-35 typed vs stored', { contentType: 'application/json', body: JSON.stringify({ typed: 11, storedHours }) });
    expect(storedHours, 'rental hours stored in the cart after typing 11').toBeLessThanOrEqual(10);
    await expect(cart.row(US4.rentalProduct).lineTotal, 'line total = stored hours × rate').toHaveText(formatCents(storedHours * rateCents));
  });
});

/**
 * Payment validation (S2 Payment AC1–AC4). Precondition via the GUEST path (tester's decision Q3):
 * these rules do not depend on who is logged in, and it keeps the shared Jane account out of the run.
 */
test.describe('US-4 payment validation', () => {
  test.beforeEach(async ({ products, productDetails, cart, login, billing, payment }) => {
    test.info().annotations.push({ type: 'precondition', description: 'payment step reached via "Continue as Guest" (Q3)' });
    await products.gotoCategory(US1.categorySlug);
    const [first] = await products.readCards();
    await products.openProduct(first.name);
    await productDetails.addToCart();
    await cart.goto();
    await cart.proceed.click();
    await login.continueAsGuest(guest());
    await login.proceedAsGuest.click();
    await billing.enterAddress(billingAddress);
    await billing.proceed.click();
    await expect(payment.method, 'precondition: the payment step is shown').toBeVisible();
  });

  // Assumption (tester's decision K9): S2 Payment AC1 lists the methods but does not state the button is disabled.
  test('UI-38 "Check payment" is disabled while no payment method is chosen', { tag: '@P2' }, async ({ payment }) => {
    test.info().annotations.push({ type: 'basis', description: 'Assumption (K9); S1 only says "Payment can be completed"' });
    await expect(payment.finish).toHaveText(/check payment/i);
    await expect(payment.finish).toBeDisabled();
  });

  // S2 Payment AC2: the account number is digits only. No message text is defined, so only its presence is asserted.
  test('UI-36 Bank Transfer rejects a non-digit account number and payment cannot be checked', { tag: '@P2' }, async ({ payment }) => {
    test.info().annotations.push({ type: 'basis', description: 'S2 Payment AC2 (supporting source; S1 only says "Payment can be completed")' });
    await payment.fillBankTransfer(invalidBankTransfer);
    await expect(payment.fieldError('account_number')).toBeVisible();
    await expect(payment.fieldError('account_number')).not.toBeEmpty();
    await expect(payment.finish).toBeDisabled();
  });

  // S2 Payment AC3: card XXXX-XXXX-XXXX-XXXX, expiry MM/YYYY, CVV 3–4 digits. Each wrong field must show ITS OWN error.
  test('UI-39 a wrongly formatted credit card shows an error on each invalid field', { tag: '@P2' }, async ({ payment }) => {
    test.info().annotations.push({ type: 'basis', description: 'S2 Payment AC3 (supporting source; S1 only says "Payment can be completed")' });
    await payment.fillCreditCard(badlyFormattedCard);
    for (const field of ['credit_card_number', 'expiration_date', 'cvv'] as const) {
      await expect(payment.fieldError(field), `error shown for ${field}`).toBeVisible();
      await expect(payment.fieldError(field), `error text for ${field}`).not.toBeEmpty();
    }
  });

  // S2 Payment AC4 defines the text: "Expiration date must be in the future." Expiry = last month, relative to the run date.
  test('UI-40 a credit card that expired last month is rejected with "Expiration date must be in the future."', { tag: '@P2' }, async ({ payment }) => {
    test.info().annotations.push({ type: 'basis', description: 'S2 Payment AC4 (supporting source; S1 only says "Payment can be completed")' });
    const card = expiredCard();
    test.info().annotations.push({ type: 'expiry used', description: card.expirationDate });
    await payment.fillCreditCard(card);
    await expect(payment.fieldError('expiration_date')).toHaveText(messages.expirationInPast);
  });
});

