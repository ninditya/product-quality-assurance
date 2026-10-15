# Test Summary Report

**STLC phase:** 8 (Test closure)
**Date:** 2026-10-15
**Scope:** US-1 to US-4 on https://practicesoftwaretesting.com (UI v2.5), Product endpoints of https://api-with-bugs.practicesoftwaretesting.com (API v5), one load test
**Basis:** [requirement-analysis.md](requirement-analysis.md), [test-plan.md](test-plan.md), [test-scenarios.md](test-scenarios.md), [bug-reports.md](bug-reports.md), [load-test-results.md](load-test-results.md)

## 1. Executive summary

**Recommendation: NO-GO** (tester's decision). The feature does not yet meet all acceptance criteria, and not all exit criteria are met.

Main reasons:

- **2 Critical confirmed defects** in the API: a product can be deleted without a token (BUG-02) and by a non-admin customer (BUG-03).
- **US-1 is not met** (BUG-01, Major): the environmental filter hides the only Power Tools product rated better than E.
- **US-3 "Checkout requires login" is not met** on observed behaviour: a guest can reach the billing step (PO-01, the requirement conflict is pending the PO).
- **EX3 failed**: one test (UI-26b) gave different results in the three final runs.
- **EX9 not verified**: README and clean-clone check are not done yet.

NO-GO means the feature cannot be declared accepted on the current evidence. It does not mean everything failed: the tested UI purchase flow through invoice generation passed for the covered scenario (payment gateway behaviour was not tested; the demo has none), and the load test met its thresholds. A "Pass" on an exit criterion below means that criterion is met, not that all tests passed.

## 2. Test execution summary

Final runs: `npx playwright test --reporter=list,json` (= `npm test`), 3 consecutive runs on commit `c105b82`, no change between runs. Evidence: [evidence/final-runs/](evidence/final-runs/) ([comparison.md](evidence/final-runs/comparison.md)).

| Run | Start (WIB) | Duration | Executed | Passed | Failed | Flaky | Skipped |
|---|---|---|---|---|---|---|---|
| 1 | 19:17:55 | 211.7 s | 49 | 33 | 16 | 0 | 0 |
| 2 | 19:23:13 | 216.3 s | 49 | 33 | 16 | 0 | 0 |
| 3 | 19:28:21 | 208.8 s | 49 | 32 | 17 | 0 | 0 |

49 tests = 46 planned automated scenarios + UI-26b (added for candidate C7) + 2 smoke tests. Not run (P3, time box): UI-27, API-16, API-26, API-28, and the payment-form reset candidate (S2 Payment AC8).

A failed test indicates that the observed result differed from its test expectation. It does not automatically establish a confirmed product defect; classification depends on the available requirements and evidence (section 5): the 17 failing tests of run 3 are 3 confirmed defects, 6 candidate defects, 4 findings against supporting sources, 2 pending-PO items and 2 assumption-based results. Tests that detect a problem are kept failing on purpose (no `test.fail()`, no skipping).

"0 flaky" is Playwright's own count within each run (no test passed only on a retry). It does not cancel the instability between runs shown by UI-26b (section 6).

## 3. Acceptance criteria

| Story | Acceptance criterion (S1) | Status | Evidence |
|---|---|---|---|
| US-1 | Only Power Tools products with a CO₂ rating better than E are listed | **Not met** | UI-01 failed 3/3 (expected `["Circular Saw"]`, actual `[]`); BUG-01 |
| US-2 | The product detail page matches the product selected from the list | Met | E2E-01 passed 3/3 (+ 3 runs with Jane before) |
| US-2 | The cart shows the product with quantity 3 and the correct line total | Met | E2E-01 (line total computed by the test: 3 × unit price) |
| US-3 | The cart quantity and total update correctly (3 → 2) | Met | E2E-01 |
| US-3 | Checkout requires login; the user logs in as Jane Doe | **Not met** | Jane's login works (E2E-01), but a guest reaches billing (UI-21b failed 3/3). The criterion says login is *required*. The conflict with S2 is pending the PO (PO-01); the status stays Not met until the requirement changes or the behaviour is fixed and verified |
| US-3 | The checkout summary reflects the updated quantity of 2 | Met | E2E-01: cart step and the invoice of the same run |
| US-4 | The Excavator rental for 10 hours is added with the correct price | Met | E2E-01: line = hourly rate × 10; additional S2 check (15 % discount, totals) also passed |
| US-4 | Payment can be completed with both items included | Met | E2E-01: Bank Transfer, confirmation with invoice number, invoice lists product × 2 and Excavator × 10 |

Workaround used: the E2E picks the product from the unfiltered Power Tools list (assumption A1), because the filter of US-1 returns nothing. This keeps US-2 to US-4 testable; it is not evidence that US-1 is met.

## 4. Exit criteria

| # | Criterion | Status | Reason and evidence |
|---|---|---|---|
| EX1 | Every P1 scenario is automated and executed | Pass | All 13 P1 tests ran in all three final runs (execution coverage, not all passing) |
| EX2 | Every acceptance criterion has an executed test and a status | Pass | All 8 criteria have an executed test, a final status and an evidence reference (section 3) |
| EX3 | No flaky test: same result in 3 consecutive runs, same cause | **Fail** | 48 of 49 tests identical in status and error; UI-26b passed, passed, failed (section 6) |
| EX4 | Every failing test is explained | Pass | All 17 failing tests map to a confirmed defect, candidate, finding, pending-PO item or assumption (section 5); environment failures were re-run and logged |
| EX5 | Every defect has steps, expected vs actual, evidence, severity and basis; counted as unique | Pass | [bug-reports.md](bug-reports.md) |
| EX6 | Load test within limits; thresholds evaluated with actual numbers | Pass | [load-test-results.md](load-test-results.md): p95 333.23 ms, 0 % failures, max 20 VUs, 1m21s (one run, one endpoint) |
| EX7 | No test data left on the API under test | Pass | Leak check in every write run, and a scan of all list pages after the final runs: 0 "QA take-home" products |
| EX8 | Scenarios not run are listed with a reason | Pass | [test-scenarios.md](test-scenarios.md) (Not run, and "Considered, not automated") |
| EX9 | README covers setup, commands, results, AI usage, assumptions, limitations; works from a clean clone | **Not verified** | README not written yet; clean clone is STLC step 9 |

## 5. Defect summary

Classes as in [bug-reports.md](bug-reports.md); severity never changes a class.

| Class | Count | Items (test) |
|---|---|---|
| Confirmed defects | 3 | BUG-01 filter US-1 (UI-01, Major) · BUG-02 DELETE without token (API-24, Critical) · BUG-03 DELETE by a customer (API-27, Critical) |
| Candidate defects (contract) | 6 | CAND-01 `is_rental=false` (API-06b, Medium) · CAND-02 search schema (API-13, Low) · CAND-03 related 500 (API-17, Low) · CAND-04 CO₂ "Z" 500 (API-22c, Medium) · CAND-05 PUT price 500 (API-31, Medium) · CAND-06 unknown category 500 (API-22d, Low) |
| Findings against supporting sources (not breaches of the brief) | 4 | FIND-01 country not pre-filled (UI-26, Low) · FIND-02 typed input wiped (UI-26b, Medium) · FIND-03 eco flag inverted (API-09, Low) · FIND-04 multi-word search (API-13c, Low) |
| Pending PO | 2 | PO-01 guest checkout (UI-21b) · PO-02 cart keeps 11 rental hours (UI-35) |
| Assumption-based, not defects | 2 | API-22a negative price accepted · API-32 empty PUT answers 200 (data unchanged) |
| Observations | 7 | OBS-01 to OBS-07 |
| Environment problems | 6 | Jane locked, data resets, slow requests, API 500 at 19:09, shared data changes |

Mapping of the 17 failing tests (run 3): UI-01 → BUG-01; UI-21b → PO-01; UI-26 → FIND-01; UI-26b → FIND-02; UI-35 → PO-02; API-06b → CAND-01; API-09 → FIND-03; API-13 → CAND-02; API-13c → FIND-04; API-17 → CAND-03; API-22a → assumption; API-22c → CAND-04; API-22d → CAND-06; API-24 → BUG-02; API-27 → BUG-03; API-31 → CAND-05; API-32 → assumption.

## 6. Stability analysis (EX3)

| Run | UI-26b | `lateProfileResponses` | Typed billing input after the profile requests settled |
|---|---|---|---|
| 1 | passed | 0 (annotation "race window not exercised") | kept |
| 2 | passed | 0 (annotation "race window not exercised") | kept |
| 3 | failed | 1 | wiped |

- **Suite stability:** EX3 is not met. UI-26b depends on whether a late account-profile response arrives after the test types; that did not happen in runs 1 and 2.
- **Validity of FIND-02 (C7):** run 3 reproduced it again (typed `AT / 1010 / 98` became empty). Runs 1 and 2 do not show it is fixed: the condition did not occur.
- The criterion was not changed after seeing the results. The test was not changed during the three runs.

## 7. Load test

One run of LT-01 on `GET /products` (ramp 0 → 20 VUs in 20 s, 50 s at 20 VUs, 10 s down; 1 s think time): 1,039 requests, 12.83 requests/s, p95 333.23 ms, 0 failed requests, 2,078/2,078 checks, all thresholds passed. These are take-home criteria, not an SLA; one run on one read-only endpoint of a shared demo is not evidence of production capacity. Details: [load-test-results.md](load-test-results.md).

## 8. Remaining risks

| Risk | Why it remains |
|---|---|
| Unauthorised deletion of catalogue data (BUG-02, BUG-03) | Confirmed; not fixed |
| Customers cannot use the environmental filter (BUG-01) | Confirmed; US-1 not met |
| Guest checkout vs "requires login" | Business decision pending (PO-01) |
| Lost billing input on a fast or autofilled form (FIND-02) | Reproduced; the test only catches it when the race occurs |
| API returns 500 for invalid input (CAND-03 to CAND-06) | Error handling; exact expected codes to confirm |
| Coverage limits | Chromium desktop only; P3 scenarios not run; payment methods other than Bank Transfer only validated, not paid; no real payment gateway |
| Test oracle limits | UI price checks prove consistency with the product data, not price correctness; API "only and all" filters are compared with the same API's full list; S6 differs from the API under test in id and flag types |
| Shared demo | Data resets (also observed around 19:09 WIB), shared account locking and other users' data changes can affect results |

## 9. Release recommendation

**NO-GO** (tester's decision).

Needed before a re-evaluation:

1. Fix BUG-02 and BUG-03 (DELETE must require an admin token) and re-run API-24, API-27, API-25.
2. Fix BUG-01 (filter "better than E") and re-run UI-01 and E2E-01.
3. PO decision on PO-01 (guest checkout) and PO-02 (cart rental hours); then update or fix accordingly.
4. Make UI-26b deterministic (e.g. delay the second profile response in the test so the race always occurs, and report that it is simulated), then repeat the three final runs for EX3.
5. Complete the README and the clean-clone check (EX9).
6. Confirm the expected responses for CAND-01 to CAND-06 and the assumptions behind API-22a and API-32 (questions Q-API-1 and the PUT rules).

## 10. Lessons learned

- A blocked shared account (Jane locked from 13:41 to 14:05) can stop the main flow; a labelled alternate demo account kept development moving, while the final evidence still used the required account.
- Checking every expected result against the exact sentence of the brief changed two findings (UI-26, UI-26b) from "bug" to "finding against a supporting source".
- A race condition needs a test that records whether the race happened; otherwise a pass is misleading (UI-26b annotation).
- The reference deployment (S6) is not identical to the API under test; it can decide which fields must exist, not their types.
- Observed behaviour can correct a guess: the multi-word search rule was "every word", not "exact phrase" (API-13c).
