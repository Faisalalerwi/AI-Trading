# June 17 trading engine regression suite

## Run

Use Node.js 20+ (validated locally with Node.js v24.22.1):

```sh
npm test
```

No new dependencies or install step are needed for these tests. The project is ESM
and has no existing test framework or test script. Tests use `node:test` and
`node:assert/strict`. `--experimental-vm-modules` enables the built-in VM modules
used for controlled threshold tests and the real webhook route harness; Node may
print an experimental-feature warning.

Production baseline: `b087c7ad6ba3538f56923a2b18d6bc64f3fbd789` (`main`).
Local result: **100 tests, 57 passed, 43 failed, 0 skipped/todo**. `npm test`
returns exit code 1. Failures are ordinary assertions, deliberately not hidden
with TODO, skip, inverted expectations, or expected-failure wrappers. This is a
tests-only draft for reviewing current behavior, not a green release candidate.
No production engine or server code is changed.

## Findings that block acceptance

| Regression IDs | Current behavior | Required contract / diagnosis |
| --- | --- | --- |
| `INSUFFICIENT`, `BOUNDARY-19`, `WEBHOOK-UNDERFILLED` | Missing/non-array/empty/19 candles can inherit base `BUY`; webhook forwards it to the broker stub. | `decisionEngine` early return spreads `base.decision`; insufficient history must prohibit entry. |
| `NO-DUPLICATE-BUY-20/21/30`, `TRADE-LIFECYCLE`, `WEBHOOK-LIFECYCLE` | BUY is emitted again even when `inTrade === true`. | Restore an active-position entry guard; removal in cf1b151 is reproduced. |
| `NO-DUPLICATE-EXIT-20/21/30`, `WEBHOOK-LIFECYCLE` | `sellTrigger === true` emits EXIT even after caller changes `inTrade` to false. | Require an active trade for exit, matching the intended lifecycle. |
| `NORMALIZE-LIQUIDITY`, `NORMALIZE-SMART-MONEY`, `PIPELINE-NORMALIZATION-20/21/30` | Raw compact candles differ from full candles at engine APIs. At 20 candles: Smart Money 90/bullish vs 35/neutral, final score 100 vs 95, BUY vs WAIT. At 21/30: Smart Money 50 vs 35, BUY vs WAIT. | Only Order Block normalizes internally. Market Structure, Liquidity and FVG consume long names. Either centralize normalization or explicitly restrict the engine API; the requested equivalence currently fails. |
| `INVALID-missing-close`, `INVALID-inverted-range` | With 20 array slots but only 19 usable OHLC rows, decision is still BUY (Smart Money 55 and 90 respectively). | Validate usable rows before aggregate scoring; array length alone is insufficient. |
| `INVALID-null-row`, `INVALID-undefined-row` | Engine/decision calls throw TypeError. | Handle malformed rows before dereferencing fields. |
| Other `INVALID-*` Liquidity/Smart Money assertions | Missing/nonfinite OHLC can leave liquidity evidence and partial Smart Money scores. | Return safe empty evidence below 20 usable rows. Inverted high/low is not rejected by Order Block's finite-number filter. |

The invalid-data tests declare an explicit safety contract: fewer than 20 usable
OHLC candles must not accumulate actionable evidence. This is a requested safety
expectation, not a claim that all these cases worked historically. Existing
fallbacks for omitted `open` (use close) and omitted `volume` (zero) are covered as
supported behavior rather than classified as malformed input.

The early insufficient-data response also lacks `smartMoneyBias` (and the nested
`smartMoney` analysis) unlike the >=20 response. Tests check the bias where it is
currently part of the returned API, and record this schema asymmetry here rather
than inventing an undocumented neutral/unknown value for it.

## Passing checks

- Liquidity and Order Block reject 19 and analyze 20, 21 and 30 candles. Explicit
  expected strengths and selected blocks prevent a constant empty result passing.
- Smart Money composition is pinned for the deterministic fixture at each count.
  This fixture scores 90 at 20 and 50 at 21/30 because of the moving structure
  windows; monotonicity is not assumed.
- BUY succeeds with all gates satisfied; false/missing/string buy triggers, low
  final score, or Smart Money below 50 produce WAIT.
- Controlled tests distinguish final score 84/85 and Smart Money 49/50, bonuses at
  79/80, bullish bonus and score clamping to 100.
- EXIT wins over simultaneous BUY for active trades at all four candle counts.
- Order Block confidence, best selection, bullish/bearish direction, retest,
  mitigation at the midpoint, and invalidation by close below the block are tested.
- The **actual webhook route** normalizes full/compact candles identically at all
  four counts; this passing check is distinct from the failing raw engine API
  checks. The route module is evaluated unchanged with external I/O stubbed.
- Missing open/volume fallbacks, all-empty rows, and caller-input immutability
  have passing coverage.

## Test organization and isolation

| File | Regressions |
| --- | --- |
| `tests/fixtures.js` | Deterministic bullish origin/BOS/continuation candles, flat candles and compact conversion. |
| `tests/engines.test.js` | 19/20/21/30 boundaries, output fields, Order Block state and engine normalization. |
| `tests/decision.test.js` | Real-engine decision gates, lifecycle, missing history and end-to-end engine pipeline. |
| `tests/decision-thresholds.test.js` | Exact numeric decision boundaries using controlled dependency exports; separate from real-engine integration. |
| `tests/invalid.test.js` | One malformed row among 20, missing fields, optional fallbacks and immutability. |
| `tests/webhook.test.js` | Actual server route normalization and broker-dispatch lifecycle with no network access. |

Lifecycle tests explicitly update `inTrade` between calls. Neither the decision
engine nor server currently persists trade state or deduplicates webhook IDs.
Even restoring state guards would not provide exactly-once execution for stale
payloads, parallel requests or retries; that needs a separate broker/state and
idempotency design. No real order is submitted by any test.

## Change provenance

- [cf1b151: buy gate and removed inTrade guard](https://github.com/Faisalalerwi/AI-Trading/commit/cf1b15194423ca33a0a728bfbadbecae44542d36)
- [5ed4354: Smart Money integration](https://github.com/Faisalalerwi/AI-Trading/commit/5ed43549da47aec01d74413f79f926925a9e9b88)
- [616e977: 20-candle decision boundary](https://github.com/Faisalalerwi/AI-Trading/commit/616e9774a574c8e49d904162e6080e5e03ebdba4)
- [b087c7a: 20-candle liquidity boundary](https://github.com/Faisalalerwi/AI-Trading/commit/b087c7ad6ba3538f56923a2b18d6bc64f3fbd789)
- [08b2c90: Order Block confidence, mitigation and retests](https://github.com/Faisalalerwi/AI-Trading/commit/08b2c907bdae045c8c6326c5e00ae664808ea0e3)
