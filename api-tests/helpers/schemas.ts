import Ajv, { ValidateFunction } from 'ajv';

/**
 * JSON schemas for the Product responses, derived from the OpenAPI spec (S5, Toolshop API 5.0.0).
 *
 * Rule (tester's decision A1): a field is REQUIRED when the spec lists it AND the reference deployment
 * without bugs (S6, api.practicesoftwaretesting.com) returns it. Types come from the spec. Extra fields
 * are allowed. Nothing stricter than the spec is added (no minimum price, no minimum length).
 *
 * Known spec/reference deviations (2026-10-15):
 * - S6 uses text ids and true/false flags where the spec says integer; the API under test follows the spec.
 *   So S6 decides which fields must be PRESENT, never their types.
 * - Pagination: the spec lists next_page_url/path/prev_page_url (typed integer), S6 returns from/last_page
 *   instead; required = the fields both name.
 * - GET /products/{id} is documented as BrandResponse (a documentation error); a product is expected.
 */
const brand = {
  type: 'object',
  required: ['id', 'name'], // spec also lists slug; S6 does not return it
  properties: { id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' } },
};

const category = {
  type: 'object',
  required: ['id', 'name', 'slug'], // spec also lists parent_id; S6 does not return it
  properties: { id: { type: 'integer' }, parent_id: { type: ['integer', 'null'] }, name: { type: 'string' }, slug: { type: 'string' } },
};

const productImage = {
  type: 'object',
  required: ['id', 'by_name', 'by_url', 'source_name', 'source_url', 'file_name', 'title'], // created_at: not in S6
  properties: {
    id: { type: 'integer' },
    by_name: { type: 'string' },
    by_url: { type: 'string' },
    source_name: { type: 'string' },
    source_url: { type: 'string' },
    file_name: { type: 'string' },
    title: { type: 'string' },
  },
};

export const productSchema = {
  type: 'object',
  required: ['id', 'name', 'description', 'price', 'is_location_offer', 'is_rental', 'co2_rating', 'is_eco_friendly', 'brand', 'category', 'product_image'],
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number' },
    is_location_offer: { type: 'integer' },
    is_rental: { type: 'integer' },
    co2_rating: { type: 'string' },
    is_eco_friendly: { type: 'boolean' },
    brand,
    category,
    product_image: productImage,
  },
};

export const paginatedProductsSchema = {
  type: 'object',
  required: ['current_page', 'data', 'per_page', 'to', 'total'],
  properties: {
    current_page: { type: 'integer' },
    data: { type: 'array', items: productSchema },
    per_page: { type: 'integer' },
    to: { type: ['integer', 'null'] }, // null on an empty page
    total: { type: 'integer' },
  },
};

export const relatedProductsSchema = { type: 'array', items: productSchema };

// allowUnionTypes: some fields are `integer | null` by design.
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const compiled = new Map<object, ValidateFunction>();

/** Readable validation errors; an empty array means the body matches the schema. */
export function schemaErrors(schema: object, body: unknown): string[] {
  let validate = compiled.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    compiled.set(schema, validate);
  }
  return validate(body) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
}
