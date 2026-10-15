import { expect, Locator, Page } from '@playwright/test';
import { messages } from '../data/test-data';
import { toCents } from '../helpers/money';

/** Product detail page (/product/<id>). Rental products use the same page with a duration slider. */
export class ProductDetailsPage {
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly activeCo2Rating: Locator;
  readonly quantity: Locator;
  readonly increaseQuantity: Locator;
  readonly decreaseQuantity: Locator;
  readonly addToCartButton: Locator;
  /** Rental only: the ngx-slider handle has no ARIA role, so its component class is used. */
  readonly rentalDurationHandle: Locator;
  /** Rental only: "(Total $<span id="total-price">…</span>)". */
  readonly rentalTotal: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.activeCo2Rating = page.getByTestId('co2-rating-badge').locator('.co2-letter.active');
    this.quantity = page.getByTestId('quantity');
    this.increaseQuantity = page.getByTestId('increase-quantity');
    this.decreaseQuantity = page.getByTestId('decrease-quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.rentalDurationHandle = page.locator('.ngx-slider-pointer-min');
    this.rentalTotal = page.locator('#total-price');
  }

  /** The product id from the URL /product/<id>. */
  productId(): string {
    const match = this.page.url().match(/\/product\/([^/?#]+)/);
    if (!match) throw new Error(`Not on a product detail page: ${this.page.url()}`);
    return match[1];
  }

  async unitPriceCents() {
    await expect(this.unitPrice).not.toBeEmpty();
    return toCents(await this.unitPrice.innerText());
  }

  /** Uses the + button, as a customer would. */
  async setQuantity(target: number) {
    await expect(this.quantity).toHaveValue('1');
    for (let current = 1; current < target; current++) await this.increaseQuantity.click();
    await expect(this.quantity).toHaveValue(String(target));
  }

  async addToCart() {
    await this.addToCartButton.click();
    await expect(this.page.getByText(messages.addedToCart).first()).toBeVisible();
  }

  /** Moves the duration slider with the keyboard: Home = minimum, then one step per hour. */
  async setRentalHours(hours: number) {
    await this.rentalDurationHandle.focus();
    await this.page.keyboard.press('Home');
    for (let current = 1; current < hours; current++) await this.page.keyboard.press('ArrowRight');
    await expect(this.rentalDurationHandle).toHaveAttribute('aria-valuenow', String(hours));
  }

  async rentalHours(): Promise<number> {
    return Number(await this.rentalDurationHandle.getAttribute('aria-valuenow'));
  }

  /** Tries to move the slider past its maximum: End, then one more step to the right. */
  async pushRentalSliderToMaximumAndBeyond() {
    await this.rentalDurationHandle.focus();
    await this.page.keyboard.press('End');
    await this.page.keyboard.press('ArrowRight');
  }

  async rentalTotalCents() {
    return toCents(await this.rentalTotal.innerText());
  }
}
