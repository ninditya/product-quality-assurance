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
  readonly cardNumber: Locator;
  readonly expirationDate: Locator;
  readonly cvv: Locator;
  readonly cardHolderName: Locator;
  /** One button: "Check payment" first, "Confirm" after a successful check. */
  readonly finish: Locator;
  readonly successMessage: Locator;
  /** No test id exists for the order confirmation; its element id is stable. */
  readonly orderConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.method = page.getByTestId('payment-method');
    this.bankName = page.getByTestId('bank_name');
    this.accountName = page.getByTestId('account_name');
    this.accountNumber = page.getByTestId('account_number');
    this.cardNumber = page.getByTestId('credit_card_number');
    this.expirationDate = page.getByTestId('expiration_date');
    this.cvv = page.getByTestId('cvv');
    this.cardHolderName = page.getByTestId('card_holder_name');
    this.finish = page.getByTestId('finish');
    this.successMessage = page.getByTestId('payment-success-message');
    this.orderConfirmation = page.locator('#order-confirmation');
  }

  /**
   * The error message of ONE field, by the field's data-test id. Errors are <div class="alert">
   * elements without a test id, placed right after their input; this selects only alerts whose
   * nearest preceding input is that field, so an error of the next field is never attributed to it.
   */
  fieldError(testId: 'account_number' | 'credit_card_number' | 'expiration_date' | 'cvv' | 'card_holder_name') {
    return this.page.locator(
      `xpath=//input[@data-test="${testId}"]/following-sibling::div[contains(@class,"alert")][preceding-sibling::input[1][@data-test="${testId}"]]`,
    );
  }

  async fillBankTransfer(details: BankTransferInput) {
    await this.method.selectOption({ label: 'Bank Transfer' });
    await this.bankName.fill(details.bankName);
    await this.accountName.fill(details.accountName);
    await this.accountNumber.fill(details.accountNumber);
    await this.accountNumber.blur();
  }

  async fillCreditCard(card: { number: string; expirationDate: string; cvv: string; holderName: string }) {
    await this.method.selectOption({ label: 'Credit Card' });
    await this.cardNumber.fill(card.number);
    await this.expirationDate.fill(card.expirationDate);
    await this.cvv.fill(card.cvv);
    await this.cardHolderName.fill(card.holderName);
    await this.cardHolderName.blur();
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
