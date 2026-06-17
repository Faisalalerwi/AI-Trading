import { calculateScore } from "./scoreEngine.js";
import { reviewWithAI } from "../ai/analyzer.js";

export async function makeDecision(data) {
    const minScore = Number(process.env.MIN_SCORE || 85);
    const { score, reasons } = calculateScore(data);

    let baseDecision = "WAIT";

    if (score >= minScore && data.buyTrigger === true && data.inTrade !== true) {
        baseDecision = "BUY";
    }

    if (data.inTrade === true && data.sellTrigger === true) {
        baseDecision = "EXIT";
    }

    if (baseDecision === "WAIT") {
        return {
            decision: "WAIT",
            score,
            confidence: 0,
            reason: "الشروط غير مكتملة",
            reasons
        };
    }

    const aiReview = await reviewWithAI(data, {
        baseDecision,
        score,
        reasons
    });

    return {
        decision: aiReview.decision || baseDecision,
        score,
        confidence: aiReview.confidence || score,
        reason: aiReview.reason || reasons.join(" + "),
        stopLoss: aiReview.stopLoss || null,
        takeProfit: aiReview.takeProfit || null,
        reasons
    };
}
