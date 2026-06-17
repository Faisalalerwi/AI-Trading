export function calculateScore(data) {
    let score = 0;
    const reasons = [];

    if (data.trend === "bullish") {
        score += 25;
        reasons.push("الاتجاه صاعد");
    }

    if (Number(data.close) > Number(data.ema50)) {
        score += 15;
        reasons.push("السعر فوق المتوسط");
    }

    if (Number(data.rsi) >= 55 && Number(data.rsi) <= 70) {
        score += 10;
        reasons.push("RSI مناسب");
    }

    if (Number(data.macd) > Number(data.macdSignal)) {
        score += 10;
        reasons.push("MACD إيجابي");
    }

    if (data.volumeState === "high") {
        score += 15;
        reasons.push("الفوليوم داعم");
    }

    if (data.aboveVWAP === true) {
        score += 10;
        reasons.push("السعر فوق VWAP");
    }

    if (data.nearResistance !== true) {
        score += 10;
        reasons.push("ليس قريبًا من مقاومة");
    }

    if (data.atrTrend === "good") {
        score += 5;
        reasons.push("ATR مناسب");
    }

    return { score, reasons };
}
