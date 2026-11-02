import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSmartMoney } from '../engine/smartMoneyEngine.js';
import { analyzeLiquidity } from '../engine/liquidityEngine.js';
import { analyzeOrderBlocks } from '../engine/orderBlockEngine.js';
import { makeDecision } from '../engine/decisionEngine.js';
import { bullishCandles, buyData } from './fixtures.js';

// Safety contract: count usable candles, not merely array slots. No invented OHLC.
const cases = {
    'missing-high': c => { delete c.high; return c; },
    'missing-low': c => { delete c.low; return c; },
    'missing-close': c => { delete c.close; return c; },
    'non-numeric-high': c => ({...c,high:'invalid'}),
    'infinite-high': c => ({...c,high:Infinity}),
    'inverted-range': c => ({...c,high:90,low:120}),
    'null-row': () => null,
    'undefined-row': () => undefined
};
for (const [name,corrupt] of Object.entries(cases)) {
    const input = () => { const c=bullishCandles(20); c[0]=corrupt(c[0]); return c; };
    test(`INVALID-${name}: fewer than 20 usable candles cannot BUY`,async()=> {
        const r=await makeDecision(buyData({candles:input()}));
        assert.equal(r.decision,'WAIT');
    });
    test(`INVALID-${name}: Order Block returns empty rather than throwing or inventing block`,()=> {
        const r=analyzeOrderBlocks(input());
        assert.equal(r.best,null);
        assert.equal(r.bullish,null);
        assert.equal(r.bearish,null);
    });
    test(`INVALID-${name}: Liquidity returns safe empty result`,()=> {
        const r=analyzeLiquidity(input());
        assert.equal(r.hasLiquidity,false);
        assert.equal(r.strength,0);
    });
    test(`INVALID-${name}: Smart Money cannot accumulate partial evidence`,()=> {
        const r=analyzeSmartMoney(input());
        assert.equal(r.score,0);
    });
}
for (const name of ['open','volume']) test(`OPTIONAL-${name}: absent field uses existing supported fallback`,async()=> {
    const candles=bullishCandles(20).map(c=> { const r={...c}; delete r[name]; return r; });
    const r=await makeDecision(buyData({candles}));
    assert.ok(Number.isFinite(r.score));
    assert.ok(Number.isFinite(r.smartMoneyScore));
    assert.equal(analyzeOrderBlocks(candles).best,name==='open'?null:'bullish');
});
test('INVALID-EMPTY-ROWS: missing OHLC does not create entry evidence',async()=> {
    const r=await makeDecision(buyData({candles:Array.from({length:20},()=>({}))}));
    assert.equal(r.decision,'WAIT');
    assert.equal(r.smartMoneyScore,0);
});
test('INPUT-IMMUTABILITY: analyses preserve caller candles',async()=> {
    const candles=bullishCandles(20);
    const before=structuredClone(candles);
    analyzeSmartMoney(candles); analyzeLiquidity(candles); analyzeOrderBlocks(candles);
    await makeDecision(buyData({candles}));
    assert.deepEqual(candles,before);
});
