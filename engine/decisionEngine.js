import { smartScore } from "./smartScoreEngine.js";
import { analyzeSmartMoney } from "./smartMoneyEngine.js";

export async function makeDecision(data) {

    const base = smartScore(data);

    // إذا ما وصلتنا شموع، نعتمد على القرار القديم فقط
    if (!Array.isArray(data.candles) || data.candles.length < 30) {
        return {
            ...base,
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
        data.inTrade !== true &&
        smartMoney.bias === "bullish"
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
        confidence: finalScore,
        reason: base.reason + " | Smart Money: " + smartMoney.summary,
        smartMoney
    };
}