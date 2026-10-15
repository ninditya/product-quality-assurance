// LT-01: load test for GET /products on the API under test (Part B). Plan: docs/load-test-plan.md.
// Read-only: no product is created, changed or deleted.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_BASE_URL || 'https://api-with-bugs.practicesoftwaretesting.com';

export const options = {
  scenarios: {
    products_list: {
      executor: 'ramping-vus',
      startVUs: 0,
      // Tester's decision: 0 -> 20 VUs in 20 s, hold 20 VUs for 50 s, down to 0 in 10 s (80 s; brief: <= 20 VUs, < 2 min).
      stages: [
        { duration: '20s', target: 20 },
        { duration: '50s', target: 20 },
        { duration: '10s', target: 0 },
      ],
      // A running iteration may finish for at most 10 s after the last stage, so the run stays well under 2 minutes.
      gracefulRampDown: '10s',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    // Take-home success criteria, NOT a production SLA. Basis: baseline of 10 sequential requests, median 0.826 s.
    http_req_duration: ['p(95)<2000'],
    http_req_failed: [
      'rate<0.01', // success criterion: fewer than 1 % failed requests
      // Safety for the shared demo (test plan section 9): abort the run if more than 10 % of requests fail.
      // Evaluated only after 10 s, so a single early failure cannot stop the run on its own.
      { threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '10s' },
    ],
  },
};

export default function () {
  const response = http.get(`${BASE_URL}/products`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'GET /products' },
  });
  // Reported in the summary; not a threshold (only status and the presence of products are checked).
  check(response, {
    'status is 200': (r) => r.status === 200,
    'body lists products': (r) => {
      try {
        return r.json('data').length > 0;
      } catch (e) {
        return false;
      }
    },
  });
  // Tester's decision: 1 s think time per VU, to keep the load on the shared demo moderate.
  sleep(1);
}
