import { APIRequestContext, expect } from '@playwright/test';

export interface AccountAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
}

/**
 * Reads the stored account of a demo customer from the API the UI uses (UI_API_URL).
 * It supplies the expected pre-fill values for UI-26. Logs in with the valid password only.
 */
export class AccountApi {
  constructor(private readonly request: APIRequestContext) {}

  async address(email: string, password: string): Promise<AccountAddress> {
    const login = await this.request.post('/users/login', { data: { email, password } });
    expect(login.status(), `POST /users/login for ${email} (423 = shared account locked: environment blocker)`).toBe(200);
    const { access_token } = (await login.json()) as { access_token: string };
    const me = await this.request.get('/users/me', { headers: { Authorization: `Bearer ${access_token}` } });
    expect(me.status(), 'GET /users/me').toBe(200);
    return ((await me.json()) as { address: AccountAddress }).address;
  }
}
