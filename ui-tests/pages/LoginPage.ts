import { expect, Locator, Page } from '@playwright/test';

/** Checkout step 2: sign in (tab "Sign in"; the "Continue as Guest" tab is used by UI-21b). */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  /** Shown after a login, and when an already logged-in customer reaches this step. */
  readonly alreadyLoggedInMessage: Locator;
  readonly proceed: Locator;
  /** Shown when the account is locked after 3 failed logins (S2 User Login AC4, HTTP 423). */
  readonly accountLockedMessage: Locator;

  constructor(page: Page) {
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('login-submit');
    this.alreadyLoggedInMessage = page.getByText(/you are already logged in/i);
    this.proceed = page.getByTestId('proceed-2');
    this.accountLockedMessage = page.getByText(/account locked/i);
  }

  async logIn(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  /**
   * Logs in with a valid account and waits for one of two outcomes: logged in, or account locked.
   * A locked shared account is an environment blocker, so it fails with that message instead of a
   * generic timeout. The test still fails; nothing is skipped.
   */
  async logInExpectingSuccess(email: string, password: string) {
    await this.logIn(email, password);
    await expect(this.alreadyLoggedInMessage.or(this.accountLockedMessage)).toBeVisible({ timeout: 15_000 });
    if (await this.accountLockedMessage.isVisible()) {
      throw new Error(
        `ENVIRONMENT BLOCKER: the shared account ${email} is locked (HTTP 423, "${(await this.accountLockedMessage.innerText()).trim()}"). ` +
          'The login requirement cannot be verified. Execution suspended per test plan section 9.',
      );
    }
  }
}
