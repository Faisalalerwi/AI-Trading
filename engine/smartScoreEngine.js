export function smartScore(data) {
    let score = 0;
    const reasons = [];

    // الاتجاه
    if (data.trend === "bullish") {
        score += 20;
        reasons.push("الاتجاه صاعد");
    }

    // المتوسط
    if (Number(data.close) > Number(data.ema50)) {
        score += 15;
        reasons.push("السعر فوق EMA50");
    }

    // VWAP
    if (data.aboveVWAP === true) {
        score += 10;
        reasons.push("السعر فوق VWAP");
    }

    // RSI
    if (Number(data.rsi) >= 55 && Number(data.rsi) <= 68) {
        score += 10;
        reasons.push("RSI في منطقة جيدة");
    }

    // MACD
    if (Number(data.macd) > Number(data.macdSignal)) {
        score += 10;
        reasons.push("MACD إيجابي");
    }

    // الفوليوم
    if (data.volumeState === "high") {
        score += 15;
        reasons.push("الفوليوم مرتفع");
    }

    // ATR
    if (data.atrTrend === "good") {
        score += 5;
        reasons.push("التذبذب مناسب");
    }

    // المقاومة
    if (data.nearResistance !== true) {
        score += 10;
        reasons.push("لا توجد مقاومة قريبة");
    }

    // منع الدخول الضعيف
    if (data.trend === "bearish") {
        score -= 25;
        reasons.push("خصم: الاتجاه هابط");
    }

    if (Number(data.rsi) > 75) {
        score -= 15;
        reasons.push("خصم: RSI مرتفع جدًا");
    }

    score = Math.max(0, Math.min(100, score));

    let decision = "WAIT";

    if (score >= 85 && data.buyTrigger === true && data.inTrade !== true) {
        decision = "BUY";
    }

    if (data.inTrade === true && data.sellTrigger === true) {
        decision = "EXIT";
    }

    return {
        decision,
        score,
        confidence: score,
        reason: reasons.join(" + "),
        reasons
    };
}