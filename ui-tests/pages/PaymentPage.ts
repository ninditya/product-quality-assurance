import { expect, Locator, Page } from '@playwright/test';

export interface BankTransferInput {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

/** Checkout step 4: payment. */
export class PaymentPage {
  readonly method: Locator;
  readonly bankName: Locator;
  readonly accountName: Locator;
  readonly accountNumber: Locator;
  /** One button: "Check payment" first, "Confirm" after a successful check. */
  readonly finish: Locator;
  readonly successMessage: Locator;
  /** No test id exists for the order confirmation; its element id is stable. */
  readonly orderConfirmation: Locator;

  constructor(page: Page) {
    this.method = page.getByTestId('payment-method');
    this.bankName = page.getByTestId('bank_name');
    this.accountName = page.getByTestId('account_name');
    this.accountNumber = page.getByTestId('account_number');
    this.finish = page.getByTestId('finish');
    this.successMessage = page.getByTestId('payment-success-message');
    this.orderConfirmation = page.locator('#order-confirmation');
  }

  async payByBankTransfer(details: BankTransferInput) {
    await this.method.selectOption({ label: 'Bank Transfer' });
    await this.bankName.fill(details.bankName);
    await this.accountName.fill(details.accountName);
    await this.accountNumber.fill(details.accountNumber);
    await expect(this.finish).toHaveText(/check payment/i);
    await this.finish.click();
    await expect(this.successMessage).toBeVisible();
  }

  /** Clicks "Confirm" and returns the text of the order confirmation. */
  async confirmOrder(): Promise<string> {
    await expect(this.finish).toHaveText(/confirm/i);
    await this.finish.click();
    await expect(this.orderConfirmation).toBeVisible();
    return this.orderConfirmation.innerText();
  }
}
