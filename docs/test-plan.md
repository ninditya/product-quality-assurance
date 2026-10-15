# Test Plan

**STLC phase:** 2a (Test planning)
**Date:** 2026-10-15
**Basis:** [requirement-analysis.md](requirement-analysis.md) (sources S1–S4, decisions D1–D7, assumptions A1–A8)

## 1. Objective

Verify the epic *"Purchase power tools and rent equipment"* (US-1 to US-4) on the Toolshop UI, verify the most important Product endpoints of the Toolshop API v5 (with intentional bugs), measure one Product endpoint under a small load, and report findings with evidence.

## 2. Scope

| In scope | Out of scope (and why) |
|---|---|
| US-1 to US-4 on https://practicesoftwaretesting.com (UI v2.5): environmental filter, product detail, cart, checkout sign-in, billing address, payment, rental, invoice | Other UI features (registration, profile, favourites, contact, chat widget, admin, PDF download): not part of the stories |
| Positive, negative and edge cases around each acceptance criterion | Positive paths of Cash on Delivery, Buy Now Pay Later and Gift Card; real bank or card verification (the demo has no payment gateway) |
| Product endpoints of https://api-with-bugs.practicesoftwaretesting.com: list with filters and sorting, detail, search, related, create, update, delete | Other API resources (brands, categories, users, invoices) except as test data or for login; `/reports/top10-purchased-products` (admin reporting) |
| One load test on one Product endpoint (≤ 20 virtual users, < 2 minutes) | Stress, spike or capacity testing: not allowed on a shared demo |
| Chromium, desktop viewport | Other browsers, mobile layouts, accessibility audit: time box |

## 3. References

| Source | Use |
|---|---|
| S1 Take-home brief | Primary requirements (US-1 to US-4, Part B) |
| S2 Toolshop Sprint 5 user stories | Secondary oracle where S1 is silent (D7) |
| S5 OpenAPI spec `/docs?api-docs.json` (Toolshop API 5.0.0) | API contract |
| S6 https://api.practicesoftwaretesting.com (same API without the intentional bugs) | Reference only where the spec is silent or self-evidently wrong; labelled as such |

## 4. Product risks

| ID | Risk | Impact | Likelihood | Priority | Covered by |
|---|---|---|---|---|---|
| R1 | The environmental filter shows the wrong products or hides valid ones (US-1) | High | High: only one filter exists and it is B-only | P1 | UI-01, UI-02 |
| R2 | Wrong line total, rental price, discount or order total (money) | High | Medium | P1 | E2E-01, UI-12, UI-13, UI-33, UI-34, UI-35 |
| R3 | Checkout or payment cannot complete, or accepts invalid payment data | High | Medium | P1 | E2E-01, UI-26, UI-27, UI-36, UI-38, UI-39, UI-40 |
| R4 | Login or authorization can be bypassed (UI checkout, API delete) | High | Medium | P1 | UI-21, UI-21b, UI-23, UI-29, API-24, API-27 |
| R5 | The API accepts invalid data, or fails with 5xx on bad input | Medium | High: the API contains intentional bugs | P2 | API-16, API-17, API-21, API-22a–d, API-26, API-28, API-31, API-32 |
| R6 | API responses break the contract or return wrong data (filters, sorting, search) | Medium | Medium | P1/P2 | API-01 to API-15, API-20, API-23, API-25 |
| R7 | The catalogue endpoint degrades under concurrent use | Medium | Low | P2 | LT-01 |

A **risk priority** is the general priority of the risk. A **scenario priority** (in the test scenarios) can be higher than its risk when that scenario has a higher impact or covers more: for example API-21 (empty body accepted) is P1 although R5 is P2 in general.

## 5. Approach

| Level | Techniques |
|---|---|
| UI end-to-end (one session, US-1 → US-4) | Scenario-based testing; state transitions of the 4-step checkout (including the mid-checkout cart change, D4) |
| UI functional | Equivalence partitioning and boundary values (quantity 0 / 1, rental 1 / 10 h and above 10 in the cart), decision table (discount with or without a rental), error guessing (login, payment fields) |
| API | Contract (schema) testing; data validation ("only **and all**" for filters, order across all pages); CRUD with persistence checks; negative and authorization tests |
| Performance | One load test with ramp-up and thresholds set before the run |
| Exploratory | Manual checks before scripting (done in phase 1 for D1–D6) |

**Priority and automation rule**

| Priority | Meaning | Automation |
|---|---|---|
| P1 | Directly an acceptance criterion, blocks the purchase, affects money, or bypasses security | Always automated |
| P2 | Important behaviour around the criteria, with a clear basis | Automated when the oracle is clear and the test is stable |
| P3 | Low impact or rare | **Not run** in this time box (tester's schedule decision); listed with a reason |

**Expected results:** every expected result names its basis (S1, S2, S5, S6 or a labelled assumption). Prices, ratings, product sets and ids are read from the API at run time, never hard-coded. Derived values (line totals, discount, rental total) are computed by the test, not read from the app.

## 6. Test data and environment

| Item | Decision |
|---|---|
| Accounts | Public demo accounts from the official documentation: Jane Doe (customer), and the demo admin only to delete products the tests created. Credentials come from environment variables, never from test code. |
| Shared account | Negative login tests use an **unknown e-mail**, never Jane's (3 failed logins lock the shared account). Invoices are found by the number of the same run. |
| API write data | Products are created with unique names and deleted in clean-up that also runs when an assertion fails. Seeded products are never modified. |
| Tools | Confirmed in the setup step (phase 3). Proposed: Playwright for UI and API, ajv for schemas, k6 for load. |
| Execution | Sequential (one worker) to keep the load on the shared demo low; retries only in CI. |

## 7. Entry criteria

| # | Criterion | Status (2026-10-15) |
|---|---|---|
| EN1 | The brief and US-1 to US-4 are available | Met |
| EN2 | Both demo sites answer and the API spec can be downloaded | Met (UI 200, API `GET /products` 200, spec 200) |
| EN3 | The demo customer can log in | Met (UI and API); admin login is checked in phase 5 |
| EN4 | Node.js and k6 are installed | Met (Node 22, k6 2.3.0); Playwright is installed in phase 3 |
| EN5 | Requirement analysis reviewed and committed | Met (commit 2dd7827) |

## 8. Exit criteria

| # | Criterion |
|---|---|
| EX1 | Every P1 scenario is automated and executed |
| EX2 | Every acceptance criterion of US-1 to US-4 has an executed test and a status: met, partly met, or not met |
| EX3 | No flaky test: the final suite gives the same result in **3 consecutive runs**, and every failing test fails **for the same reason** (same assertion, same defect) in each run. The same pass/fail count with different causes does not count as stable. |
| EX4 | Every failing test is explained as a product defect, a potential defect pending the PO, a test defect (fixed), or an environment problem (re-run) |
| EX5 | Every reported defect has steps, expected vs actual, evidence, a severity and the basis of its expected result; defects are counted as **unique** defects, not failing tests |
| EX6 | The load test ran within the agreed limits and its thresholds are evaluated with actual numbers |
| EX7 | No test data is left on the API under test (checked by scanning the product list, not by search) |
| EX8 | Scenarios not run are listed with a reason |
| EX9 | The README covers setup, commands, results, AI usage, assumptions and limitations, and works from a clean clone |

Meeting the exit criteria means **testing is complete**, not that the product is ready for release. The release recommendation (Go / No-Go) is given separately in the test summary report.

## 9. Suspension and resumption

| Suspend when | Resume when |
|---|---|
| A demo site does not answer or returns 5xx for more than a few minutes | A smoke request returns data again |
| The API under test resets its data (around 17:00 UTC = 00:00 WIB; catalogue empty for 1–2 minutes) | `GET /products` returns products again |
| The shared Jane Doe account is locked (HTTP 423) | The account can log in again; negative login tests are reviewed first |
| The load test exceeds 10 % failed requests | It aborts by itself; the cause is investigated before any re-run |

## 10. Deliverables

Requirement analysis, this plan, test scenarios, automated UI and API tests, k6 script and load test plan, bug reports with evidence, load test results, test summary report, README.

## 11. Roles

| Role | Responsibility |
|---|---|
| Tester (repository owner) | All QA decisions: scope, priorities, expected results and their basis, defect classification and severity, load workload and thresholds, Go / No-Go; reviews and commits |
| AI assistant (Claude Code) | Prepares options and trade-offs, writes and runs code, collects evidence, drafts documents for review (see README, AI usage) |
