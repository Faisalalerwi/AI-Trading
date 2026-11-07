// Research-only pre-trade gate. No broker connection or order submission.
export const POLICY = Object.freeze({
  SA: { minRiskPct: 0.01, maxRiskPct: 0.02, maxDailyLossPct: 0.04 },
  US: { minRiskPct: 0.03, maxRiskPct: 0.03, maxDailyLossPct: 0.06 },
  minRewardRisk: 1.5,
  minStockDollarVolume: 1_000_000,
  maxStockSpreadPct: 0.005,
  maxOptionSpreadPct: 0.10,
  minOptionOpenInterest: 500,
  minOptionDailyVolume: 100,
  minOptionDte: 7,
  maxLeverage: 1
});
const valid = n => Number.isFinite(n) && n >= 0;
export function evaluateTrade(trade, account, policy = POLICY) {
  const reasons = [];
  const market = trade?.market;
  const rules = policy[market];
  if (!rules) reasons.push("UNKNOWN_MARKET");
  if (!["stock", "option"].includes(trade?.instrument)) reasons.push("UNKNOWN_INSTRUMENT");
  if (!["BUY", "SELL_TO_CLOSE"].includes(trade?.action)) reasons.push("UNSUPPORTED_ACTION");
  if (!account || !valid(account.equity) || account.equity === 0) reasons.push("INVALID_EQUITY");
  if (!valid(account?.dailyRealizedLoss)) reasons.push("INVALID_DAILY_LOSS");
  if (!valid(trade?.entry) || trade.entry === 0 || !valid(trade?.stop) || trade.stop === 0) reasons.push("INVALID_PRICES");
  if (!valid(trade?.quantity) || !Number.isInteger(trade.quantity) || trade.quantity === 0) reasons.push("INVALID_QUANTITY");
  if (!valid(trade?.estimatedFees) || !valid(trade?.estimatedSlippage)) reasons.push("MISSING_COSTS");
  if (!Number.isFinite(trade?.rewardRisk) || trade.rewardRisk < policy.minRewardRisk) reasons.push("LOW_REWARD_RISK");
  if (trade?.dataVerified !== true) reasons.push("UNVERIFIED_DATA");
  if (trade?.marketOpen !== true) reasons.push("MARKET_CLOSED");
  if (trade?.halted !== false) reasons.push("HALT_UNKNOWN_OR_ACTIVE");
  if (trade?.eventRiskCleared !== true) reasons.push("EVENT_RISK_NOT_CLEARED");
  if (trade?.newsRiskCleared !== true) reasons.push("NEWS_RISK_NOT_CLEARED");
  if (trade?.liquidityVerified !== true) reasons.push("LIQUIDITY_NOT_VERIFIED");
  if (trade?.spreadVerified !== true) reasons.push("SPREAD_NOT_VERIFIED");
  if (trade?.signalConfirmed !== true) reasons.push("SIGNAL_NOT_CONFIRMED");
  if (trade?.marketRegimeApproved !== true) reasons.push("REGIME_NOT_APPROVED");
  if (trade?.paperMode !== true) reasons.push("LIVE_TRADING_DISABLED");
  if (trade?.approvedByHuman !== true) reasons.push("HUMAN_APPROVAL_REQUIRED");
  if (trade?.instrument === "stock") {
    if (!valid(trade?.dollarVolume) || trade.dollarVolume < policy.minStockDollarVolume) reasons.push("LOW_STOCK_VOLUME");
    if (!valid(trade?.spreadPct) || trade.spreadPct > policy.maxStockSpreadPct) reasons.push("WIDE_STOCK_SPREAD");
  }
  if (trade?.instrument === "option") {
    if (market !== "US") reasons.push("OPTIONS_MARKET_UNSUPPORTED");
    if (!valid(trade?.openInterest) || trade.openInterest < policy.minOptionOpenInterest) reasons.push("LOW_OPTION_OI");
    if (!valid(trade?.optionVolume) || trade.optionVolume < policy.minOptionDailyVolume) reasons.push("LOW_OPTION_VOLUME");
    if (!valid(trade?.spreadPct) || trade.spreadPct > policy.maxOptionSpreadPct) reasons.push("WIDE_OPTION_SPREAD");
    if (!Number.isInteger(trade?.dte) || trade.dte < policy.minOptionDte) reasons.push("SHORT_DTE");
    if (!valid(trade?.contractMultiplier) || trade.contractMultiplier === 0) reasons.push("INVALID_MULTIPLIER");
    if (trade?.definedRisk !== true) reasons.push("UNDEFINED_OPTION_RISK");
  }
  if (rules && valid(account?.equity) && valid(account?.dailyRealizedLoss)) {
    if (account.dailyRealizedLoss >= account.equity * rules.maxDailyLossPct) reasons.push("DAILY_STOP_REACHED");
  }
  const multiplier = trade?.instrument === "option" ? trade.contractMultiplier : 1;
  const initialRisk = (trade?.entry - trade?.stop) * trade?.quantity * multiplier;
  const risk = initialRisk + trade?.estimatedFees + trade?.estimatedSlippage;
  let maxRisk = null;
  if (rules && valid(account?.equity) && account.equity > 0) {
    const pct = market === "SA"
      ? (Number.isFinite(account.riskPct) ? account.riskPct : rules.minRiskPct)
      : rules.maxRiskPct;
    if (pct < rules.minRiskPct || pct > rules.maxRiskPct) reasons.push("RISK_PERCENT_OUT_OF_RANGE");
    maxRisk = account.equity * pct;
    if (!Number.isFinite(risk) || risk <= 0) reasons.push("INVALID_STOP_RISK");
    else if (risk > maxRisk) reasons.push("POSITION_RISK_EXCEEDED");
  }
  if (trade?.action === "SELL_TO_CLOSE") reasons.push("CLOSE_ORDERS_REQUIRE_SEPARATE_POSITION_CHECK");
  // This function is a permission gate for simulated entries only.
  return { allowed: reasons.length === 0, mode: "PAPER_ONLY", reasons: [...new Set(reasons)],
    estimatedRisk: Number.isFinite(risk) ? risk : null, maxRisk };
}
