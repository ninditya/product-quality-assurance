import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export interface Product {
  id: number;
  name: string;
  price: number;
  is_rental: number;
  co2_rating: string;
  is_eco_friendly: boolean;
  brand: { id: number; name: string };
  category: { id: number; name: string };
}

interface Paginated<T> {
  data: T[];
  last_page: number;
}

/** Thin client for the Product endpoints of the API under test (API_BASE_URL). */
export class ProductApi {
  constructor(private readonly request: APIRequestContext) {}

  list(params: Record<string, string | number> = {}): Promise<APIResponse> {
    return this.request.get('/products', { params });
  }

  get(id: number | string): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  search(q: string, params: Record<string, string | number> = {}): Promise<APIResponse> {
    return this.request.get('/products/search', { params: { q, ...params } });
  }

  related(id: number | string): Promise<APIResponse> {
    return this.request.get(`/products/${id}/related`);
  }

  /** Every item across all pages of a paginated query (stops at last_page). */
  async all(fetchPage: (page: number) => Promise<APIResponse>, label: string): Promise<Product[]> {
    const items: Product[] = [];
    for (let page = 1; ; page++) {
      const response = await fetchPage(page);
      expect(response.status(), `${label} page ${page}`).toBe(200);
      const body = (await response.json()) as Paginated<Product>;
      items.push(...body.data);
      if (page >= body.last_page) return items;
    }
  }

  listAll(params: Record<string, string | number> = {}) {
    return this.all((page) => this.list({ ...params, page }), `GET /products ${JSON.stringify(params)}`);
  }

  searchAll(q: string) {
    return this.all((page) => this.search(q, { page }), `GET /products/search?q=${q}`);
  }

  /**
   * The full catalogue: the default list (products for sale) plus the rental list. The default list
   * holds no rentals on this API, so "all products" needs both (oracle limitation A2: if these lists
   * are wrong themselves, the filter tests cannot notice).
   */
  async catalogue(): Promise<Product[]> {
    const byId = new Map<number, Product>();
    for (const p of [...(await this.listAll()), ...(await this.listAll({ is_rental: 'true' }))]) byId.set(p.id, p);
    return [...byId.values()];
  }
}

/** Reads the reference deployment without bugs (S6, UI_API_URL); used only where the spec is silent. */
export class ReferenceApi {
  constructor(private readonly request: APIRequestContext) {}

  async allProducts(): Promise<{ co2_rating: string; is_eco_friendly: boolean }[]> {
    const items: { co2_rating: string; is_eco_friendly: boolean }[] = [];
    for (let page = 1; ; page++) {
      const response = await this.request.get('/products', { params: { page } });
      expect(response.status(), `S6 GET /products page ${page}`).toBe(200);
      const body = (await response.json()) as Paginated<{ co2_rating: string; is_eco_friendly: boolean }>;
      items.push(...body.data);
      if (page >= body.last_page) return items;
    }
  }
}

export const NON_EXISTENT_ID = 999_999_999;
