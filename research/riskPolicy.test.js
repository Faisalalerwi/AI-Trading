import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTrade } from "./riskPolicy.js";
const base = {
  market: "SA", instrument: "stock", action: "BUY", entry: 100, stop: 99,
  quantity: 50, estimatedFees: 2, estimatedSlippage: 3, rewardRisk: 2,
  dataVerified: true, marketOpen: true, halted: false,
  eventRiskCleared: true, newsRiskCleared: true, liquidityVerified: true,
  spreadVerified: true, signalConfirmed: true, marketRegimeApproved: true,
  paperMode: true, approvedByHuman: true, dollarVolume: 2_000_000, spreadPct: 0.002
};
const account = { equity: 10_000, dailyRealizedLoss: 0, riskPct: 0.01 };
test("Saudi 1% risk gate accepts supported paper candidate", () => {
  const result = evaluateTrade(base, account);
  assert.equal(result.allowed, true);
  assert.equal(result.estimatedRisk, 55);
  assert.equal(result.maxRisk, 100);
});
test("variable capital changes risk budget", () => {
  assert.equal(evaluateTrade(base, { ...account, equity: 4_000 }).allowed, false);
});
test("Saudi >2% selected risk rejected", () => {
  assert.ok(evaluateTrade(base, { ...account, riskPct: 0.03 }).reasons.includes("RISK_PERCENT_OUT_OF_RANGE"));
});
test("US option 3% budget and option quality checks", () => {
  const option = { ...base, market: "US", instrument: "option", entry: 2, stop: 1.5,
    quantity: 2, contractMultiplier: 100, estimatedFees: 4, estimatedSlippage: 6,
    openInterest: 700, optionVolume: 200, dte: 21, spreadPct: 0.05, definedRisk: true };
  assert.equal(evaluateTrade(option, { equity: 10_000, dailyRealizedLoss: 0 }).allowed, true);
  assert.equal(evaluateTrade({ ...option, dte: 0 }, { equity: 10_000, dailyRealizedLoss: 0 }).allowed, false);
});
test("no live orders; missing event check blocks", () => {
  assert.ok(evaluateTrade({ ...base, paperMode: false }).reasons.includes("LIVE_TRADING_DISABLED"));
  assert.ok(evaluateTrade({ ...base, eventRiskCleared: undefined }).reasons.includes("EVENT_RISK_NOT_CLEARED"));
});
test("daily loss stop blocks candidate", () => {
  assert.ok(evaluateTrade(base, { ...account, dailyRealizedLoss: 400 }).reasons.includes("DAILY_STOP_REACHED"));
});
