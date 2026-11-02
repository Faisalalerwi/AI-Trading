import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buyData } from './fixtures.js';

// Isolate decision boundaries from indicator arithmetic; integration fixtures in
// the other files still execute every real engine.
async function decisionWith(baseScore, smartMoneyScore, bias='neutral') {
    const context=vm.createContext({});
    const source=await readFile(new URL('../engine/decisionEngine.js',import.meta.url),'utf8');
    const module=new vm.SourceTextModule(source,{context});
    await module.link(specifier=>{
        const name=specifier==='./smartScoreEngine.js'?'smartScore':'analyzeSmartMoney';
        assert.ok(['./smartScoreEngine.js','./smartMoneyEngine.js'].includes(specifier));
        const fn=name==='smartScore'?()=>({score:baseScore,confidence:baseScore,decision:'BUY',reason:'fixture'}):
            ()=>({score:smartMoneyScore,bias,summary:'fixture'});
        return new vm.SyntheticModule([name],function(){this.setExport(name,fn);},{context});
    });
    await module.evaluate();
    return module.namespace.makeDecision;
}
for (const [base,sm,expected] of [[84,50,'WAIT'],[85,50,'BUY'],[85,49,'WAIT']]) {
    test(`EXACT-GATE: final ${base}, Smart Money ${sm} -> ${expected}`,async()=> {
        const decide=await decisionWith(base,sm);
        assert.equal((await decide(buyData())).decision,expected);
    });
}
for (const [sm,bias,expected] of [[79,'neutral',70],[80,'neutral',80],[79,'bullish',85],[80,'bullish',95]]) {
    test(`BONUS-GATE: base 70, Smart Money ${sm}/${bias} -> ${expected}`,async()=> {
        const decide=await decisionWith(70,sm,bias);
        const r=await decide(buyData());
        assert.equal(r.score,expected);
        assert.equal(r.confidence,expected);
    });
}
test('SCORE-CLAMP: stacked bonuses never exceed 100',async()=> {
    const decide=await decisionWith(95,90,'bullish');
    const r=await decide(buyData());
    assert.equal(r.score,100); assert.equal(r.confidence,100);
});
