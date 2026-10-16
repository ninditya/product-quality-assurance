# Load Test Results — GET /products (LT-01)

**STLC phase:** 7 (Load testing)
**Plan:** [load-test-plan.md](load-test-plan.md) · **Script:** [load-tests/products-list.js](../load-tests/products-list.js)

## 1. Test overview

- **Endpoint:** `GET /products` on https://api-with-bugs.practicesoftwaretesting.com (API under test, Part B; shared public demo)
- **Execution time:** 15 October 2026, approximately 18:47–18:48 WIB (summary file written at 18:48:39 WIB)
- **Tool:** Grafana k6 v2.3.0, command `npm run test:load`
- **Maximum virtual users:** 20
- **Scenario:** `ramping-vus`: 0 → 20 VUs over 20 s, 50 s at 20 VUs, 10 s ramp-down (80 s of stages, with graceful shutdown); 1 s think time per VU
- **Test data:** read-only; no products were created, updated or deleted
- **Run by:** the tester; executed once, not repeated

## 2. Results summary

| Metric | Result |
|---|---|
| HTTP requests | 1,039 |
| Request rate | 12.83 requests/second |
| Checks | 2,078 / 2,078 passed |
| HTTP request failures | 0 / 1,039 |
| HTTP failure rate | 0.00 % |
| Average response time | 250.37 ms |
| Median response time (p50) | 237.83 ms |
| p90 response time | 267.48 ms |
| p95 response time | 333.23 ms |
| Minimum response time | 221.81 ms |
| Maximum response time | 558.64 ms |
| Maximum VUs reached | 20 |
| Completed iterations | 1,039 |
| Interrupted iterations | 0 |
| Actual wall-clock duration | 1 minute 21 seconds (`1m21.0s`), according to the k6 terminal output ([screenshot](evidence/load/k6-terminal-output.png)) |

All values except the wall-clock duration come from `load-tests/results/summary.json`. The terminal screenshot shows the same run; some of its values differ by 0.01 ms because the terminal rounds them (for example max 558.63 ms vs 558.64 ms in the JSON).

## 3. Threshold evaluation

| Threshold | Observed result | Status |
|---|---|---|
| p95 response time < 2,000 ms | 333.23 ms | PASS |
| HTTP failure rate < 1 % | 0.00 % | PASS |
| Abort when the failure rate exceeds 10 % | Not triggered | PASS (the run completed) |

These thresholds are acceptance criteria for this take-home test, not official service-level objectives (SLAs). Their basis is in the plan (baseline of 10 sequential requests, median 0.826 s). The thresholds were defined and committed in `73631f8` at 18:45 WIB before the load test run at approximately 18:47–18:48 WIB, and were not changed afterward. Requesting one static URL (`GET /products`, page 1, no query parameters; other pages, filters and search were not loaded) is a known and accepted limitation of this test.

**Reading `summary.json` (k6 export format):** in the `thresholds` objects, `false` means the threshold did **not** fail (e.g. `"p(95)<2000": false` = passed). For the `http_req_failed` metric, `passes` counts samples where the metric evaluates to `true` (the request failed), while `fails` counts samples where it evaluates to `false` (the request did not fail). Therefore, `passes: 0, fails: 1039` means **0 failed requests out of 1,039**. This metric-specific reading does not apply to the separate `checks` results, where `passes: 1039, fails: 0` per check means every check succeeded.

## 4. Response checks

Both checks passed for all 1,039 iterations:

- `status is 200`
- `body lists products` (the response contains a non-empty product array in `data`, as in the paginated list of the spec)

## 5. Interpretation

The endpoint met all configured thresholds during this single run. The p95 response time was 333.23 ms, below the 2-second take-home threshold. No HTTP request failed and no response check failed.

The earlier sequential curl baseline averaged about 0.828 s. This is context only: curl opened a new connection (DNS, TCP, TLS) for each request, while k6 can reuse connections. The two measurements are not directly comparable, and the difference does not show that the API became faster.

## 6. Limitations

- One run, against one read-only endpoint.
- The results do not establish maximum capacity, long-term stability or production performance.
- The 20-VU scenario does not represent all traffic patterns.
- The thresholds are take-home criteria, not official SLAs.
- The API is a shared public demo; results can vary with other users' traffic and service conditions.
- The k6 terminal output is not stored in the repository; only the exported summary is.

**Conclusion:** 1,039 HTTP requests completed with a maximum of 20 VUs in one execution, and all configured thresholds passed. This is evidence of acceptable behaviour under the tested scenario, not proof of production capacity.

## 7. Evidence

- `load-tests/results/summary.json`: exported k6 metrics and threshold data (all numbers above except the duration).
- [evidence/load/k6-terminal-output.png](evidence/load/k6-terminal-output.png): screenshot of the k6 terminal output of the same run, taken by the tester from the terminal where k6 ran; source of the wall-clock duration (`1m21.0s`).
