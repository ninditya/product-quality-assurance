import { APIRequestContext, expect } from '@playwright/test';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  co2_rating: string;
  is_rental: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  sub_categories?: Category[];
}

interface Paginated<T> {
  data: T[];
  last_page: number;
}

/**
 * Reads product data from the API that the UI itself uses (UI_API_URL).
 * It supplies input data for the UI tests (prices, ratings, product sets), so no price or id is
 * hard-coded. Values derived from it (totals, discount) are computed by the tests themselves.
 */
export class CatalogApi {
  constructor(private readonly request: APIRequestContext) {}

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.request.get(path);
    expect(response.status(), `GET ${path}`).toBe(200);
    return (await response.json()) as T;
  }

  private async getAllPages(path: string): Promise<CatalogProduct[]> {
    const products: CatalogProduct[] = [];
    for (let page = 1; ; page++) {
      const separator = path.includes('?') ? '&' : '?';
      const body = await this.getJson<Paginated<CatalogProduct>>(`${path}${separator}page=${page}`);
      products.push(...body.data);
      if (page >= body.last_page) return products;
    }
  }

  /** All products of a top-level category and its sub-categories (products sit in the sub-categories). */
  async productsInCategory(categoryName: string): Promise<CatalogProduct[]> {
    const tree = await this.getJson<Category[]>('/categories/tree');
    const category = tree.find((c) => c.name === categoryName);
    if (!category) throw new Error(`Category "${categoryName}" not found`);
    const ids = [category.id, ...(category.sub_categories ?? []).map((c) => c.id)];
    const byId = new Map<string, CatalogProduct>();
    for (const id of ids) {
      for (const product of await this.getAllPages(`/products?by_category=${id}`)) byId.set(product.id, product);
    }
    return [...byId.values()];
  }

  async product(id: string): Promise<CatalogProduct> {
    return this.getJson<CatalogProduct>(`/products/${id}`);
  }

  async rentalProduct(name: string): Promise<CatalogProduct> {
    const product = (await this.getAllPages('/products?is_rental=true')).find((p) => p.name === name);
    if (!product) throw new Error(`Rental product "${name}" not found`);
    return product;
  }
}
