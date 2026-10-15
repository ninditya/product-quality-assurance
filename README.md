# Product Quality Assurance & Test Automation

A risk-based testing suite for web application quality, API reliability, and performance validation.

## Systems under test

| Part | Target |
|---|---|
| A: UI (US-1 to US-4) | https://practicesoftwaretesting.com (Toolshop v2.5) and the API it uses, https://api.practicesoftwaretesting.com |
| B: API (Product collection) | https://api-with-bugs.practicesoftwaretesting.com (hosted version 5, intentionally contains bugs) |

Both are shared public demo systems. Their data changes and resets, and they can be slow or unavailable (see [Known issues](#known-issues-and-limitations)).

## Results at a glance

**Recommendation: NO-GO** (details: [docs/test-summary-report.md](docs/test-summary-report.md)).

| | Result |
|---|---|
| Automated tests | 49 (UI 19, API 30, including 2 smoke tests); P3 scenarios not run |
| Final runs (3 ×, same commit) | 33 / 33 / 32 passed, 16 / 16 / 17 failed, 0 flaky, 0 skipped |
| Acceptance criteria | 6 of 8 met; **US-1 not met**, **US-3 "Checkout requires login" not met** |
| Confirmed defects | 3: environmental filter (Major), DELETE without a token (Critical), DELETE by a customer (Critical) |
| Other findings | 6 candidate defects, 4 findings against supporting sources, 2 pending the Product Owner, 2 assumption-based results |
| Load test (`GET /products`, max 20 VUs, 80 s) | p95 333 ms, 0 % failed requests: all thresholds passed |
| Stability (exit criterion EX3) | **Not met**: UI-26b (a race condition) gave pass, pass, fail |

A failed test means the observed result differed from its expectation. Tests that find a problem are kept failing on purpose; they are not hidden with `test.fail()` or skips. A failed test is not automatically a confirmed defect: see the classification in [docs/bug-reports.md](docs/bug-reports.md).

## Prerequisites

| Tool | Version used | Needed for |
|---|---|---|
| Node.js | 22 (tested with 22.23.2) | UI and API tests |
| npm | bundled with Node.js | installing dependencies |
| Playwright Chromium | installed by the command below | UI tests |
| k6 | 2.3.0 ([install](https://grafana.com/docs/k6/latest/set-up/install-k6/)) | load test only |

Dependency versions are pinned in `package.json` and `package-lock.json` (Playwright 1.64.1, ajv 8.20.0, TypeScript 5.9.3).

## Setup

```
git clone https://github.com/ninditya/product-quality-assurance.git
cd product-quality-assurance
npm ci
npx playwright install chromium
```

### Configuration and credentials

`playwright.config.ts` reads a local `.env` if it exists, otherwise `.env.example`. `.env.example` contains only the URLs and the **public demo accounts** published in the official Toolshop documentation (Jane Doe as customer, the demo admin); no real credentials are used anywhere. `.env` is git-ignored. To override a value, copy `.env.example` to `.env` and edit it.

The demo customer Jane Doe is a shared account that locks after 3 failed logins. The tests only log in with the valid password; negative login tests use a non-existent e-mail.

## Running the tests

| Command | Runs |
|---|---|
| `npm run test:smoke` | 2 read-only smoke checks (UI and API answer). Use this to check the setup |
| `npm run test:ui` | UI tests (Part A) |
| `npm run test:api` | API tests (Part B) |
| `npm test` | the whole suite (UI + API) |
| `npm run test:p1` | only tests tagged `@P1` |
| `npm run report` | opens the last HTML report |
| `npm run typecheck` | TypeScript check |
| `npm run test:load` | the k6 load test (see below) |

**Exit codes:** `npm test`, `npm run test:ui` and `npm run test:api` end with exit code 1 while the known defects exist, because the tests that detect them fail. That is the expected result of this suite. `npm run test:smoke` and `npm run typecheck` are expected to end with 0.

**Effects on the shared demo:** each full run places one real order with the Jane Doe account (E2E-01) and creates about ten API products, each deleted by the test that created it (only ids registered by that test, never by name). Tests run with one worker to keep the load low.

### Load test

```
npm run test:load
```

Runs [load-tests/products-list.js](load-tests/products-list.js): `GET /products`, 0 → 20 virtual users in 20 s, 50 s at 20, 10 s down, 1 s think time; thresholds p95 < 2 s and < 1 % failed requests, abort above 10 % failed requests. It writes `load-tests/results/summary.json`. Please run it only occasionally (shared demo) and not around 00:00 WIB (17:00 UTC), when the API resets its data. Plan and results: [docs/load-test-plan.md](docs/load-test-plan.md), [docs/load-test-results.md](docs/load-test-results.md).

## Repository structure

```
docs/
  requirement-analysis.md   facts, decisions D1–D7, assumptions, PO questions, traceability
  test-plan.md              scope, risks, entry/exit criteria, suspension rules
  test-scenarios.md         prioritised scenarios with the basis of each expected result
  bug-reports.md            defects and findings with steps, expected vs actual, evidence, severity
  load-test-plan.md         load scenario and thresholds
  load-test-results.md      load test results and interpretation
  test-summary-report.md    exit criteria, acceptance criteria, Go/No-Go
  evidence/                 screenshots, network captures, raw run reports
ui-tests/                   Playwright UI tests: pages/ (page objects), specs/, data/, helpers/
api-tests/                  Playwright API tests: specs/, helpers/ (client, schemas, test data)
load-tests/                 k6 script and exported results
```

## Tool choices

- **Playwright (TypeScript)** for both UI and API tests: one runner, one report, shared fixtures; auto-waiting assertions avoid fixed sleeps.
- **ajv** to validate API responses against JSON schemas derived from the OpenAPI spec.
- **k6** for the load test: scripted scenarios with ramp-up and built-in thresholds, and it runs from the command line.

## How the expected results were decided

Every expected result names its source (column "Basis" in [docs/test-scenarios.md](docs/test-scenarios.md)): the brief first, then the official Toolshop Sprint 5 user stories as a supporting source (the brief does not reference them), the OpenAPI spec for Part B, the bug-free deployment only where the spec is silent, and labelled assumptions with Product Owner questions. Prices, ratings and product sets are read at run time; totals and discounts are computed by the tests, not read from the app.

## Assumptions

The main assumptions (full list in [docs/requirement-analysis.md](docs/requirement-analysis.md)):

- "Better than E" means rating A–D; the app's "eco-friendly" filter (B only) is not treated as equal to the requirement.
- Because the filter returns nothing, the end-to-end test picks the A–D product from the unfiltered list (a workaround; it does not count as US-1 being met).
- The "checkout summary" is checked on the cart step and on the invoice of the same run.
- "Correct price" includes the 15 % rental + purchase discount (Sprint 5; rounding half-up, unconfirmed).
- The rental is added after reaching the payment step; payment uses Bank Transfer (format-valid data, no real account).
- API: the fields a product requires, a minimum price and existing category references are assumptions where the spec is silent.

## Known issues and limitations

- **Shared demo:** on 2026-10-15 the data apparently reset around 14:00 and 19:09 WIB (invoice numbers and product ids restarted), besides the reset around 00:00 WIB; the shared Jane Doe account was locked by other users (observed 13:41–14:05 WIB); other users change data. Tests read expected values at run time; an environment failure is re-run, not reported as a defect.
- **UI-26b** reproduces a race condition and is not deterministic: it only fails when a late account response arrives after typing (annotation "race window not exercised" otherwise). This is why EX3 is not met.
- **Test oracles:** UI price checks prove consistency with the product data, not that a price is right; API "only and all" filter checks compare with the same API's full list; the bug-free deployment differs from the API under test in id and flag types, so it only decides which fields must exist.
- **Coverage:** Chromium desktop only; P3 scenarios not run; payment methods other than Bank Transfer only validated, never paid; no payment gateway; one load-test run on one read-only endpoint, not a capacity test.
- **Clean-up:** if the API ever answered 201 without an id, that product could not be deleted automatically; the test reports it as a leak instead of deleting by name.

## How AI was used

**Tools.** I used Claude Code (Anthropic) as a pair programmer for repository work. I used ChatGPT (OpenAI) to improve the wording of my notes and decisions and to review my work plan once.

**Working rules.** I gave Claude Code instructions (kept locally, not in this repository) to follow the STLC step by step, explain risks and options, recommend an approach, and wait for my decision before implementing changes. I kept decisions about unclear requirements, expected results, priorities, defect classifications, and severity under my control. I also required evidence for test results, prohibited weakening assertions to make tests pass, required the changed files and commit message to be shown before every commit, and required approval of the load test design before execution. I reviewed and made every commit myself.

**Work delegated to AI.** I used AI to help explore the application and API, draft documentation, develop page objects, tests and helper functions, prepare the k6 script, execute tests, collect evidence, and analyse initial failures.

**My decisions and corrections.** I reviewed the evidence and made the final QA decisions, including acceptance criteria, test priorities, expected results, defect classifications and severity, load test thresholds, and the NO-GO recommendation. Before deciding, I checked the facts behind the main requirement decisions (D1–D6) manually in the browser. For example, I changed the US-3 login criterion from "Partly met" to "Not met" after comparing the observed behaviour with the requirement. I also lowered a finding's severity from Medium to Low, distinguished findings against supporting sources from confirmed defects, and kept only four payment validation tests out of around 40 candidate payment cases, because most lacked a clear basis in the requirements.

I did not accept every AI-generated conclusion without checking it. I requested evidence for expected results, revised the multi-word search rule after observing the reference API, required full-object checks after rejected updates, and ensured test cleanup verified records through GET requests and targeted only IDs created by the tests. For the UI-26b race condition, I required the test to record whether the race actually occurred.

**Verification.** I reviewed test results and supporting evidence, ran the k6 load test myself, retained the raw JSON reports of three consecutive final suite runs (and the text logs of runs 2 and 3), checked for leftover test data, and scanned the evidence for secrets. The three runs used the same commit and test configuration. Their differing UI-26b results were reported rather than hidden.

**Earlier AI-driven round.** I had completed an earlier, AI-driven round of the assignment locally. I used it as a reference for comparison, not as unquestioned evidence. I rechecked and reconsidered the items carried into this version.
