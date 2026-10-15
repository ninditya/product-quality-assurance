# Test Scenarios

**STLC phase:** 2b (Test design)
**Date:** 2026-10-15
**Basis:** [requirement-analysis.md](requirement-analysis.md), [test-plan.md](test-plan.md)

## 1. How to read this document

- **Basis** names where the expected result comes from: **S1** brief, **S2** Sprint 5 user stories (secondary, D7), **S5** OpenAPI spec, **S6** reference deployment without bugs, or **Assumption** (labelled, with a PO question). An expected result is never taken from the behaviour under test.
- **Risk** refers to the product risks R1–R7 in the [test plan](test-plan.md#4-product-risks).
- **Status:** **Auto** = **planned for automation** in this repository; it does not mean executed or passed. **Not run** = designed but not executed in this time box (P3, tester's schedule decision). Results are reported only from actual runs of this repository, in the test summary report.
- Test names claim only what the test proves.

## 2. UI scenarios (Part A)

| ID | Story | Scenario | Expected result | Basis | Risk | P | Status |
|---|---|---|---|---|---|---|---|
| E2E-01 | US-1 → US-4 | One session: pick the A–D Power Tools product from the unfiltered list (A1 workaround), open it, add 3, reduce to 2, log in as Jane in checkout, enter billing, reach payment, add Excavator 10 h, return through checkout, pay by Bank Transfer, open the invoice of this run | **Mandatory (S1):** detail = selected card; cart line 3 × price, then 2 × price (waits for the update); Jane's name shown after login (not the exact wording, see O3); Excavator line = rate × 10; order placed with a confirmation and invoice number; that invoice lists product × 2 and Excavator × 10. **Additional (S2, A5, A6):** subtotal, 15 % discount and total in cart and invoice. A failure in the additional check is reported against S2, not as a breach of the brief. | S1 US-1..US-4 + D1–D5; additional check S2 Combination Discount (A5, A6) | R2, R3 | P1 | Auto |
| UI-01 | US-1 | Apply the environmental filter in Power Tools | Only **and all** Power Tools products rated A–D are listed (expected set from the API; currently Circular Saw) | S1 US-1 (D1) | R1 | P1 | Auto |
| UI-02 | US-1 | Read every Power Tools card | Each card shows the price and CO₂ rating stored for that product (consistency with product data, not price correctness) | S6 product data (supports US-1) | R1 | P2 | Auto |
| UI-12 | US-2 | Press − while the quantity is 1 | The quantity stays 1 | S2 Product Detail AC6 | R2 | P2 | Auto |
| UI-13 | US-2 | Type 0 in the quantity field | The value is corrected to 1 (lower boundary) | S2 Product Detail AC7 (clamped to 1..999,999,999) | R2 | P2 | Auto |
| UI-21 | US-3 | As a guest, proceed from the cart | A sign-in step with email and password fields is shown | S1 US-3 + S2 Checkout Sign In AC1–AC2 | R4 | P1 | Auto |
| UI-21b | US-3 | As a guest, use "Continue as Guest" with a non-Jane e-mail | The billing address step is **not** reachable without logging in. The test passes **only** if the guest is blocked; if the guest reaches billing, the test fails and the result is reported as a **potential defect pending PO** (D6), not as a confirmed bug | S1 US-3 "Checkout requires login" (conflicts with S2, D6) | R4 | P1 | Auto |
| UI-23 | US-3 | Log in on the checkout step with an unknown e-mail | An error "Invalid email or password" is shown and checkout stays on the sign-in step | S2 User Login AC3 | R4 | P2 | Auto |
| UI-26 | US-3 | Open the billing step as Jane | The address fields stored on the account are pre-filled, including country (account: Austria) | S2 Billing Address AC4 | R3 | P2 | Auto |
| UI-27 | US-3 | Clear a required address field | The field is invalid and Proceed is disabled | S2 Billing Address AC2 | R3 | P3 | Not run |
| UI-29 | US-3 | Submit the checkout login with empty e-mail and password | A required-field error is shown for each field and checkout stays on the sign-in step | **Assumption**: S1/S2 define no message text, so the exact wording is not asserted (tester's decision) | R4 | P2 | Auto |
| UI-33 | US-4 | Move the Excavator slider to 1 and to 10 | The slider stops at 1 and 10; total = rate × hours at both ends | S2 Rental AC3, Product Detail AC10 | R2 | P2 | Auto |
| UI-34 | US-4 | With product + rental in the cart, remove the rental | The 15 % discount disappears and the total equals the subtotal | S2 Cart Review AC8 | R2 | P2 | Auto |
| UI-35 | US-4 | Type more than 10 hours for the rental in the cart | The cart does not accept more than 10 hours | **Inference** from S2 Product Detail AC10 (PO question 7) | R2 | P2 | Auto |
| UI-36 | US-4 | Bank Transfer with a non-digit account number | The field is rejected and payment cannot be confirmed | S2 Payment AC2 | R3 | P2 | Auto |
| UI-38 | US-4 | Try to check payment without choosing a method | "Check payment" is disabled | **Assumption**: S2 Payment AC1 lists the methods but does not say the button is disabled (tester's decision: kept as P2, risk R3) | R3 | P2 | Auto |
| UI-39 | US-4 | Credit Card with wrongly formatted fields | Each invalid field shows its own error | S2 Payment AC3 | R3 | P2 | Auto |
| UI-40 | US-4 | Credit Card with an expiry date in the past (computed relative to the run date) | "Expiration date must be in the future." | S2 Payment AC4 | R3 | P2 | Auto |

## 3. API scenarios (Part B)

Target: https://api-with-bugs.practicesoftwaretesting.com. Contract: S5. A field is required in a response schema when S5 lists it **and** S6 returns it; extra fields are allowed.

| ID | Endpoint | Scenario | Expected result | Basis | Risk | P | Status |
|---|---|---|---|---|---|---|---|
| API-01 | `GET /products` | List products | 200; every item and the pagination match the schema | S5 | R6 | P1 | Auto |
| API-02 | `GET /products?page=2` | Second page | No product appears on both page 1 and page 2 | S5 pagination | R6 | P2 | Auto |
| API-04 | `GET /products?by_category=` | Filter by category | Only **and all** products of that category | S5 | R6 | P1 | Auto |
| API-05 | `GET /products?by_brand=` | Filter by brand | Only **and all** products of that brand | S5 | R6 | P2 | Auto |
| API-06 | `GET /products?is_rental=true` | Rentals only | Every item has `is_rental = true` | S5 | R6 | P2 | Auto |
| API-06b | `GET /products?is_rental=false` | Products for sale only | Only **and all** products with `is_rental = false` | S5 + S6 | R6 | P2 | Auto |
| API-07 | `GET /products?between=price,10,30` | Price range | Only **and all** products priced within [10, 30] | S5 | R6 | P2 | Auto |
| API-08a | `GET /products?sort=price,asc` | Sort by price ascending | Ordered across **all** pages | S5 | R6 | P2 | Auto |
| API-08b | `GET /products?sort=price,desc` | Sort by price descending | Ordered across all pages | S5 | R6 | P2 | Auto |
| API-08c | `GET /products?sort=name,asc` | Sort by name ascending | Ordered across all pages | S5 | R6 | P2 | Auto |
| API-09 | `GET /products` | `is_eco_friendly` vs `co2_rating` | For every rating, `is_eco_friendly` equals the value S6 gives that rating (S6 on 2026-10-15: true for B only; no product is rated A) | S6 (S5 is silent) | R6 | P2 | Auto |
| API-10 | `GET /products/{id}` | Existing product | 200; schema valid; same data as in the list | S5 | R6 | P1 | Auto |
| API-11 | `GET /products/{id}` | Unknown id | 404 | S5 | R6 | P1 | Auto |
| API-13 | `GET /products/search?q=` | Search by name | 200; schema valid; only **and all** products whose name contains the query | S5 ("search is performed on the name column") + S6 | R6 | P1 | Auto |
| API-13c | `GET /products/search?q=` | Multi-word query | Only **and all** products whose name contains **every word** of the query, in any order (S6 observed 2026-10-15: "claw hammer" = "hammer claw") | S6 | R6 | P2 | Auto |
| API-15 | `GET /products/{id}/related` | Related products | 200; schema valid; the product itself is not included | S5 + **assumption** ("related" excludes itself; a failure is a finding to clarify) | R6 | P2 | Auto |
| API-16 | `GET /products/search` | Missing `q` (required in S5) | A 4xx client error (S5 documents no specific code) | S5 | R5 | P3 | Not run |
| API-17 | `GET /products/{id}/related` | Unknown id | 404, never 5xx | S5 | R5 | P2 | Auto |
| API-20 | `POST /products` | Create a valid product | 201; echoes the input with an id; a later GET returns it | S5 | R6 | P1 | Auto |
| API-21 | `POST /products` | Empty body | 422 with a validation error. Which fields are required is an **assumption** (S5 marks none required); the test checks the status and that errors are returned, and reports the expected field list as an assumption, not as contract | S5 (422) + **assumption** on the required fields | R5 | P1 | Auto |
| API-22a | `POST /products` | Negative price | 422 | **Assumption** (S5 sets no minimum; question Q-API-1) | R5 | P2 | Auto |
| API-22b | `POST /products` | Non-numeric price | 422 | S5 (`price: number`) | R5 | P2 | Auto |
| API-22c | `POST /products` | CO₂ rating "Z" | 422 | S5 (enum A–E) | R5 | P2 | Auto |
| API-22d | `POST /products` | Unknown category id | 422 | **Assumption** (a referenced category must exist) | R5 | P2 | Auto |
| API-23 | `PUT /products/{id}` | Update the product created by the test | 200; the change persists (GET) | S5 | R6 | P2 | Auto |
| API-24 | `DELETE /products/{id}` | Without a token | 401; the product still exists | S5 (secured, 401) | R4 | P1 | Auto |
| API-25 | `DELETE /products/{id}` | As admin | 204; a later GET returns 404 | S5 | R6 | P2 | Auto |
| API-26 | `PUT /products/{id}` | Unknown id | 404 | S5 | R5 | P3 | Not run |
| API-27 | `DELETE /products/{id}` | With a customer token | Rejected (401 or 403); the product still exists | S5 ("Admin role is required") | R4 | P1 | Auto |
| API-28 | `DELETE /products/{id}` | Unknown id, as admin | 404 | S5 | R5 | P3 | Not run |
| API-31 | `PUT /products/{id}` | Non-numeric price | 422 like POST; the product is unchanged | S5 | R5 | P2 | Auto |
| API-32 | `PUT /products/{id}` | Empty body | 422 like POST; the product is unchanged | S5 (422) + same required-field assumption as API-21 | R5 | P2 | Auto |

**Re-runnability:** write tests touch only products they create (unique name per run) and delete them in clean-up that runs even when an assertion fails. A test that hits a defect which creates data registers the new id for clean-up. Leftovers are checked by scanning all list pages.

## 4. Load test (Part B)

| ID | Endpoint | Scenario | Status |
|---|---|---|---|
| LT-01 | Decided in phase 7 (proposed: `GET /products`) | ≤ 20 virtual users, < 2 minutes, thresholds set before the run | Planned |

## 5. Considered, not automated

Twelve **groups** of scenarios; one row can cover several cases.

| Scenario group | Reason |
|---|---|
| Quantity "−1" on the detail page | Same equivalence class as "0" (below the minimum); "0" already tests the boundary |
| Login as Jane as a separate test (v1 UI-25) | E2E-01 already proves the login (Jane's name shown) |
| Filter combined with a sub-category; clearing the filter; same product added twice; cart quantity 0 | P3: low impact, not in the stories |
| Payment-method switch resets the form (S2 Payment AC8) | P3 candidate; behaviour not yet confirmed (tester's decision) |
| Positive paths of Cash on Delivery, Buy Now Pay Later, Gift Card | US-4 needs one completed payment; Gift Card has no documented valid test number |
| Real bank account or card verification, reload on the payment step, whitespace handling | No payment gateway in the demo; no documented rule |
| API: page beyond the last page | P3, low risk |
| API: `sort=name,desc` | Descending order is covered for price, name order for ascending |
| API: non-numeric product id | Ids are generated by the API; low risk |
| API: case-insensitive search; search with no result | P3; search negatives are covered by API-13c and API-16 |
| API: unknown brand id | Same equivalence class and defect type as unknown category (API-22d) |
| API: request without `Accept` header | Guards a rejected candidate only; low value |

## 6. Summary

| Part | Auto | Not run | Total |
|---|---|---|---|
| UI | 17 | 1 (UI-27) | 18 |
| API | 29 | 3 (API-16, API-26, API-28) | 32 |
| **Total** | **46** | **4** | **50** |

"Auto" counts planned automation, not executed or passed tests.

Priority split: 13 P1 / 33 P2 / 4 P3. Traceability from acceptance criteria to UI tests: [requirement-analysis.md §9](requirement-analysis.md#9-traceability-acceptance-criteria--planned-tests).
