import { test as base, expect } from '@playwright/test';
import { AccountApi } from './helpers/account-api';
import { CatalogApi } from './helpers/catalog-api';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { BillingAddressPage } from './pages/BillingAddressPage';
import { PaymentPage } from './pages/PaymentPage';
import { InvoicePage } from './pages/InvoicePage';

interface UiFixtures {
  catalog: CatalogApi;
  account: AccountApi;
  products: ProductsPage;
  productDetails: ProductDetailsPage;
  cart: CartPage;
  login: LoginPage;
  billing: BillingAddressPage;
  payment: PaymentPage;
  invoice: InvoicePage;
}

export const test = base.extend<UiFixtures>({
  catalog: async ({ playwright }, use) => {
    // This API supplies input data only (it is not the system under test). The shared demo sometimes
    // answers slowly (one E2E run hit a 15 s timeout), so it gets 30 s per request.
    const request = await playwright.request.newContext({ baseURL: process.env.UI_API_URL, timeout: 30_000 });
    await use(new CatalogApi(request));
    await request.dispose();
  },
  account: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: process.env.UI_API_URL, timeout: 30_000 });
    await use(new AccountApi(request));
    await request.dispose();
  },
  products: async ({ page }, use) => use(new ProductsPage(page)),
  productDetails: async ({ page }, use) => use(new ProductDetailsPage(page)),
  cart: async ({ page }, use) => use(new CartPage(page)),
  login: async ({ page }, use) => use(new LoginPage(page)),
  billing: async ({ page }, use) => use(new BillingAddressPage(page)),
  payment: async ({ page }, use) => use(new PaymentPage(page)),
  invoice: async ({ page }, use) => use(new InvoicePage(page)),
});

export { expect };
