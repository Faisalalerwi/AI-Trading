import { smartScore } from "./smartScoreEngine.js";
import { analyzeSmartMoney } from "./smartMoneyEngine.js";

export async function makeDecision(data) {

    const base = smartScore(data);

    const candlesCount = Array.isArray(data.candles) ? data.candles.length : 0;

    if (!Array.isArray(data.candles) || candlesCount < 20) {
        return {
            ...base,
            candlesCount,
            smartMoneyScore: 0,
            smartMoneySummary: "لا توجد شموع كافية لتحليل Smart Money"
        };
    }

    const smartMoney = analyzeSmartMoney(data.candles);

    let finalScore = base.score;

    if (smartMoney.bias === "bullish") {
        finalScore += 15;
    }

    if (smartMoney.score >= 80) {
        finalScore += 10;
    }

    finalScore = Math.max(0, Math.min(100, finalScore));

    let decision = "WAIT";

  if (
    finalScore >= 85 &&
    data.buyTrigger === true &&
    smartMoney.score >= 50
) {
    decision = "BUY";
}

    if (data.inTrade === true && data.sellTrigger === true) {
        decision = "EXIT";
    }

    return {
        decision,
        score: finalScore,
        baseScore: base.score,
        smartMoneyScore: smartMoney.score,
        smartMoneyBias: smartMoney.bias,
        confidence: finalScore,
        candlesCount,
        reason: base.reason + " | Smart Money: " + smartMoney.summary,
        smartMoney
    };
}