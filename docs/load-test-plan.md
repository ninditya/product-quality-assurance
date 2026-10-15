# Load Test Plan (LT-01)

**STLC phase:** 7 (Load testing)
**Date:** 2026-10-15
**Script:** [load-tests/products-list.js](../load-tests/products-list.js)

## 1. Endpoint and why

| | |
|---|---|
| Endpoint | `GET /products` on https://api-with-bugs.practicesoftwaretesting.com (Part B, API v5) |
| Why this one | It is the busiest Product endpoint: every home and category page loads it. It is **read-only**, so a load run changes no data on the shared demo, and it needs no login or test data, so the result reflects the server, not the test setup. |

## 2. Scenario (tester's decisions)

| Item | Value |
|---|---|
| Executor | `ramping-vus` |
| Ramp-up | 0 → 20 virtual users in 20 s |
| Hold | 20 virtual users for 50 s |
| Ramp-down | 20 → 0 in 10 s |
| Duration | Scenario stages: **80 s**, with graceful shutdown (`gracefulRampDown` and `gracefulStop` give a running iteration up to 10 s to finish). The actual wall-clock time can be slightly longer than 80 s; it is reported from the k6 output. The design target is well under the 2-minute limit. |
| Maximum load | 20 virtual users (brief limit) |
| Think time | 1 s per virtual user between requests, to keep the load on the shared demo moderate |
| Request count | Not fixed in advance (it depends on the response times); the actual count is reported from the k6 summary |
| Checks (reported, not thresholds) | status is 200; the body lists products (`data` is a non-empty array, as in the paginated product list of the spec S5) |

## 3. Success thresholds

These are **take-home evaluation criteria, not a production SLA**. The brief sets no SLA.

| Threshold | Value | Basis |
|---|---|---|
| p95 response time | `http_req_duration p(95) < 2000 ms` | Baseline 2026-10-15 17:56 WIB: 10 sequential `GET /products` with curl, all 200, 0.812–0.852 s (median 0.826 s). 2 s ≈ 2.4 × baseline: room for a normal slowdown at 20 VUs, while a clear degradation still fails. Each curl opened a new connection (DNS, TCP, TLS), so the baseline is a rough single-user reference, not a precise one. |
| Failed requests | `http_req_failed rate < 1 %` | A read-only endpoint should not fail under this small load |
| Abort (safety) | `http_req_failed rate < 10 %`, `abortOnFail: true`, evaluated after 10 s | Test plan §9: stop loading the shared demo if it is failing |

**What the abort covers:** it is based on `http_req_failed` only, i.e. requests k6 counts as failed (network errors and HTTP status 4xx/5xx by default). Failed **checks** are reported separately and do **not** raise `http_req_failed`: an HTTP 200 whose body has no products fails a check without triggering the abort. k6 evaluates thresholds periodically, so an abort happens shortly after the rate crosses 10 %, not at the exact request.

## 4. When and how to run

- Run only after the tester approves the endpoint, workload, thresholds and command.
- Not near **00:00 WIB** (17:00 UTC), when the API under test resets its data (empty catalogue for 1–2 minutes).
- Command:

```
npm run test:load
# = k6 run --summary-export=load-tests/results/summary.json load-tests/products-list.js
```

## 5. What will be reported

Workload actually run (VUs, ramp-up, duration), total requests, throughput (requests per second), p95 and other percentiles, error rate, check results, threshold pass/fail, the time of the run and the environment (shared public demo over the internet from Indonesia). Interpretation is limited to what the numbers show for this endpoint, this load and this moment; it is not a capacity statement.
