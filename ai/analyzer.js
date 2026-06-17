export async function reviewWithAI(chartData, engineDecision) {
    return {
        decision: engineDecision.baseDecision,
        confidence: engineDecision.score,
        reason: "تم اعتماد قرار محرك النقاط بدون GPT مؤقتًا"
    };
}