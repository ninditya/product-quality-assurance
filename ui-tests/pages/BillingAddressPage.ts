import { expect, Locator, Page, Request } from '@playwright/test';

export interface AddressInput {
  countryCode: string;
  postalCode: string;
  houseNumber: string;
}

const isProfileRequest = (request: Request) => /\/users\/me(\?|$)/.test(request.url());

/** Checkout step 3: billing address. */
export class BillingAddressPage {
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly proceed: Locator;
  /**
   * Account profile requests (GET /users/me) that fill this form. Only requests seen STARTING are
   * tracked, because this page object can be created while a profile request is already running
   * (it is created when a test first uses it); a counter would then go negative and never settle.
   */
  private readonly profile = { running: new Set<Request>(), lastActivity: Date.now(), finished: 0 };

  constructor(page: Page) {
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.proceed = page.getByTestId('proceed-3');
    page.on('request', (r) => {
      if (!isProfileRequest(r)) return;
      this.profile.running.add(r);
      this.profile.lastActivity = Date.now();
    });
    const ended = (r: Request, completed: boolean) => {
      if (!this.profile.running.delete(r)) return; // started before tracking began: ignored
      this.profile.lastActivity = Date.now();
      if (completed) this.profile.finished++;
    };
    page.on('requestfinished', (r) => ended(r, true));
    page.on('requestfailed', (r) => ended(r, false));
  }

  /**
   * Waits until the account pre-fill has finished: the stored street is shown AND no profile request
   * (GET /users/me) is running or has started for 1 s. The step can fetch the profile a second time
   * after the form is already filled, and that late response overwrites what the customer typed
   * (candidate C7, reproduced by UI-26b). The 1 s quiet window is a heuristic measured on network
   * events, not a fixed sleep; enterAddress() still fails if the input is wiped afterwards.
   */
  async waitForAccountPrefill() {
    await expect(this.street, 'street pre-filled from the account').not.toHaveValue('', { timeout: 15_000 });
    await this.waitForProfileRequestsToSettle();
  }

  /** Number of profile requests (GET /users/me) that have completed so far; used as evidence by UI-26b. */
  profileResponsesSoFar(): number {
    return this.profile.finished;
  }

  /** No profile request (GET /users/me) running or started for 1 s (see waitForAccountPrefill). */
  async waitForProfileRequestsToSettle() {
    await expect
      .poll(() => this.profile.running.size === 0 && Date.now() - this.profile.lastActivity >= 1_000, {
        message: 'account profile requests have settled',
        timeout: 15_000,
        intervals: [250],
      })
      .toBe(true);
  }

  /**
   * Enters country, postal code and house number ONCE. The postcode lookup (a documented mock, A8)
   * then fills street, city and state. Afterwards the three typed values must still be there:
   * no retyping, so a wiped input fails the test visibly.
   */
  async enterAddress(address: AddressInput) {
    await this.country.selectOption(address.countryCode);
    await this.postalCode.fill(address.postalCode);
    await this.houseNumber.fill(address.houseNumber);
    await expect(this.state, 'state filled by the postcode lookup').not.toHaveValue('', { timeout: 10_000 });
    await expect(this.country, 'typed country kept').toHaveValue(address.countryCode);
    await expect(this.postalCode, 'typed postal code kept').toHaveValue(address.postalCode);
    await expect(this.houseNumber, 'typed house number kept').toHaveValue(address.houseNumber);
  }
}
