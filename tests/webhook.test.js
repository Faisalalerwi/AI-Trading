import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { makeDecision } from '../engine/decisionEngine.js';
import { buyData, bullishCandles, compact } from './fixtures.js';

// Execute the actual server module and registered route. Only external I/O is
// stubbed: no listener, dotenv, logger or broker/network calls can run here.
async function webhook() {
    let handler;
    const sent=[];
    const app={use(){},get(){},post(path,fn){assert.equal(path,'/webhook-tv');handler=fn;},listen(){}};
    const express=Object.assign(()=>app,{json:()=>()=>{}});
    const context=vm.createContext({console:{log(){},error(){}},process:{env:{}}});
    const external={
        'dotenv/config':{}, express:{default:express},
        './engine/decisionEngine.js':{makeDecision},
        './traderspost/sendSignal.js':{sendToTradersPost:async(data,decision)=>{sent.push(decision.decision);return {ok:true};}},
        './utils/logger.js':{log(){}}
    };
    const module=new vm.SourceTextModule(await readFile(new URL('../server.js',import.meta.url),'utf8'),{context});
    await module.link(specifier=>{
        assert.ok(Object.hasOwn(external,specifier),`unexpected dependency ${specifier}`);
        const exports=external[specifier];
        return new vm.SyntheticModule(Object.keys(exports),function(){
            for(const [name,value] of Object.entries(exports)) this.setExport(name,value);
        },{context});
    });
    await module.evaluate();
    return {sent,async invoke(data){
        let result,status=200;
        const res={json(value){result=value;return this;},status(value){status=value;return this;}};
        await handler({body:structuredClone(data)},res);
        return {httpStatus:status,...result};
    }};
}
for (const n of [19,20,21,30]) test(`WEBHOOK-FORMATS-${n}: actual normalization preserves score/bias/decision`,async()=> {
    const route=await webhook();
    const full=await route.invoke(buyData({candles:bullishCandles(n)}));
    const short=await route.invoke(buyData({candles:compact(bullishCandles(n))}));
    assert.equal(full.httpStatus,200); assert.equal(short.httpStatus,200);
    const fields=r=>[r.decision.score,r.decision.smartMoneyScore,r.decision.smartMoneyBias,r.decision.decision,r.decision.candlesCount];
    assert.deepEqual(fields(short),fields(full));
});
test('WEBHOOK-UNDERFILLED: insufficient history never reaches broker',async()=> {
    const route=await webhook();
    const r=await route.invoke(buyData({candles:bullishCandles(19)}));
    assert.equal(r.status,'wait');
    assert.deepEqual(route.sent,[]);
});
test('WEBHOOK-LIFECYCLE: only one BUY and one EXIT with updated trade state',async()=> {
    const route=await webhook();
    await route.invoke(buyData());
    await route.invoke(buyData({inTrade:true}));
    await route.invoke(buyData({inTrade:true,sellTrigger:true}));
    await route.invoke(buyData({inTrade:false,buyTrigger:false,sellTrigger:true}));
    assert.deepEqual(route.sent,['BUY','EXIT']);
});
