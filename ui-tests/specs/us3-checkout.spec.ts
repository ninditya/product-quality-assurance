import { errors, Locator } from '@playwright/test';
import { expect, test } from '../fixtures';
import { billingAddress, customer, guest, messages, unknownUser, US1 } from '../data/test-data';

/**
 * True if the element becomes visible within `ms`, false only on a TIMEOUT. Any other error
 * (closed page, broken locator) is re-thrown, so a technical failure never looks like "not shown".
 */
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
 * US-3 checkout sign-in and billing (docs/test-scenarios.md).
 * Every test starts as a guest with one Power Tools product in the cart and opens the sign-in step.
 * No order is placed. Negative logins never use Jane's e-mail (shared account, locks after 3 failures).
 */
test.describe('US-3 checkout sign-in and billing', () => {
  test.beforeEach(async ({ products, productDetails, cart, login }) => {
    await products.gotoCategory(US1.categorySlug);
    const [first] = await products.readCards();
    expect(first, 'precondition: the Power Tools list shows a product').toBeDefined();
    await products.openProduct(first.name);
    await productDetails.addToCart();
    await cart.goto();
    await cart.proceed.click();
    await expect(login.email, 'precondition: the sign-in step is shown').toBeVisible();
  });

  // S1 US-3 "Checkout requires login" + S2 Checkout Sign In AC1–AC2.
  test('UI-21 a guest proceeding from the cart gets a sign-in step with e-mail and password fields', { tag: '@P1' }, async ({ login }) => {
    await expect(login.email).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.submit).toBeVisible();
    await expect(login.proceed, 'no way to proceed on the Sign in tab before logging in').toBeHidden();
  });

  // S1 US-3 "Checkout requires login". Conflicts with S2 (guest checkout), decision D6:
  // a failure here is reported as a POTENTIAL DEFECT PENDING PO, not as a confirmed bug.
  test('UI-21b a guest cannot reach the billing address step without logging in', { tag: '@P1' }, async ({ login, billing }) => {
    test.info().annotations.push({ type: 'requirement conflict', description: 'D6: S1 "Checkout requires login" vs S2 guest checkout; a failure = potential defect pending PO' });
    await login.continueAsGuest(guest());
    // Try every way forward a guest is offered. The guest is blocked if no proceed button appears,
    // or if the billing form does not appear within 10 s after using it (bounded check of a negative).
    const offered = await becomesVisibleWithin(login.proceedAsGuest, 10_000);
    let reachedBilling = false;
    if (offered) {
      await login.proceedAsGuest.click();
      reachedBilling = await becomesVisibleWithin(billing.country, 10_000);
    }
    expect(reachedBilling, 'a guest reached the billing address step without logging in (D6: potential defect pending PO)').toBe(false);
  });

  // S2 User Login AC3: incorrect credentials show "Invalid email or password". Uses an unknown e-mail, never Jane's.
  test('UI-23 an unknown e-mail is rejected on the checkout sign-in step', { tag: '@P2' }, async ({ login }) => {
    const user = unknownUser();
    await login.logIn(user.email, user.password);
    await expect(login.loginError).toContainText(messages.invalidLogin);
    await expect(login.email, 'checkout stays on the sign-in step').toBeVisible();
    await expect(login.proceed).toBeHidden();
  });

  // Assumption (tester's decision K10): S1/S2 define no message text, so only the presence of an error per field is asserted.
  test('UI-29 submitting empty credentials shows an error for each field', { tag: '@P2' }, async ({ login }) => {
    await login.submit.click();
    await expect(login.emailError).toBeVisible();
    await expect(login.emailError).not.toBeEmpty();
    await expect(login.passwordError).toBeVisible();
    await expect(login.passwordError).not.toBeEmpty();
    await expect(login.proceed, 'checkout stays on the sign-in step').toBeHidden();
  });

  // S2 Billing Address AC4: "the address fields are pre-filled with my account address details".
  // Expected values come from Jane's stored account. Fields the account does not store (state, postal code: A7) are not asserted.
  test('UI-26 the billing step is pre-filled with the address stored on Jane\'s account, including the country', { tag: '@P2' }, async ({ account, login, billing }) => {
    const stored = await account.address(customer.email, customer.password);
    await login.logInExpectingSuccess(customer.email, customer.password);
    await login.proceed.click();
    await billing.waitForAccountPrefill();
    const shown = {
      street: await billing.street.inputValue(),
      city: await billing.city.inputValue(),
      country: '',
    };
    // The <select> holds a country code; its label is compared with the stored country name.
    // When nothing is selected the code is empty, so the shown country is "" (no waiting for a missing option).
    const countryCode = await billing.country.inputValue();
    shown.country = countryCode ? ((await billing.country.locator(`option[value="${countryCode}"]`).textContent()) ?? '').trim() : '';
    const expected = { street: stored.street, city: stored.city, country: stored.country };
    // Only the compared fields are attached (no token, no password, no other account data).
    await test.info().attach('UI-26 shown vs stored', { contentType: 'application/json', body: JSON.stringify({ shown, stored: expected }, null, 2) });
    expect(shown, 'billing pre-fill vs the stored account address').toEqual(expected);
  });

  // Candidate C7. Basis: the customer's typed input must not be lost (S2 Billing Address AC3 needs all fields filled to proceed).
  // Reproduces the second billing visit (as in E2E-01 after adding a rental) and types AS SOON AS the form is shown,
  // without waiting for the profile requests; then waits for them to settle and checks the typed values are still there.
  test('UI-26b typed billing input is kept when the account pre-fill arrives late', { tag: '@P2' }, async ({ cart, login, billing }) => {
    await login.logInExpectingSuccess(customer.email, customer.password);
    await login.proceed.click();
    await billing.waitForAccountPrefill(); // first visit: let it finish
    await cart.goto(); // leave checkout, as when changing the cart
    await cart.proceed.click();
    await expect(login.alreadyLoggedInMessage).toContainText(customer.name);
    await login.proceed.click();
    await expect(billing.street, 'form shown with the account pre-fill').not.toHaveValue('', { timeout: 15_000 });
    const responsesBeforeTyping = billing.profileResponsesSoFar();
    await billing.country.selectOption(billingAddress.countryCode); // typed immediately: the condition under test
    await billing.postalCode.fill(billingAddress.postalCode);
    await billing.houseNumber.fill(billingAddress.houseNumber);
    await billing.waitForProfileRequestsToSettle();
    const lateProfileResponses = billing.profileResponsesSoFar() - responsesBeforeTyping;
    if (lateProfileResponses === 0) {
      // The condition under test did not occur in this run, so a pass does not show that C7 is fixed.
      test.info().annotations.push({ type: 'race window not exercised', description: 'no profile response arrived after typing' });
    }
    const kept = {
      country: await billing.country.inputValue(),
      postalCode: await billing.postalCode.inputValue(),
      houseNumber: await billing.houseNumber.inputValue(),
    };
    await test.info().attach('UI-26b typed vs kept', { contentType: 'application/json', body: JSON.stringify({ typed: billingAddress, kept, lateProfileResponses }, null, 2) });
    expect(kept, 'typed billing input after the profile requests settled').toEqual({
      country: billingAddress.countryCode,
      postalCode: billingAddress.postalCode,
      houseNumber: billingAddress.houseNumber,
    });
  });
});
