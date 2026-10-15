import type { Product, ProductRequest } from './product-api';

/** One id per test run. Every product a run creates carries it, so a run never mistakes another run's data for its own. */
export const RUN_ID = `run-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
export const NAME_PREFIX = 'QA take-home';

export function uniqueName(label: string): string {
  return `${NAME_PREFIX} ${RUN_ID} ${label} ${Math.floor(Math.random() * 1e6)}`;
}

/** A valid ProductRequest (S5) that reuses the category, brand and image of an existing product. */
export function validProductRequest(reference: Product, label: string): ProductRequest {
  return {
    name: uniqueName(label),
    description: 'Created by the QA take-home API tests and deleted by the same test.',
    price: 12.34,
    category_id: reference.category.id,
    brand_id: reference.brand.id,
    product_image_id: reference.product_image!.id,
    is_location_offer: 0,
    is_rental: 0,
    co2_rating: 'C',
  };
}

/** Fields a product cannot exist without. ASSUMPTION: the spec (S5) marks no field as required. */
export const ASSUMED_REQUIRED_FIELDS = ['name', 'price', 'category_id', 'brand_id', 'product_image_id'];
