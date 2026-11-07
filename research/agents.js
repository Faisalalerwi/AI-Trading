// Six research roles produce reviewable work items, not autonomous live execution.
export const AGENTS = Object.freeze([
  { id: "coordinator", title: "Research coordinator", output: "daily_report_and_audit_log" },
  { id: "news", title: "News and macro analyst", output: "timestamped_source_evidence" },
  { id: "charts", title: "Market structure analyst", output: "confirmed_chart_signals" },
  { id: "researcher", title: "Strategy and experiment designer", output: "versioned_strategy_hypotheses" },
  { id: "validator", title: "Backtest and out-of-sample validator", output: "cost_adjusted_metrics" },
  { id: "risk", title: "Risk and paper execution controller", output: "reject_or_approve_paper_candidate" }
]);
export const RESEARCH_PROTOCOL = Object.freeze({
  markets: ["SA", "US_STOCKS", "US_OPTIONS"],
  timeframes: ["intraday", "daily", "swing"],
  seedStrategies: ["trend_volume_breakout", "pullback_to_trend", "liquidity_sweep_reversal"],
  trainValidateTest: "chronological_walk_forward_with_purge_and_embargo",
  minOutOfSampleTrades: 30,
  scoring: { outOfSample: 5, walkForward: 5, drawdown: 5, tradeCount: 5, netCosts: 5 },
  promotionThreshold: 18,
  status: "DESIGN_ONLY_NO_RESULTS_CLAIMED",
  dataRequirements: ["adjusted_OHLCV", "corporate_actions", "market_calendar", "bid_ask", "fees", "slippage", "timestamped_news", "options_chains_if_relevant"],
  prohibitions: ["lookahead_bias", "survivorship_bias", "invented_fills", "in_sample_promotion", "live_orders", "unapproved_publication"]
});
export function agentManifest() { return { agents: AGENTS, protocol: RESEARCH_PROTOCOL }; }
