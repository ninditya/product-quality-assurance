import { expect, Locator, Page } from '@playwright/test';
import { messages } from '../data/test-data';
import { toCents } from '../helpers/money';

export interface ProductCard {
  name: string;
  priceCents: number;
  co2: string;
}

/** Category pages (e.g. /category/power-tools) and the Rentals page. */
export class ProductsPage {
  /** Product cards; category cards and rental cards share the `product-<id>` test id. */
  readonly cards: Locator;
  readonly cardNames: Locator;
  readonly ecoFriendlyFilter: Locator;
  readonly noProductsMessage: Locator;

  constructor(private readonly page: Page) {
    this.cards = page.locator('[data-test^="product-"]').filter({ has: page.getByTestId('product-name') });
    this.cardNames = this.cards.getByTestId('product-name');
    this.ecoFriendlyFilter = page.getByTestId('eco-friendly-filter');
    this.noProductsMessage = page.getByText(messages.noProductsFound);
  }

  async gotoCategory(slug: string) {
    await this.whileLoadingProducts(() => this.page.goto(`/category/${slug}`).then(() => undefined));
  }

  async gotoRentals() {
    await this.page.goto('/rentals');
  }

  /**
   * Runs an action that (re)loads the product list and waits until the list is rendered.
   * The page shows "There are no products found." while the request is still pending, so that
   * message alone does not prove an empty result: the rendered cards are matched to the response.
   */
  async whileLoadingProducts(action: () => Promise<void>) {
    const response = this.page.waitForResponse(
      (r) => /\/products(\?|$)/.test(r.url()) && r.request().method() !== 'OPTIONS',
      { timeout: 30_000 },
    );
    await action();
    const body = (await (await response).json()) as { data: unknown[] };
    if (body.data.length > 0) {
      await expect(this.cardNames).toHaveCount(body.data.length);
    } else {
      await expect(this.noProductsMessage).toBeVisible();
      await expect(this.cardNames).toHaveCount(0);
    }
  }

  async applyEcoFriendlyFilter() {
    await this.whileLoadingProducts(() => this.ecoFriendlyFilter.check());
  }

  /** Name, price and highlighted CO2 letter of every listed card. */
  async readCards(): Promise<ProductCard[]> {
    const cards: ProductCard[] = [];
    for (const card of await this.cards.all()) {
      cards.push({
        name: (await card.getByTestId('product-name').innerText()).trim(),
        priceCents: toCents(await card.getByTestId('product-price').innerText()),
        // The badge shows all letters A–E and marks the product's rating with the `active` class.
        co2: (await card.getByTestId('co2-rating-badge').locator('.co2-letter.active').innerText()).trim(),
      });
    }
    return cards;
  }

  async openProduct(name: string) {
    await this.cardNames.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`) }).click();
    await this.page.waitForURL(/\/product\//);
  }

  /** Rental cards show the name as a heading instead of the `product-name` test id. */
  async openRental(name: string) {
    await this.page.getByRole('heading', { name, exact: true }).click();
    await this.page.waitForURL(/\/product\//);
  }
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
