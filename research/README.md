# Multi-agent research — paper-only foundation

This branch adds a **non-executing** research architecture for Saudi equities, US equities, and US listed options. It does not connect to TradingView, Alpaca, or TradersPost and does not place orders. The existing live webhook is unchanged.

## User-approved constraints
- Capital is variable. Risk budget is calculated from current account equity, not a fixed balance.
- Saudi equities: selectable 1–2% **maximum modeled loss per entry**.
- US equities/options: 3% modeled entry risk ceiling; not a profit expectation.
- Intraday and swing hypotheses are eligible. Do not force a holding period.
- Unknown market, news, liquidity, spread, calendar, or event status **blocks** the entry.
- Human approval and `paperMode: true` are mandatory even for simulated entries.
- A hard daily realized-loss gate is set provisionally to 4% Saudi / 6% US; these are **conservative defaults requiring validation**, not user-provided numbers.
- Position sizing assumes a long entry, a lower protective stop, and validated fill-cost estimates. Options need strike/expiry chain quality and defined risk. Stop fills can gap beyond calculated risk; no guarantees.

## Six roles
1. Coordinator: source audit, tasks, reports (no strategy or execution override).
2. News/macro: verified time-stamped events and blackout windows.
3. Chart analyst: confirmed market-structure evidence, including the existing Smart Money / Order Block / Liquidity engines.
4. Researcher: three versioned hypotheses: trend+volume breakout, trend pullback, liquidity-sweep reversal.
5. Validator: chronological walk-forward, purged splits, transaction costs, stress tests, out-of-sample gate (>=30 trades per candidate before scoring).
6. Risk/controller: paper-only simulation gate, risk veto, journaling and human approval.

## Immediate workflow
Run `node --test research/riskPolicy.test.js` locally. This tests risk checks only; it **does not backtest strategies**.

Before empirical validation:
1. Select licensed/authentic historical OHLCV, bid/ask, corporate actions, and option-chain data per market.
2. Implement market calendars (including Saudi/US timezone handling), fees, slippage, realistic fills, and timestamped news.
3. Add a deterministic backtest harness and scenario fixtures for 2020/2022 stress periods.
4. Connect the three strategy signals to existing engines using **read-only interfaces**, then compare out-of-sample metrics.
5. Require repeated positive net expectancy, acceptable drawdown, sufficient sample size, and a score >=18/25 **after** walk-forward validation before considering paper trading.
6. Human review is required for every future live-trading integration. Never silently enable live orders.

## Important security finding
The public repository's main branch contains a tracked `.env` file despite an existing `.gitignore`. **Treat any credentials in that committed file as exposed**: rotate/revoke the original secrets via providers and remove the tracked file and sensitive history using a controlled security remediation. Merely adding `.env` to `.gitignore` does not remove an already tracked copy. Do not copy or print its contents.

## Next milestone
Historical data and cost model first; do not claim a ranking, performance statistics, or daily agent reports before verified data and a reproducible backtester exist.
