// Order Block Engine v1.0
// ICT / Smart Money style
// يكتشف أفضل Bullish/Bearish Order Block مع القوة واللمسات والكسر

export function analyzeOrderBlocks(candles = []) {
    if (!Array.isArray(candles) || candles.length < 20) {
        return emptyResult("لا توجد شموع كافية لاستخراج الأوردر بلوك");
    }

    const clean = candles
        .map(normalizeCandle)
        .filter(c =>
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close)
        );

    if (clean.length < 20) {
        return emptyResult("الشموع غير صالحة للتحليل");
    }

    const avgRange = average(clean.map(c => c.high - c.low));
    const avgVolume = average(clean.map(c => c.volume || 0));

    const bullishBlocks = findBullishBlocks(clean, avgRange, avgVolume);
    const bearishBlocks = findBearishBlocks(clean, avgRange, avgVolume);

    const bullish = bullishBlocks.length
        ? bullishBlocks.sort((a, b) => b.confidence - a.confidence)[0]
        : null;

    const bearish = bearishBlocks.length
        ? bearishBlocks.sort((a, b) => b.confidence - a.confidence)[0]
        : null;

    let best = null;

    if (bullish && bearish) {
        best = bullish.confidence >= bearish.confidence ? "bullish" : "bearish";
    } else if (bullish) {
        best = "bullish";
    } else if (bearish) {
        best = "bearish";
    }

    return {
        hasBullishOB: bullish !== null,
        hasBearishOB: bearish !== null,
        bullish,
        bearish,
        best,
        reason: best
            ? `أفضل أوردر بلوك: ${best} بقوة ${best === "bullish" ? bullish.confidence : bearish.confidence}`
            : "لا يوجد أوردر بلوك صالح حاليًا"
    };
}

function findBullishBlocks(candles, avgRange, avgVolume) {
    const blocks = [];

    for (let i = 8; i < candles.length; i++) {
        const prior = candles.slice(Math.max(0, i - 8), i);
        const priorHigh = highest(prior.map(c => c.high));

        const bos =
            candles[i].close > priorHigh &&
            candleBody(candles[i]) >= avgRange * 0.35;

        if (!bos) continue;

        const originIndex = findLastBearishCandle(candles, i - 1, Math.max(0, i - 8), avgRange);

        if (originIndex === -1) continue;

        const block = buildBlock({
            candles,
            index: originIndex,
            bosIndex: i,
            type: "bullish",
            avgRange,
            avgVolume
        });

        if (block.valid) blocks.push(block);
    }

    return blocks;
}

function findBearishBlocks(candles, avgRange, avgVolume) {
    const blocks = [];

    for (let i = 8; i < candles.length; i++) {
        const prior = candles.slice(Math.max(0, i - 8), i);
        const priorLow = lowest(prior.map(c => c.low));

        const bos =
            candles[i].close < priorLow &&
            candleBody(candles[i]) >= avgRange * 0.35;

        if (!bos) continue;

        const originIndex = findLastBullishCandle(candles, i - 1, Math.max(0, i - 8), avgRange);

        if (originIndex === -1) continue;

        const block = buildBlock({
            candles,
            index: originIndex,
            bosIndex: i,
            type: "bearish",
            avgRange,
            avgVolume
        });

        if (block.valid) blocks.push(block);
    }

    return blocks;
}

function buildBlock({ candles, index, bosIndex, type, avgRange, avgVolume }) {
    const origin = candles[index];

    const top = origin.high;
    const bottom = origin.low;
    const mid = (top + bottom) / 2;

    let touches = 0;
    let broken = false;
    let mitigated = false;
    let retested = false;

    for (let i = bosIndex + 1; i < candles.length; i++) {
        const c = candles[i];

        const touched = c.low <= top && c.high >= bottom;

        if (touched) {
            touches++;
            retested = true;
        }

        if (type === "bullish") {
            if (c.low <= mid) mitigated = true;
            if (c.close < bottom) broken = true;
        }

        if (type === "bearish") {
            if (c.high >= mid) mitigated = true;
            if (c.close > top) broken = true;
        }
    }

    const fresh = touches <= 1;
    const originRange = origin.high - origin.low;
    const notHugeOrigin = originRange <= avgRange * 2.2;
    const volumeStrong = (origin.volume || 0) >= avgVolume;
    const displacement = Math.abs(candles[bosIndex].close - candles[index].close);
    const displacementStrong = displacement >= avgRange * 1.2;

    let strength = 50;

    if (notHugeOrigin) strength += 10;
    if (volumeStrong) strength += 10;
    if (displacementStrong) strength += 15;
    if (fresh) strength += 15;
    if (retested) strength += 5;
    if (mitigated) strength -= 10;
    if (touches > 2) strength -= 20;
    if (broken) strength = 0;

    strength = clamp(strength, 0, 100);

    return {
        type,
        top,
        bottom,
        mid,
        createdAt: origin.time || null,
        originIndex: index,
        bosIndex,
        strength,
        confidence: strength,
        touches,
        fresh,
        retested,
        mitigated,
        broken,
        valid: !broken && strength >= 65,
        reason: buildBlockReason(type, strength, fresh, retested, mitigated, broken)
    };
}

function buildBlockReason(type, strength, fresh, retested, mitigated, broken) {
    if (broken) return `${type} order block مكسور`;

    const parts = [`${type} order block بقوة ${strength}`];

    if (fresh) parts.push("Fresh");
    if (retested) parts.push("Retested");
    if (mitigated) parts.push("Mitigated");

    return parts.join(" + ");
}

function findLastBearishCandle(candles, start, end, avgRange) {
    for (let i = start; i >= end; i--) {
        const c = candles[i];
        const bearish = c.close < c.open;
        const validRange = (c.high - c.low) <= avgRange * 2.2;

        if (bearish && validRange) return i;
    }

    return -1;
}

function findLastBullishCandle(candles, start, end, avgRange) {
    for (let i = start; i >= end; i--) {
        const c = candles[i];
        const bullish = c.close > c.open;
        const validRange = (c.high - c.low) <= avgRange * 2.2;

        if (bullish && validRange) return i;
    }

    return -1;
}

function normalizeCandle(c) {
    return {
        open: Number(c.open ?? c.o ?? c.close ?? c.c),
        high: Number(c.high ?? c.h),
        low: Number(c.low ?? c.l),
        close: Number(c.close ?? c.c),
        volume: Number(c.volume ?? c.v ?? 0),
        time: c.time ?? c.t ?? null
    };
}

function candleBody(c) {
    return Math.abs(c.close - c.open);
}

function average(values) {
    const clean = values.filter(v => Number.isFinite(v));
    if (!clean.length) return 0;
    return clean.reduce((sum, v) => sum + v, 0) / clean.length;
}

function highest(values) {
    return Math.max(...values.filter(v => Number.isFinite(v)));
}

function lowest(values) {
    return Math.min(...values.filter(v => Number.isFinite(v)));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function emptyResult(reason) {
    return {
        hasBullishOB: false,
        hasBearishOB: false,
        bullish: null,
        bearish: null,
        best: null,
        reason
    };
}