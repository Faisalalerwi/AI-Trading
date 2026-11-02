import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDecision } from '../engine/decisionEngine.js';
import { buyData, bullishCandles, flatCandles, compact } from './fixtures.js';

test('BUY-VALID: all entry conditions produce BUY', async () => {
    const r=await makeDecision(buyData());
    assert.equal(r.decision,'BUY');
    assert.equal(r.score,95);
    assert.equal(r.smartMoneyScore,50);
    assert.equal(r.smartMoneyBias,'neutral'); // score >= 50, bullish bias is not required
});
for (const [name,overrides] of [
    ['trigger false',{buyTrigger:false}], ['trigger missing',{buyTrigger:undefined}],
    ['trigger string',{buyTrigger:'true'}], ['final score below 85',{trend:'bearish',aboveVWAP:false,volumeState:'low',rsi:20,macd:0}],
    ['Smart Money below 50',{candles:flatCandles(30)}]
]) test(`WAIT-GATE: ${name} prevents entry`,async()=> {
    assert.equal((await makeDecision(buyData(overrides))).decision,'WAIT');
});
for (const n of [19,20,21,30]) {
    test(`EXIT-PRIORITY-${n}: active trade exits despite simultaneous buy`,async()=> {
        const r=await makeDecision(buyData({candles:bullishCandles(n),inTrade:true,sellTrigger:true}));
        assert.equal(r.decision,'EXIT');
    });
    test(`NO-DUPLICATE-BUY-${n}: active trade cannot buy again`,async()=> {
        assert.equal((await makeDecision(buyData({candles:bullishCandles(n),inTrade:true}))).decision,'WAIT');
    });
    test(`NO-DUPLICATE-EXIT-${n}: flat account ignores sell trigger`,async()=> {
        assert.equal((await makeDecision(buyData({candles:bullishCandles(n),buyTrigger:false,sellTrigger:true}))).decision,'WAIT');
    });
}
test('TRADE-LIFECYCLE: BUY -> WAIT -> EXIT -> WAIT with caller-updated state',async()=> {
    const data=buyData();
    assert.equal((await makeDecision(data)).decision,'BUY');
    data.inTrade=true;
    assert.equal((await makeDecision(data)).decision,'WAIT');
    data.sellTrigger=true;
    assert.equal((await makeDecision(data)).decision,'EXIT');
    data.inTrade=false; data.buyTrigger=false;
    assert.equal((await makeDecision(data)).decision,'WAIT');
});
for (const candles of [undefined,null,{},[],bullishCandles(19)]) {
    test(`INSUFFICIENT: ${Array.isArray(candles)?candles.length:typeof candles} candles cannot inherit base BUY`,async()=> {
        const r=await makeDecision(buyData({candles}));
        assert.equal(r.candlesCount,Array.isArray(candles)?candles.length:0);
        assert.equal(r.decision,'WAIT');
    });
}
for (const n of [20,21,30]) test(`PIPELINE-NORMALIZATION-${n}: compact/full score, bias, decision match`,async()=> {
    const full=await makeDecision(buyData({candles:bullishCandles(n)}));
    const short=await makeDecision(buyData({candles:compact(bullishCandles(n))}));
    assert.deepEqual([short.score,short.smartMoneyScore,short.smartMoneyBias,short.decision],
        [full.score,full.smartMoneyScore,full.smartMoneyBias,full.decision]);
});
