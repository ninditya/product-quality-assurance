import { expect, Locator, Page } from '@playwright/test';
import { messages } from '../data/test-data';

/** Checkout step 1: cart. Reads and changes the cart; expected values are decided by the tests. */
export class CartPage {
  readonly rows: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly total: Locator;
  readonly proceed: Locator;
  /** Item counter on the cart icon in the header. */
  readonly headerBadge: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.locator('tbody tr').filter({ has: page.getByTestId('product-title') });
    this.subtotal = page.getByTestId('cart-subtotal');
    this.discount = page.getByTestId('cart-discount');
    this.total = page.getByTestId('cart-total');
    this.proceed = page.getByTestId('proceed-1');
    this.headerBadge = page.getByTestId('cart-quantity');
  }

  async goto() {
    await this.page.goto('/checkout');
    await expect(this.proceed).toBeVisible();
  }

  row(productName: string) {
    const row = this.rows.filter({ has: this.page.getByTestId('product-title').filter({ hasText: productName }) });
    return {
      quantity: row.getByTestId('product-quantity'),
      unitPrice: row.getByTestId('product-price'),
      lineTotal: row.getByTestId('line-price'),
    };
  }

  /** Types the new quantity and waits for the app's confirmation (S2 Cart Review AC2). */
  async changeQuantity(productName: string, quantity: number) {
    const input = this.row(productName).quantity;
    await input.fill(String(quantity));
    await input.press('Tab');
    await expect(this.page.getByText(messages.quantityUpdated).first()).toBeVisible();
  }
}
