# Final runs (EX3): comparison

Generated from `run1.json`, `run2.json` and `run3.json` (Playwright JSON reports, copied unchanged). Command for every run: `npx playwright test --reporter=list,json` on commit `c105b82`, with no change between runs.

| Run | Start (UTC) | Duration | Passed | Failed | Flaky | Skipped |
|---|---|---|---|---|---|---|
| 1 | 2026-10-15T12:17:55.690Z | 211.7 s | 33 | 16 | 0 | 0 |
| 2 | 2026-10-15T12:23:13.813Z | 216.3 s | 33 | 16 | 0 | 0 |
| 3 | 2026-10-15T12:28:21.320Z | 208.8 s | 32 | 17 | 0 | 0 |

Run 1 has no text log: its console output was filtered on screen and not saved. Runs 2 and 3 have `run2.log` and `run3.log`.

## Per test

| Project | Test | Run 1 | Run 2 | Run 3 | Same in all 3 runs | First error line (run 3) |
|---|---|---|---|---|---|---|
| ui | E2E-01 | passed | passed | passed | yes | - |
| ui | SMOKE-UI | passed | passed | passed | yes | - |
| ui | UI-01 | failed | failed | failed | yes | Error: Power Tools listed after the environmental filter. |
| ui | UI-02 | passed | passed | passed | yes | - |
| ui | UI-12 | passed | passed | passed | yes | - |
| ui | UI-13 | passed | passed | passed | yes | - |
| ui | UI-21 | passed | passed | passed | yes | - |
| ui | UI-21b | failed | failed | failed | yes | Error: a guest reached the billing address step without logging in (D6: potential defect pending PO) |
| ui | UI-23 | passed | passed | passed | yes | - |
| ui | UI-29 | passed | passed | passed | yes | - |
| ui | UI-26 | failed | failed | failed | yes | Error: billing pre-fill vs the stored account address |
| ui | UI-26b | passed (late 0) | passed (late 0) | failed (late 1) | **no** | Error: typed billing input after the profile requests settled |
| ui | UI-33 | passed | passed | passed | yes | - |
| ui | UI-34 | passed | passed | passed | yes | - |
| ui | UI-35 | failed | failed | failed | yes | Error: rental hours stored in the cart after typing 11 |
| ui | UI-38 | passed | passed | passed | yes | - |
| ui | UI-36 | passed | passed | passed | yes | - |
| ui | UI-39 | passed | passed | passed | yes | - |
| ui | UI-40 | passed | passed | passed | yes | - |
| api | API-01 | passed | passed | passed | yes | - |
| api | API-02 | passed | passed | passed | yes | - |
| api | API-04 | passed | passed | passed | yes | - |
| api | API-05 | passed | passed | passed | yes | - |
| api | API-06 | passed | passed | passed | yes | - |
| api | API-06b | failed | failed | failed | yes | Error: is_rental=false: product ids (only and all) |
| api | API-07 | passed | passed | passed | yes | - |
| api | API-08a | passed | passed | passed | yes | - |
| api | API-08b | passed | passed | passed | yes | - |
| api | API-08c | passed | passed | passed | yes | - |
| api | API-09 | failed | failed | failed | yes | Error: products whose is_eco_friendly differs from the S6 rule |
| api | API-10 | passed | passed | passed | yes | - |
| api | API-11 | passed | passed | passed | yes | - |
| api | API-13 | failed | failed | failed | yes | Error: schema errors |
| api | API-13c | failed | failed | failed | yes | Error: search q="claw hammer": product ids (only and all) |
| api | API-15 | passed | passed | passed | yes | - |
| api | API-17 | failed | failed | failed | yes | Error: expect(received).toBe(expected) // Object.is equality |
| api | API-20 | passed | passed | passed | yes | - |
| api | API-21 | passed | passed | passed | yes | - |
| api | API-22a | failed | failed | failed | yes | Error: status for a negative price |
| api | API-22b | passed | passed | passed | yes | - |
| api | API-22c | failed | failed | failed | yes | Error: status for CO2 rating "Z" |
| api | API-22d | failed | failed | failed | yes | Error: status for an unknown category id |
| api | API-23 | passed | passed | passed | yes | - |
| api | API-24 | failed | failed | failed | yes | Error: DELETE status without a token |
| api | API-25 | passed | passed | passed | yes | - |
| api | API-27 | failed | failed | failed | yes | Error: DELETE with a customer token returned 200; expected 401 or 403 |
| api | API-31 | failed | failed | failed | yes | Error: PUT status |
| api | API-32 | failed | failed | failed | yes | Error: PUT status |
| api | SMOKE-API | passed | passed | passed | yes | - |

**48 of 49 tests** have the same status and the same first error line in all three runs.

UI-26b: `late` = `lateProfileResponses`, the number of account profile responses that arrived after the test typed. With 0 the race condition did not occur (annotation "race window not exercised"), so a pass does not show that the defect is fixed; with 1 it occurred and the typed input was wiped.
