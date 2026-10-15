# Bug Reports and Findings

**STLC phase:** 6 (Defect investigation)
**Date:** 2026-10-15
**Systems:** UI https://practicesoftwaretesting.com (v2.5, built 2026-10-11) and its API https://api.practicesoftwaretesting.com · API under test (Part B) https://api-with-bugs.practicesoftwaretesting.com (v5)
**Evidence folder:** [evidence/bugs/](evidence/bugs/)

**Where to find the evidence.** When a row says "attachment", it means data that the test saved during the run (for example, expected vs actual values). You can read it in these files:
- [evidence/final-runs/run3-attachments.json](evidence/final-runs/run3-attachments.json): all text attachments of final run 3, in readable form, grouped by test.
- [evidence/bugs/api-failed-tests-15oct.json](evidence/bugs/api-failed-tests-15oct.json): the failed API tests of the runs at 17:32 and 17:48 WIB, with their error messages and attachments.
- [evidence/bugs/](evidence/bugs/): screenshots and network captures.

The raw reports in [evidence/final-runs/](evidence/final-runs/) (`run1.json` to `run3.json`) contain the same attachments, but base64-encoded. If you run the tests yourself, `npm run report` shows the attachments of your own run.

## 1. How findings are classified

Sources in order of priority (decision D7): **S1** the brief → **S2** Sprint 5 user stories (supporting) → observed behaviour → labelled assumptions. For Part B the API contract is the OpenAPI spec **S5** the brief points to; **S6** (the deployment without bugs) is a supporting reference where S5 is silent.

| Class | Meaning |
|---|---|
| **Confirmed defect** | Reproduced, and the expected behaviour is stated by S1 or S5 |
| **Candidate defect** | Reproduced and deviates from S5, but the exact expected response needs confirmation |
| **Finding (supporting source)** | Reproduced; the expected behaviour comes only from S2 or S6, not from S1/S5 |
| **Pending PO** | Reproduced; requirement conflict or inference, needs a Product Owner decision |
| **Assumption, not confirmed** | Deviates only from an assumption of ours; not reported as a defect |
| **Observation** | Worth knowing; no source defines the expected behaviour |
| **Environment** | A problem of the shared demo, not of the product under test |

Defects are counted as **unique** problems, not failing tests. A severity never changes a class: a candidate stays a candidate, a finding stays a finding. Severity scale: **Critical** (security or data loss, no workaround) / **Major** (an acceptance criterion cannot be met) / **Medium** (wrong behaviour with a workaround) / **Low** (wrong error handling or contract detail, little customer impact). Where the tester has not yet decided, it is marked **proposed**.

## 2. Summary

| ID | Title | Class | Severity | Source of expected result | Test |
|---|---|---|---|---|---|
| BUG-01 | Environmental filter hides the only Power Tools product rated better than E | Confirmed defect | **Major** (tester) | S1 US-1 | UI-01 |
| BUG-02 | DELETE /products/{id} deletes a product without any token | Confirmed defect | **Critical** (tester) | S5 | API-24 |
| BUG-03 | DELETE /products/{id} lets a customer (non-admin) delete a product | Confirmed defect | **Critical** (tester) | S5 | API-27 |
| CAND-01 | `is_rental=false` returns only the rentals | Candidate defect | Medium (tester) | S5 | API-06b |
| CAND-02 | Search results lack the `brand` and `category` objects | Candidate defect | Low (tester, provisional) | S5 | API-13 |
| CAND-03 | Related products of an unknown id answer 500 (HTML) instead of 404 | Candidate defect | Low (tester, provisional) | S5 | API-17 |
| CAND-04 | POST with CO₂ rating "Z" answers 500 instead of 422 | Candidate defect | Medium (tester) | S5 | API-22c |
| CAND-05 | PUT with a non-numeric price answers 500 instead of 422 | Candidate defect | Medium (tester) | S5 | API-31 |
| CAND-06 | POST with an unknown category id answers 500 | Candidate defect (error handling) | Low (tester, provisional) | S5 (422 for validation; 500 undocumented) | API-22d |
| FIND-01 | Billing country is not pre-filled from the account | Finding (S2) | Low (tester) | S2 Billing Address AC4 | UI-26 |
| FIND-02 | A late account pre-fill wipes the billing input the customer typed | Finding (S2) | **Medium** (tester) | S2 Billing Address AC3 + customer input must not be lost | UI-26b |
| FIND-03 | `is_eco_friendly` is inverted against the CO₂ rating | Finding (S6) | Low (tester) | S6 | API-09 |
| FIND-04 | Multi-word search matches any word instead of every word | Finding (S6) | Low (tester) | S6 | API-13c |
| PO-01 | A guest can reach the billing step without logging in | Pending PO | – | S1 US-3 vs S2 | UI-21b |
| PO-02 | The cart stores 11 rental hours | Pending PO | – | Inference from S2 Product Detail AC10 | UI-35 |

Unique items: **3 confirmed defects**, **6 candidate defects**, **4 findings against supporting sources**, **2 pending PO**. Assumption-based results, observations and environment problems are in sections 7–9 and are not counted as defects.

## 3. Confirmed defects

### BUG-01 · Environmental filter hides the only Power Tools product rated better than E
- **Severity:** Major (tester's decision). US-1 cannot be met, and US-2 cannot start "from the filtered results".
- **Expected (S1 US-1):** *"Only Power Tools products with a CO₂ rating better than E are listed."* With current data: Circular Saw (rating D).
- **Actual:** the list is empty: "There are no products found."
- **Steps:** 1) Open https://practicesoftwaretesting.com/category/power-tools (8 products; Circular Saw is rated D). 2) Tick "Show only eco-friendly products".
- **Root-cause evidence:** the UI sends `QUERY /products` with body `{"by_category_slug":"power-tools","eco_friendly":"true"}`; the API answers 200 with `total: 0`. The filter asks for the `eco_friendly` flag (true only for rating B), not for "better than E" (A–D). Circular Saw has `eco false`.
- **Evidence:** [C1-network.json](evidence/bugs/C1-network.json), [C1-eco-filter-empty.png](evidence/bugs/C1-eco-filter-empty.png), [UI-01-filter-empty.png](evidence/bugs/UI-01-filter-empty.png); UI-01 failed 3/3 runs with expected `["Circular Saw"]`, actual `[]`. UI-02 passed: the card data (price, rating) is correct, so the defect is in the filter.
- **Reproducibility:** 3/3 automated runs + network capture, 2026-10-15.

### BUG-02 · DELETE /products/{id} deletes a product without any token
- **Severity:** Critical (tester's decision): an authentication bypass lets anyone delete catalogue data without logging in; no workaround. This severity reflects the potential technical impact. The issue was found on a shared public demo, not in production.
- **Expected (S5):** DELETE is secured (`security: apiAuth`, response 401 documented; "Admin role is required to delete a specific product").
- **Actual:** `204`, and the product is gone (`GET` → 404).
- **Steps:** 1) `POST /products` with a valid body (201, id N). 2) `DELETE /products/N` **without** an Authorization header. 3) `GET /products/N`.
- **Evidence:** [API-24-27-reproduction.txt](evidence/bugs/API-24-27-reproduction.txt) (19:11 WIB: DELETE → 204, GET → 404); API-24 failed in the automated run with the same result ([api-failed-tests-15oct.json](evidence/bugs/api-failed-tests-15oct.json)).
- **Reproducibility:** automated run 17:48 + manual reproduction 19:11.

### BUG-03 · DELETE /products/{id} lets a customer (non-admin) delete a product
- **Severity:** Critical (tester's decision): an authorization bypass lets any logged-in customer delete catalogue data; no workaround. This severity reflects the potential technical impact. The issue was found on a shared public demo, not in production.
- **Expected (S5):** *"Admin role is required to delete a specific product."* A customer token must be rejected (401 or 403).
- **Actual:** `200 {"success":true}`, and the product is gone (`GET` → 404). The main problem is the missing role check; the 200 instead of the documented 204 is secondary.
- **Steps:** 1) Log in as the demo customer (Jane Doe) on the API. 2) `POST /products` (201, id N). 3) `DELETE /products/N` with `Authorization: Bearer <customer token>`. 4) `GET /products/N`.
- **Evidence:** [API-24-27-reproduction.txt](evidence/bugs/API-24-27-reproduction.txt); API-27 in [api-failed-tests-15oct.json](evidence/bugs/api-failed-tests-15oct.json).
- **Reproducibility:** automated run 17:48 + manual reproduction 19:11.

## 4. Candidate defects (deviation from the contract S5)

| ID | Steps | Expected (S5) | Actual | Evidence |
|---|---|---|---|---|
| CAND-01 | `GET /products?is_rental=false` (all pages) | Only and all products that are not rentals (26) | Only the 3 rentals (Excavator, Bulldozer, Crane); all 26 products for sale missing | API-06b attachment |
| CAND-02 | `GET /products/search?q=hammer` | Items are `ProductResponse` with `brand` and `category` objects (S6 search also returns them) | Items carry only `brand_id` / `category_id`; 12 schema errors in each final run (6 results, each missing `brand` and `category`) | API-13 error message in [run3.json](evidence/final-runs/run3.json) (the schema errors are listed there; API-13 saves no attachment); [screenshot](evidence/bugs/CAND-02-search-no-brand-category.png) taken manually in the browser on 2026-10-16 (~05:21 WIB) |
| CAND-03 | `GET /products/999999999/related` | 404 (documented: 200, 404, 405) | 500 with an HTML error page | API-17; [screenshot](evidence/bugs/CAND-03-related-unknown-id-500.png) taken manually in the browser on 2026-10-16 (~05:19 WIB) shows the page "500 Server Error" |
| CAND-04 | `POST /products` with `co2_rating: "Z"` | 422 (enum A–E; 422 documented) | 500 | API-22c |
| CAND-05 | `PUT /products/{id}` with `price: "abc"` | 422 (price is a number; 422 documented) | 500; the stored product is unchanged (full snapshot compared) | API-31 |
| CAND-06 | `POST /products` with `category_id: 999999999` | A client error; 422 is our assumption (S5 does not say references must exist) | 500 (a server error is never documented for client input) | API-22d |

Evidence for all rows: [api-failed-tests-15oct.json](evidence/bugs/api-failed-tests-15oct.json) (runs 17:32 and 17:48 WIB, one run each).

## 5. Findings against supporting sources (not breaches of the brief)

### FIND-01 · Billing country is not pre-filled from the account
- **Severity:** Low (tester's decision): the customer can select the country manually; checkout is not blocked.
- **Basis:** S2 Billing Address AC4: *"the address fields are pre-filled with my account address details."* The brief does not mention billing addresses.
- **Actual:** street (Test street 98) and city (Vienna) are pre-filled; **country is empty**, although Jane's account stores `country: "Austria"` (`GET /users/me`).
- **Evidence:** [UI-26-country-not-prefilled.png](evidence/bugs/UI-26-country-not-prefilled.png); UI-26 attachment `shown {country: ""}` vs `stored {country: "Austria"}`.

### FIND-02 · A late account pre-fill wipes the billing input the customer typed
- **Severity:** Medium (tester's decision). The customer loses the address they entered and must enter it again. Checkout can still be completed.
- **Basis:** S2 Billing Address AC3 (all fields must be filled to proceed) and the general expectation that entered input is not lost. The brief does not cover this behaviour, so it is not a breach of the brief.
- **Steps:** 1) Open checkout and log in as Jane Doe. 2) Open the billing step, go back to the cart, and proceed to billing again. 3) Enter the country, postcode and house number as soon as the form appears.
- **Actual:** a late `GET /users/me` response arrives after the form is shown and clears the entered values: `AT / 1010 / 98` → empty.
- **Evidence:** [UI-26b-typed-input-wiped.png](evidence/bugs/UI-26b-typed-input-wiped.png); UI-26b attachment `{typed: AT/1010/98, kept: ""/""/"", lateProfileResponses: 1}` (the test counts the late profile responses), see [run3-attachments.json](evidence/final-runs/run3-attachments.json). Supporting capture: [FIND-02-users-me-called-repeatedly.png](evidence/bugs/FIND-02-users-me-called-repeatedly.png), taken manually by the tester in DevTools during one checkout session as Jane Doe: `GET /users/me` was sent 6 times (all 200). It shows the repeated profile requests. It does not show when they occurred or which fields were cleared.
- **Reproducibility:** reproduced in 2 runs. One further run could not be completed because the demo cart did not load (environment, see section 9).

### FIND-03 · `is_eco_friendly` is inverted against the CO₂ rating
- **Basis:** S6 only (S5 is silent): S6 sets `B → true`, `C/D/E → false`.
- **Actual:** `B → false` (5 products), `C → false` (2), `D → true` (16), `E → true` (6). Rating A does not occur; not judged.
- **Evidence:** API-09 attachment (S6 rule) in [api-failed-tests-15oct.json](evidence/bugs/api-failed-tests-15oct.json).

### FIND-04 · Multi-word search matches any word instead of every word
- **Basis:** S6 behaviour observed on 2026-10-15: "claw hammer" and "hammer claw" both return only the 3 names containing both words. S5 only says "Search is performed on the name column".
- **Actual:** "claw hammer" also returns Hammer, Thor Hammer, Court Hammer (6 results).
- **Evidence:** API-13c attachment.

## 6. Pending Product Owner decision

### PO-01 · A guest can reach the billing step without logging in
- **Conflict:** S1 US-3: *"Checkout requires login; the user logs in as Jane Doe."* S2 treats guest checkout as a feature (Checkout – Sign In: "the *possibility* to log in"; Chat Widget AC4: "guest details (if not logged in)").
- **Actual:** "Continue as Guest" (non-Jane e-mail) → the billing address step is shown; the navbar still shows "Sign in".
- **Status:** potential defect pending PO (decision D6). UI-21b keeps asserting S1; a pass would only prove billing was not reached within 10 s.
- **Evidence:** [UI-21b-guest-reaches-billing.png](evidence/bugs/UI-21b-guest-reaches-billing.png); manual check by the tester.
- **PO question 4** in the requirement analysis.

### PO-02 · The cart stores 11 rental hours
- **Basis:** inference only. The brief asks for 10 hours but sets no maximum; the 1–10 h limit belongs to the S2 detail-page slider.
- **Actual:** typing 11 hours for the Excavator in the cart is kept after a reload (`storedHours: 11`). The slider on the detail page does stop at 10 (UI-33 passed).
- **Evidence:** [UI-35-cart-keeps-11-hours.png](evidence/bugs/UI-35-cart-keeps-11-hours.png); UI-35 attachment `{typed: 11, storedHours: 11}`.
- **PO question 7** in the requirement analysis.

## 7. Assumption-based results (not reported as defects)

| Test | Result | Why not a defect |
|---|---|---|
| API-22a | A negative price (-1) is accepted (201) | S5 sets no minimum price (question Q-API-1) |
| API-32 | `PUT` with an empty body answers 200 | The required-field rule for PUT is our assumption; the full stored product was unchanged, so no data was damaged |

## 8. Observations

| ID | Observation | Why only an observation |
|---|---|---|
| OBS-01 | The payment step's stepper still highlights step 3 | Cosmetic; no source defines the stepper |
| OBS-02 | The billing address must be entered again after leaving checkout to change the cart, while the login persists | No source defines whether the address is kept (PO question 8) |
| OBS-03 | One "Quantity" column holds pieces and rental hours; the cart badge counts hours as items (2 + 10 = 12) | Usability; PO question 7 |
| OBS-04 | Rental label "Item for rent, price per hour" vs S2 "This is a rental item" | Same meaning, wording only |
| OBS-05 | Checkout sign-in shows "Hello Jane Doe, you are already logged in." vs S2 AC5 "You are already signed in as [First Name] [Last Name]" | Same meaning, wording only; the name is shown |
| OBS-06 | The Excavator detail page shows the category "Drill" ([screenshot](evidence/bugs/OBS-06-excavator-category-drill.png)) | The UI shows the stored data correctly (all three rentals are stored under "Drill"); no requirement covers rental categories |
| OBS-07 | The cart total updates with a short delay after a quantity change | The final total is correct; tests wait for the computed value |

Not reproduced: the v1 candidate "name missing in the already-logged-in message" (the name was shown in every v2 run).

## 9. Environment problems during testing (not product defects)

| Time (WIB) | Problem | Effect | Handling |
|---|---|---|---|
| 13:41–14:05 | Shared Jane Doe account locked on the UI API (HTTP 423) by other users ([screenshot](evidence/bugs/ENV-jane-locked.png) taken at the start of the incident: "Account locked, too many failed attempts") | E2E-01 blocked | Suspended per test plan §9; E2E stabilised with the documented demo account Jack Howe (labelled, not final evidence); final 3 runs with Jane after the account was unlocked |
| ~14:00 | Demo data reset (invoice numbers restarted) | None for the tests | Invoices are found by the number of the same run |
| 13:49 | A UI API request took > 15 s | One E2E run failed | Test redesigned to 1 request; data-API timeout 30 s |
| 17:00 | The demo cart did not load within 10 s | One UI-26b run failed in its setup | Re-run; not counted |
| 19:09 | API under test answered 500 to `GET /products`; ids restarted afterwards (likely a data reset) | Evidence collection paused | Resumed at 19:10 after a 200 |
| all day | Shared demo data changes (e.g. brands "STRANI", "ST545RANI" created by other users) | None | Expected values are always read at run time |
