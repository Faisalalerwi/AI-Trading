import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSmartMoney } from '../engine/smartMoneyEngine.js';
import { analyzeLiquidity } from '../engine/liquidityEngine.js';
import { analyzeOrderBlocks } from '../engine/orderBlockEngine.js';
import { makeDecision } from '../engine/decisionEngine.js';
import { bullishCandles, flatCandles, compact, buyData } from './fixtures.js';

for (const n of [19,20,21,30]) {
    test(`BOUNDARY-${n}: Smart Money composition and exact score/bias`, () => {
        const r = analyzeSmartMoney(bullishCandles(n));
        assert.equal(r.score, n === 19 ? 15 : n === 20 ? 90 : 50);
        assert.equal(r.bias, n === 20 ? 'bullish' : n === 19 ? 'bearish' : 'neutral');
        assert.equal(r.structure.structure === 'insufficient_data', n < 20);
        assert.equal(r.orderBlocks.hasBullishOB, n >= 20);
    });
    test(`BOUNDARY-${n}: liquidity accepts exactly 20, not 30`, () => {
        const r = analyzeLiquidity(flatCandles(n));
        assert.equal(r.hasLiquidity, n >= 20);
        assert.equal(r.buySideLiquidity, n >= 20);
        assert.equal(r.sellSideLiquidity, n >= 20);
        assert.equal(r.strength, n < 20 ? 0 : 50);
        assert.equal(r.sweep, false);
        assert.equal(r.sweepType, null);
    });
    test(`BOUNDARY-${n}: order block best/confidence/fresh flags`, () => {
        const r = analyzeOrderBlocks(bullishCandles(n));
        assert.equal(r.best, n < 20 ? null : 'bullish');
        assert.equal(r.bearish, null);
        if (n < 20) return assert.equal(r.bullish, null);
        assert.equal(r.bullish.confidence, 100);
        assert.equal(r.bullish.strength, 100);
        assert.equal(r.bullish.valid, true);
        assert.equal(r.bullish.mitigated, false);
        assert.equal(r.bullish.retested, false);
        assert.equal(r.bullish.touches, 0);
    });
    test(`BOUNDARY-${n}: decision candlesCount/confidence and no underfilled BUY`, async () => {
        const r = await makeDecision(buyData({ candles:bullishCandles(n) }));
        assert.equal(r.candlesCount, n);
        assert.equal(r.confidence, r.score);
        if (n >= 20) assert.equal(r.smartMoneyBias, analyzeSmartMoney(bullishCandles(n)).bias);
        assert.equal(r.decision, n < 20 ? 'WAIT' : 'BUY');
    });
}
for (const [low,mitigated,confidence] of [[101,false,100],[100,true,95]]) {
    test(`OB-RETEST: wick low ${low} sets retested/mitigated and confidence`, () => {
        const candles = bullishCandles(20);
        candles[19] = { open:105, high:108, low, close:106, volume:100 };
        const r = analyzeOrderBlocks(candles).bullish;
        assert.equal(r.originIndex,8);
        assert.equal(r.bosIndex,9);
        assert.equal(r.retested,true);
        assert.equal(r.mitigated,mitigated);
        assert.equal(r.touches,1);
        assert.equal(r.confidence,confidence);
    });
}
test('OB-BROKEN: close below origin invalidates bullish block', () => {
    const candles = bullishCandles(20);
    candles[19] = {open:100,high:101,low:96,close:97,volume:100};
    assert.equal(analyzeOrderBlocks(candles).bullish,null);
});
test('OB-BEARISH: mirrored fixture selects bearish block', () => {
    const candles = bullishCandles(20).map(c => ({...c,open:200-c.open,high:200-c.low,low:200-c.high,close:200-c.close}));
    const r=analyzeOrderBlocks(candles);
    assert.equal(r.best,'bearish');
    assert.equal(r.bearish.confidence,100);
    assert.equal(r.bearish.mitigated,false);
    assert.equal(r.bearish.retested,false);
});
for (const [name,analyze] of [['OB',analyzeOrderBlocks],['LIQUIDITY',analyzeLiquidity],['SMART-MONEY',analyzeSmartMoney]]) {
    test(`NORMALIZE-${name}: compact candles preserve complete analysis`, () => {
        assert.deepEqual(analyze(compact(bullishCandles())),analyze(bullishCandles()));
    });
}
