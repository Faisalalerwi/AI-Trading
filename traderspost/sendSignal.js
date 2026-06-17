export async function sendToTradersPost(data, decision) {
    return {
        skipped: true,
        status: "TEST MODE",
        message: "لم يتم إرسال أي شيء إلى TradersPost",
        decision: decision.decision,
        symbol: data.symbol,
        score: decision.score,
        confidence: decision.confidence
    };
}