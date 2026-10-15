import { expect, Locator, Page } from '@playwright/test';

/** Account → My invoices → Details. */
export class InvoicePage {
  readonly invoiceNumber: Locator;
  readonly productRows: Locator;
  // The three totals share data-test="total", so their element ids are used instead.
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly total: Locator;

  constructor(private readonly page: Page) {
    this.invoiceNumber = page.getByTestId('invoice-number');
    this.productRows = page.getByRole('row').filter({ has: page.getByRole('cell') });
    this.subtotal = page.locator('#subtotal');
    this.discount = page.locator('#additional_discount_percentage');
    this.total = page.locator('#total');
  }

  /** Opens the invoice with this number (never "the latest": the demo account is shared). */
  async open(invoiceNumber: string) {
    await this.page.goto('/account/invoices');
    await this.page.getByRole('row').filter({ hasText: invoiceNumber }).getByRole('link', { name: 'Details' }).click();
    await expect(this.invoiceNumber).toHaveValue(invoiceNumber);
  }

  /** Cells of a product row: quantity, product, unit price, line total. */
  row(productName: string) {
    const row = this.productRows.filter({ hasText: productName });
    return { quantity: row.getByRole('cell').nth(0), lineTotal: row.getByRole('cell').nth(3) };
  }
}
