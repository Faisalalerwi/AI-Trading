// Order Block Engine v0.4
// يستخرج مناطق الأوردر بلوك من الشموع بدون رسم
// مستفيد من فكرة: BOS ثم آخر شمعة معاكسة قبل الكسر

export function analyzeOrderBlocks(candles = []) {
    if (!Array.isArray(candles) || candles.length < 20) {
        return {
            hasBullishOB: false,
            hasBearishOB: false,
            bullish: null,
            bearish: null,
            reason: "لا توجد شموع كافية لاستخراج الأوردر بلوك"
        };
    }

    const lookback = Math.min(100, candles.length);
    const recent = candles.slice(-lookback);

    const avgRange = average(
        recent.map(c => Number(c.high) - Number(c.low))
    );

    const avgVolume = average(
        recent.map(c => Number(c.volume || 0))
    );

    const bullish = findBullishOrderBlock(recent, avgRange, avgVolume);
    const bearish = findBearishOrderBlock(recent, avgRange, avgVolume);

    return {
        hasBullishOB: bullish !== null,
        hasBearishOB: bearish !== null,
        bullish,
        bearish,
        reason: buildReason(bullish, bearish)
    };
}

function findBullishOrderBlock(candles, avgRange, avgVolume) {
    for (let i = candles.length - 2; i >= 10; i--) {
        const current = candles[i];
        const previousHigh = highest(candles.slice(Math.max(0, i - 10), i).map(c => Number(c.high)));

        const bosUp =
            Number(current.close) > previousHigh &&
            Number(current.volume || 0) >= avgVolume;

        if (!bosUp) continue;

        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            const c = candles[j];

            const bearishCandle = Number(c.close) < Number(c.open);
            const range = Number(c.high) - Number(c.low);
            const notHugeCandle = range <= avgRange * 2.2;

            if (bearishCandle && notHugeCandle) {
                const ob = buildOrderBlock(c, "bullish", candles, j, avgVolume);
                if (!ob.broken) return ob;
            }
        }
    }

    return null;
}

function findBearishOrderBlock(candles, avgRange, avgVolume) {
    for (let i = candles.length - 2; i >= 10; i--) {
        const current = candles[i];
        const previousLow = lowest(candles.slice(Math.max(0, i - 10), i).map(c => Number(c.low)));

        const bosDown =
            Number(current.close) < previousLow &&
            Number(current.volume || 0) >= avgVolume;

        if (!bosDown) continue;

        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            const c = candles[j];

            const bullishCandle = Number(c.close) > Number(c.open);
            const range = Number(c.high) - Number(c.low);
            const notHugeCandle = range <= avgRange * 2.2;

            if (bullishCandle && notHugeCandle) {
                const ob = buildOrderBlock(c, "bearish", candles, j, avgVolume);
                if (!ob.broken) return ob;
            }
        }
    }

    return null;
}

function buildOrderBlock(candle, type, candles, index, avgVolume) {
    const top = Number(candle.high);
    const bottom = Number(candle.low);

    let touches = 0;
    let broken = false;

    for (let k = index + 1; k < candles.length; k++) {
        const c = candles[k];

        const touched =
            Number(c.low) <= top &&
            Number(c.high) >= bottom;

        if (touched) touches++;

        if (type === "bullish" && Number(c.close) < bottom) {
            broken = true;
        }

        if (type === "bearish" && Number(c.close) > top) {
            broken = true;
        }
    }

    const fresh = touches <= 1;
    const volumeStrong = Number(candle.volume || 0) >= avgVolume;

    let strength = 50;

    if (fresh) strength += 20;
    if (!broken) strength += 20;
    if (volumeStrong) strength += 10;
    if (touches === 0) strength += 10;
    if (touches > 2) strength -= 20;

    strength = Math.max(0, Math.min(100, strength));

    return {
        type,
        top,
        bottom,
        createdAt: candle.time || candle.t || null,
        strength,
        fresh,
        touches,
        broken,
        valid: !broken && strength >= 70
    };
}

function buildReason(bullish, bearish) {
    if (bullish && bearish) {
        return "تم العثور على أوردر بلوك صاعد وهابط";
    }

    if (bullish) {
        return `تم العثور على أوردر بلوك صاعد بقوة ${bullish.strength}`;
    }

    if (bearish) {
        return `تم العثور على أوردر بلوك هابط بقوة ${bearish.strength}`;
    }

    return "لا يوجد أوردر بلوك صالح حاليًا";
}

function average(values) {
    const clean = values.filter(v => Number.isFinite(v));
    if (clean.length === 0) return 0;

    return clean.reduce((sum, v) => sum + v, 0) / clean.length;
}

function highest(values) {
    return Math.max(...values.filter(v => Number.isFinite(v)));
}

function lowest(values) {
    return Math.min(...values.filter(v => Number.isFinite(v)));
}