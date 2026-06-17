// Smart Money Engine v0.7
// يجمع Market Structure + Order Blocks + Liquidity + FVG

import { analyzeMarketStructure } from "./marketStructureEngine.js";
import { analyzeOrderBlocks } from "./orderBlockEngine.js";
import { analyzeLiquidity } from "./liquidityEngine.js";
import { analyzeFVG } from "./fvgEngine.js";

export function analyzeSmartMoney(candles = []) {

    const structure = analyzeMarketStructure(candles);
    const orderBlocks = analyzeOrderBlocks(candles);
    const liquidity = analyzeLiquidity(candles);
    const fvg = analyzeFVG(candles);

    let score = 0;
    const reasons = [];

    // Market Structure
    if (structure.trend === "bullish" || structure.trend === "bullish_shift") {
        score += 25;
        reasons.push("البنية السعرية صاعدة");
    }

    if (structure.bos === true) {
        score += 15;
        reasons.push("يوجد BOS");
    }

    if (structure.choch === true && structure.trend === "bullish_shift") {
        score += 15;
        reasons.push("يوجد CHoCH إيجابي");
    }

    // Order Block
    if (orderBlocks.hasBullishOB && orderBlocks.bullish?.valid) {
        score += 25;
        reasons.push("يوجد أوردر بلوك صاعد صالح");
    }

    if (orderBlocks.bullish?.strength >= 85) {
        score += 10;
        reasons.push("قوة الأوردر بلوك عالية");
    }

    // Liquidity
    if (liquidity.sweep === true && liquidity.sweepType === "sell_side_sweep") {
        score += 20;
        reasons.push("تم سحب سيولة سفلية");
    }

    // FVG
    if (fvg.hasBullishFVG) {
        score += 15;
        reasons.push("يوجد FVG صاعد");
    }

    score = Math.max(0, Math.min(100, score));

    let bias = "neutral";

    if (score >= 80) {
        bias = "bullish";
    } else if (score <= 30) {
        bias = "bearish";
    }

    return {
        score,
        bias,
        reasons,
        structure,
        orderBlocks,
        liquidity,
        fvg,
        summary: reasons.length ? reasons.join(" + ") : "لا يوجد توافق Smart Money قوي"
    };
}