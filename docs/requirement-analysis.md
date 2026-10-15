# Requirement Analysis: US-1 to US-4

**STLC phase:** 1 (Requirement analysis)
**Date:** 2026-10-15
**System under test:** https://practicesoftwaretesting.com (UI v2.5, built 2026-10-11)

## 1. Sources and precedence

| # | Source | Used for |
|---|---|---|
| S1 | Take-home brief, US-1 to US-4 | Primary requirements |
| S2 | Official Toolshop Sprint 5 user stories ([v5.md](https://github.com/testsmith-io/practice-software-testing/blob/main/docs/user-stories/v5.md)), published by the application's maker; **not referenced by the brief** | Secondary oracle for behaviour S1 does not define (rental price, combination discount, minimum quantity, payment fields, account locking) |
| S3 | Official Toolshop documentation ([testsmith-io.github.io/practice-software-testing](https://testsmith-io.github.io/practice-software-testing/#/)) | Public demo account credentials, postcode lookup is a mock |
| S4 | Exploratory session on the live UI and its API, 2026-10-15 | Actual behaviour and current data ([evidence/exploration/](evidence/exploration/)) |

Rules:

- S1 wins over S2. Where S1 and S2 **conflict**, the conflict is raised with the Product Owner instead of being resolved silently (see D6).
- Behaviour seen only in S4 is *observed*, not *required*. An expected result is never taken from the behaviour under test.
- Every expected result names its basis: S1, S2, or a labelled **assumption** (section 5) with a PO question (section 6).

## 2. Facts observed on the system (S4, 2026-10-15)

| Area | Observation | Evidence |
|---|---|---|
| Backend | The UI calls `https://api.practicesoftwaretesting.com`, **not** the `api-with-bugs` host used in Part B. Part A and Part B test different deployments. | Network log |
| Power Tools data | 8 products in Power Tools and its sub-categories (Grinder, Sander, Saw, Drill). 7 are rated **E**; only **Circular Saw** ($80.19) is rated **D**. | API `GET /products?by_category=…`, [01](evidence/exploration/01-power-tools-unfiltered.png) |
| CO₂ scale | The badge tooltip reads "A = most environmentally friendly, E = higher environmental impact". | Badge `title` attribute |
| Environmental filter | The only environmental filter is the checkbox **"Show only eco-friendly products"**. Across all 50 products returned by `GET /products`, `is_eco_friendly = true` holds exactly for rating **B** (12 products); no product is rated A. | API, full catalogue |
| Filter result | With the eco-friendly filter on, Power Tools shows **"There are no products found."** | [02](evidence/exploration/02-power-tools-eco-filter-empty.png) |
| Sorting | *CO₂ Rating (A - E)* and *(E - A)* only reorder the list; all 8 products stay listed. | UI |
| Cart step | Checkout wizard: **1 Cart → 2 Sign in → 3 Billing address → 4 Payment**. The cart step shows Item / Quantity / Price / Total per line and a cart total. After a quantity change the total updates **with a short delay** (server round trip). | [03](evidence/exploration/03-cart-step-saw-x2.png), manual check (tester) |
| Rental | Excavator: $136.50 per hour, duration slider 1–10 h. At 10 h the detail page shows "(Total $1365.00)". | [04](evidence/exploration/04-excavator-10h.png) |
| Combination discount | With Circular Saw × 2 and Excavator × 10 h: line totals $160.38 and $1,365.00, Subtotal $1,525.38, **Discount (15%) −$228.81**, Total **$1,296.57**. The discount applies to the subtotal, not to a line. Removing the rental removes the discount. | [05](evidence/exploration/05-cart-saw-x2-excavator-10h.png), manual check (tester) |
| Rental in cart | The rental line uses the same **Quantity** column for **hours**, with the small label "Item for rent, price per hour". The hours can be typed directly in the cart. The cart badge counts hours as items (2 + 10 = 12). | [05](evidence/exploration/05-cart-saw-x2-excavator-10h.png), manual check (tester) |
| Sign-in step | Two tabs: **Sign in** and **Continue as Guest** (email, first name, last name). A guest reaches the **Billing address** step without logging in, while the navbar still shows **"Sign in"**. | [07](evidence/exploration/07-guest-reaches-billing.png), manual check (tester, with a non-Jane e-mail) |
| Jane Doe | Login inside checkout shows "Hello Jane Doe, you are already logged in." Jane is a **shared** public demo account with **161 invoices** from other users. | Manual check (tester), API `GET /invoices` |
| Billing address | Street and city are pre-filled from the account; **country, postcode and state are not**. A postcode lookup (a documented mock) overwrites street, city and state from country, postcode and house number. After leaving checkout to change the cart, the billing address must be entered again, while the login stays active. | Manual check (tester) |
| Payment step | Only a payment-method dropdown (Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card) and "Check payment". **No order summary** (no product, quantity or total). The stepper still highlights step 3. | [06](evidence/exploration/06-payment-step-no-summary.png) |
| Invoice | An invoice lists Quantity / Product / Price / Total per line, plus invoice number, billing address and payment method. | Manual check (tester, on an existing invoice of the shared account) |

## 3. Story-by-story analysis

### US-1: Filter Power Tools by environmental impact

| | |
|---|---|
| **Acceptance criterion** | Only Power Tools products with a CO₂ rating better than E are listed. |
| **Decision D1** | "Better than E" means rating **A, B, C or D** (S1 wording + the app's own scale tooltip). The app term "eco-friendly" (B only) is **not** treated as equal to the requirement; S1 never uses that word. |
| **Testable interpretation** | After the customer applies the environmental filter in Power Tools, every listed product belongs to Power Tools (including sub-categories) **and** has a rating in {A, B, C, D}, **and** no such product is missing ("only **and all**"). The AC applies to the filter action only, not to sorting or the unfiltered list. |
| **Expected with current data** | Exactly one product: **Circular Saw (D)**. The expected set is derived from the API at run time. |
| **Gap** | The only filter returns **0** products and hides Circular Saw. An "only" check alone would pass on an empty list, which is why "all" is asserted too. |
| **Impact on the flow** | US-2 starts from "the filtered results", which are empty, so US-1 **blocks** the flow as written. The E2E uses a **workaround** (A1) to keep US-2 to US-4 testable; it does **not** claim that US-1 is met. |

### US-2: View product details and add 3 to cart

| | |
|---|---|
| **Acceptance criteria** | (a) The detail page matches the product selected from the list. (b) The cart shows that product with quantity 3 and the correct line total. |
| **Testable interpretation** | (a) Name, unit price and CO₂ rating on the detail page equal those of the selected card. (b) The cart row shows the same name, quantity 3, and line total = 3 × unit price, **computed by the test**, not read from the app. |
| **Expected with current data** | Circular Saw, 3 × $80.19 = **$240.57**. |

### US-3: Reduce quantity 3 → 2 and check out as Jane Doe

| | |
|---|---|
| **Acceptance criteria** | (a) The cart quantity and total update correctly. (b) Checkout requires login; the user logs in as Jane Doe. (c) The checkout summary reflects quantity 2. |
| **Testable interpretation** | (a) After setting quantity 2, line total = cart total = 2 × unit price. The test **waits for** the expected total (the update is delayed), never reads it immediately. (b) As a guest, proceeding from the cart shows a login step, and the billing step is **not** reachable without logging in. Logging in as Jane in that step shows her name. (c) See D2. |
| **Decision D2** | The checkout summary is verified in **two places**: the **cart step** before payment (quantity 2, line and cart total) **and** the **invoice** after payment. The invoice is located by the **invoice number shown on the confirmation of the same run**, never "the latest invoice", because the account is shared. If the run produces no order confirmation or invoice number, the E2E fails at that step; the invoice check is never skipped. |
| **Decision D6** | Requirement **conflict**: S1 says "Checkout requires login", but the app offers "Continue as Guest", and S2 treats guest checkout as a feature (Checkout – Sign In: "the *possibility* to log in"; Chat Widget AC4: "guest details (if not logged in)"). The S1 requirement **stays a requirement**; it is not downgraded to an assumption because the app behaves otherwise. The test (UI-21b) asserts S1. If a guest can proceed, the result is reported as a **potential defect pending PO decision**, with the evidence and both sources, not as a confirmed bug. |
| **Constraint** | Jane is shared and locks after **3 consecutive failed logins** (S2 User Login AC4). Negative login tests **never** use Jane's email. |

### US-4: Add a 10-hour Excavator rental before paying

| | |
|---|---|
| **Acceptance criteria** | (a) The Excavator rental for 10 hours is added with the correct price. (b) Payment can be completed with both the purchased item and the rental included. |
| **Decision D3** | "Correct price" is checked in **two layers**: (1) **mandatory, S1:** the rental line = hourly rate × 10 (also S2 Rental AC3); (2) **additional check based on S2**, not on the brief: subtotal = sum of lines, discount = 15 % × subtotal, total = subtotal − discount (S2 Combination Discount AC1–AC4, assumptions A5 and A6), in the **cart and on the invoice**. A failure in layer 2 is reported against S2. All values are computed by the test from API prices. |
| **Decision D4** | The rental is added **after** reaching the payment step (US-3 first, then US-4 "before I pay"), then the customer returns through checkout. This mid-checkout cart change is the riskier path. Login and billing address are treated as **separate states**: the login persists, the billing address must be entered again. |
| **Decision D5** | The E2E pays by **Bank Transfer**. What it can prove is limited to what the run shows: the app accepts **format-valid** Bank Transfer data, shows a confirmation with an invoice number, and that invoice holds the expected lines. It does **not** prove that a bank account exists or that any external payment happened (the demo has no payment gateway). |
| **Testable interpretation** | (a) Detail page total = 10 × rate; cart has an Excavator line with 10 hours and line total 10 × rate; discount and total as in D3. (b) The order is placed, a confirmation with an invoice number is shown, and that invoice contains **both** lines: Circular Saw × 2 and Excavator × 10. |
| **Expected with current data** | Excavator **$1,365.00**; subtotal $1,525.38; discount $228.81; total **$1,296.57**. |

## 4. Decision log

All QA decisions below were taken by the tester after reviewing the evidence in section 2 (the facts behind D1–D6 were also checked manually by the tester); options and trade-offs were prepared with AI assistance.

| ID | Question | Decision |
|---|---|---|
| D1 | What does "better than E" mean? | A–D. The filter is judged by UI-01 only. The E2E takes an A–D product from the unfiltered Power Tools list as a workaround for the US-1 blocker (A1). |
| D2 | Where is the "checkout summary" checked? | Cart step **and** invoice of the same run (A2). |
| D3 | Does "correct price" include the 15 % discount? | The line price (S1) is mandatory; discount, subtotal and total are an additional check based on S2 (A5, A6). |
| D4 | When is the rental added? | After reaching the payment step (A3). |
| D5 | Which payment method for the E2E? | Bank Transfer (A4). |
| D6 | Guest checkout vs "Checkout requires login"? | Requirement conflict; asserted as written, reported as potential defect pending PO. |
| D7 | May Sprint 5 (S2) be used although the brief does not mention it? | Yes, as a **secondary** source only, for behaviour S1 does not define. S1 wins; conflicts go to the PO and are not reported as confirmed bugs. Every test based on S2 names it in its "Basis" column. |

## 5. Assumptions

| ID | Assumption | Basis | Risk if wrong |
|---|---|---|---|
| A1 | **Workaround for the US-1 blocker:** the E2E continues with the A–D product (Circular Saw) chosen from the unfiltered Power Tools list by its CO₂ badge. This keeps US-2 to US-4 testable; it is not evidence that US-1 is met (UI-01 decides that). If no A–D product exists, the E2E fails with a clear message; it never picks a random product. | D1 | The flow product could change; the filter defect could be a requirement change instead. |
| A2 | The checkout summary is the cart step plus the invoice. | D2 | Low: both are checked. |
| A3 | "Before I pay" means after checkout has started. | D4, story order US-3 → US-4 | Low: totals are the same either way. |
| A4 | Bank Transfer is an acceptable payment method for the E2E. | D5 | Low: other methods need different test data only. |
| A5 | "Correct price" includes the 15 % combination discount on the subtotal. | S2 Combination Discount | Only the expected total changes, not the line price. |
| A6 | **Unconfirmed assumption:** the discount is rounded half-up to 2 decimals. Example for the E2E: 15 % × $1,525.38 = $228.807 → $228.81, total $1,296.57. | Not specified in S1 or S2; PO question 6 | Totals could differ by one cent. |
| A7 | Jane's missing country, state and postcode are environment data, not a defect of the checkout. The test supplies them. | Account data | None for test validity. |
| A8 | The postcode lookup is a mock (S3); its geographic accuracy is out of scope. | S3 | A real lookup defect could be missed. |

## 6. Clarification questions for the Product Owner

1. **US-1:** Should the environmental filter offer "better than E" (A–D), or is "eco-friendly" (B only) the intended feature? With current data it returns no Power Tools at all.
2. **US-1:** Should the filter be a rating threshold (e.g. "C or better") or a multi-select per rating?
3. **US-2:** The flow must start from "the filtered results", which are empty. May the purchase continue with a qualifying product from the unfiltered list while the filter is broken?
4. **US-3:** "Checkout requires login", but the app and Sprint 5 (Chat Widget AC4) allow guest checkout. Should guest checkout be disabled for this feature, or does "requires login" only mean that this scenario is run as Jane?
5. **US-3:** Which screen is the "checkout summary"? The payment step has none.
6. **US-4:** Does "correct price" include the 15 % combination discount, and how is the discount rounded?
7. **US-4:** May rental hours be edited in the cart? If so, does the 1–10 h limit still apply, and should the cart badge count hours as items?
8. **Checkout:** Should the billing address (including country) be pre-filled from the account and kept when the customer leaves checkout to change the cart? May the postcode lookup overwrite an address already entered?

## 7. Risks and environment constraints

| Risk | Mitigation |
|---|---|
| Shared demo data changes (prices, stock, ratings) and daily reset (product ids change) | Expected values derived from the API at run time; no hard-coded prices or ids. |
| Shared Jane Doe account: lockout, address changes, other users' invoices | Never use Jane's email in negative login tests; supply address data in the test; find the invoice by its number from the same run. |
| Delayed UI updates (cart total, address pre-fill) | Condition-based waits on the expected value; no hard sleeps. |
| Slow or unavailable site | Retries in CI mode only; note in the README. |
| UI and Part B use different API deployments | Part A findings are reported against UI v2.5; Part B against API v5 with bugs. |
| Orders created on a public demo | Only the E2E places orders; exploration did not. |

## 8. Candidate findings (to confirm in STLC phase 6)

These are **not confirmed defects**. Each must be reproduced in the automated run, with evidence, before it is reported. A candidate becomes a defect only if its expected behaviour has a basis (S1, or S2 labelled as such); otherwise it stays an observation or a PO question. Severity is decided in phase 6.

| ID | Candidate | Evidence so far | Planned test |
|---|---|---|---|
| C1 | US-1 cannot be met: the only environmental filter (eco-friendly = B) hides the only Power Tools product better than E. | [02](evidence/exploration/02-power-tools-eco-filter-empty.png) + API | UI-01 |
| C2 | A guest can reach billing without logging in, against S1 "Checkout requires login" (potential defect pending PO, see D6). | [07](evidence/exploration/07-guest-reaches-billing.png) + manual check (tester) | UI-21b |
| C3 | The billing country is not pre-filled although the account stores `country: "Austria"` (API `GET /users/me`). Expected basis: S2 Billing AC4 "pre-filled with my account address details" (S2, not S1). | Manual check (tester) + API | UI-26 |
| C4 | Rental hours typed in the cart may bypass the 1–10 h limit of the detail page (inference from S2 Product Detail AC10). | Not yet tested | UI-35 |
| C5 | The stepper still highlights step 3 while the payment step is shown. | [06](evidence/exploration/06-payment-step-no-summary.png) | Observation |
| C6 | The billing address must be entered again after leaving checkout to change the cart. No source defines the expected behaviour, so this stays an **observation**, not a defect. | Manual check (tester) | Observation, PO question 8 |
| O1 | The cart uses one "Quantity" column for pieces and rental hours; the badge counts hours as items. Usability observation, not a defect. | [05](evidence/exploration/05-cart-saw-x2-excavator-10h.png) | PO question 7 |
| O2 | The rental label reads "Item for rent, price per hour" instead of S2's "This is a rental item". Same meaning; wording only. | [05](evidence/exploration/05-cart-saw-x2-excavator-10h.png) | Observation |

## 9. Traceability: acceptance criteria → planned tests

The final test list is decided in the test design (STLC phase 2). Every **acceptance criterion** has at least one P1 test; supporting checks (for example billing field validation) may have a lower priority.

| Story | Acceptance criterion | Planned tests (priority) |
|---|---|---|
| US-1 | Only **and all** Power Tools better than E are listed | UI-01 (P1), E2E-01 step US-1 (P1), UI-02 card price and CO₂ match data (P2) |
| US-2 | Detail page matches the selected product | E2E-01 (P1) |
| US-2 | Cart shows quantity 3 and the correct line total | E2E-01 (P1); edges UI-12 minus at 1, UI-13 quantity "0" (P2) |
| US-3 | Quantity and total update after 3 → 2 | E2E-01 (P1) |
| US-3 | Checkout requires login, as Jane Doe | UI-21 login step shown (P1), UI-21b guest cannot reach billing (P1, D6), E2E-01 login as Jane (P1); negatives UI-23 unknown email, UI-29 empty credentials (P2) |
| US-3 | Checkout summary reflects quantity 2 | E2E-01 cart step + invoice (P1); billing support UI-26 pre-fill (P2), UI-27 required fields (P3, **Not run**: schedule, see below) |
| US-4 | Excavator 10 h added with the correct price | E2E-01 line + discount + total (P1), UI-33 slider 1–10 h (P2), UI-34 removing the rental removes the discount (P2), UI-35 cart hours ≤ 10 (P2, inference) |
| US-4 | Payment completed with both items | E2E-01 Bank Transfer + invoice (P1); payment validation UI-36, UI-38, UI-39, UI-40 (P2); payment-method switch resets the form, S2 Payment AC8 (P3 candidate, **Not run**: schedule, see below) |

Under the tester's schedule decision (time-boxed submission), P3 tests are documented as **Not run** with their reason instead of being automated; P1 and P2 tests are prioritised.

Payment cases considered but **not automated** (other methods' positive paths, gift-card and real card/account verification, reload, whitespace handling) are listed with reasons in the test scenarios document.
