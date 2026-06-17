// Market Structure Engine v0.3
// يحلل البنية السعرية: HH / HL / LH / LL / BOS / CHoCH

export function analyzeMarketStructure(candles = []) {
    if (!Array.isArray(candles) || candles.length < 20) {
        return {
            trend: "unknown",
            structure: "insufficient_data",
            bos: false,
            choch: false,
            lastHigh: null,
            lastLow: null,
            reason: "لا توجد شموع كافية للتحليل"
        };
    }

    const highs = candles.map(c => Number(c.high));
    const lows = candles.map(c => Number(c.low));
    const closes = candles.map(c => Number(c.close));

    const recentHigh = Math.max(...highs.slice(-10));
    const previousHigh = Math.max(...highs.slice(-20, -10));

    const recentLow = Math.min(...lows.slice(-10));
    const previousLow = Math.min(...lows.slice(-20, -10));

    const lastClose = closes[closes.length - 1];

    let trend = "sideways";
    let structure = "neutral";
    let bos = false;
    let choch = false;

    if (recentHigh > previousHigh && recentLow > previousLow) {
        trend = "bullish";
        structure = "HH_HL";
    }

    if (recentHigh < previousHigh && recentLow < previousLow) {
        trend = "bearish";
        structure = "LH_LL";
    }

    if (lastClose > previousHigh) {
        bos = true;
    }

    if (trend === "bearish" && lastClose > previousHigh) {
        choch = true;
        trend = "bullish_shift";
    }

    if (trend === "bullish" && lastClose < previousLow) {
        choch = true;
        trend = "bearish_shift";
    }

    return {
        trend,
        structure,
        bos,
        choch,
        lastHigh: recentHigh,
        lastLow: recentLow,
        reason: `Structure: ${structure}, BOS: ${bos}, CHoCH: ${choch}`
    };
}