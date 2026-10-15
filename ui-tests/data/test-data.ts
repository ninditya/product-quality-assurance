/**
 * Test data for the UI tests, kept apart from test logic.
 * Prices, ratings and ids are NOT stored here: the tests read them from the API at run time,
 * because the shared demo data can change.
 */

export const US1 = {
  category: 'Power Tools',
  categorySlug: 'power-tools',
  /** D1: "better than E". */
  threshold: 'E' as const,
};

export const US2 = { initialQuantity: 3 };
export const US3 = { updatedQuantity: 2 };

export const US4 = {
  rentalProduct: 'Excavator',
  rentalHours: 10,
  /** S2 Combination Discount AC1 (assumption A5): rental + non-rental items get 15 % off the subtotal. */
  combinationDiscountPercent: 15,
};

/**
 * Billing input. The postcode lookup is a documented mock (A8) that fills street, city and state
 * from country, postal code and house number. Jane's account stores no postal code or state (A7),
 * and whether the country is pre-filled is judged by UI-26 (candidate C3), so the test enters these
 * three values itself, as a customer would.
 */
export const billingAddress = {
  countryCode: 'AT',
  postalCode: '1010',
  houseNumber: '98',
};

/** Format-valid Bank Transfer data (S2 Payment AC2). Not a real account (D5). */
export const bankTransfer = {
  bankName: 'Test Bank',
  accountName: 'Jane Doe',
  accountNumber: '123456789',
};

/** Credentials come from the environment (see .env.example). The brief requires Jane Doe. */
export const JANE_EMAIL = 'customer@practicesoftwaretesting.com';
export const customer = {
  name: process.env.CUSTOMER_NAME ?? 'Jane Doe',
  email: process.env.CUSTOMER_EMAIL ?? '',
  password: process.env.CUSTOMER_PASSWORD ?? '',
};

/** Guest details for "Continue as Guest". Never Jane's e-mail. Unique per run. */
export const guest = () => ({ email: `guest.${Date.now()}@example.com`, firstName: 'Guest', lastName: 'Tester' });

/**
 * An account that does not exist. Negative login tests use this, never Jane's e-mail:
 * three failed attempts would lock the shared demo account (S2 User Login AC4).
 */
export const unknownUser = () => ({ email: `no-such-user.${Date.now()}@example.com`, password: 'NotARealPassword1!' });

/** Texts the app shows. Wording is only asserted where a source (S2) defines it. */
export const messages = {
  /** S2 Product Detail AC8. */
  addedToCart: 'Product added to shopping cart.',
  /** S2 Cart Review AC2. */
  quantityUpdated: 'Product quantity updated.',
  noProductsFound: 'There are no products found.',
  /** S2 User Login AC3. */
  invalidLogin: 'Invalid email or password',
  /** S2 Payment AC4. */
  expirationInPast: 'Expiration date must be in the future.',
};

/** S2 Payment AC2: account number must be digits only; this one is not. */
export const invalidBankTransfer = { ...bankTransfer, accountNumber: '12AB34' };

/** Breaks the formats of S2 Payment AC3: card XXXX-XXXX-XXXX-XXXX, expiry MM/YYYY, CVV 3–4 digits. */
export const badlyFormattedCard = { number: '1234', expirationDate: '13/20', cvv: '1', holderName: 'Jane Doe' };

/** Well-formed card data whose expiry is last month, computed from the run date (S2 Payment AC4). Not a real card. */
export function expiredCard() {
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const expirationDate = `${String(lastMonth.getMonth() + 1).padStart(2, '0')}/${lastMonth.getFullYear()}`;
  return { number: '4111-1111-1111-1111', expirationDate, cvv: '123', holderName: 'Jane Doe' };
}
