// Liquidity Engine v0.5
// يكتشف السيولة: Equal Highs / Equal Lows / Sweep

export function analyzeLiquidity(candles = []) {
    if (!Array.isArray(candles) || candles.length < 20) {
        return {
            hasLiquidity: false,
            buySideLiquidity: false,
            sellSideLiquidity: false,
            sweep: false,
            sweepType: null,
            strength: 0,
            reason: "لا توجد شموع كافية لتحليل السيولة"
        };
    }

    const lookback = Math.min(80, candles.length);
    const recent = candles.slice(-lookback);

    const avgRange = average(
        recent.map(c => Number(c.high) - Number(c.low))
    );

    const tolerance = avgRange * 0.25;

    const equalHighs = findEqualHighs(recent, tolerance);
    const equalLows = findEqualLows(recent, tolerance);

    const sweepUp = detectBuySideSweep(recent, equalHighs);
    const sweepDown = detectSellSideSweep(recent, equalLows);

    let strength = 0;
    const reasons = [];

    if (equalHighs.found) {
        strength += 25;
        reasons.push("توجد سيولة أعلى السعر Equal Highs");
    }

    if (equalLows.found) {
        strength += 25;
        reasons.push("توجد سيولة أسفل السعر Equal Lows");
    }

    if (sweepUp.found) {
        strength += 30;
        reasons.push("تم سحب سيولة علوية");
    }

    if (sweepDown.found) {
        strength += 30;
        reasons.push("تم سحب سيولة سفلية");
    }

    strength = Math.max(0, Math.min(100, strength));

    return {
        hasLiquidity: equalHighs.found || equalLows.found,
        buySideLiquidity: equalHighs.found,
        sellSideLiquidity: equalLows.found,
        sweep: sweepUp.found || sweepDown.found,
        sweepType: sweepUp.found ? "buy_side_sweep" : sweepDown.found ? "sell_side_sweep" : null,
        equalHighs,
        equalLows,
        strength,
        reason: reasons.length ? reasons.join(" + ") : "لا توجد سيولة واضحة"
    };
}

function findEqualHighs(candles, tolerance) {
    for (let i = candles.length - 20; i < candles.length - 2; i++) {
        if (i < 0) continue;

        for (let j = i + 2; j < candles.length - 1; j++) {
            const h1 = Number(candles[i].high);
            const h2 = Number(candles[j].high);

            if (Math.abs(h1 - h2) <= tolerance) {
                return {
                    found: true,
                    level: (h1 + h2) / 2,
                    firstIndex: i,
                    secondIndex: j
                };
            }
        }
    }

    return { found: false, level: null };
}

function findEqualLows(candles, tolerance) {
    for (let i = candles.length - 20; i < candles.length - 2; i++) {
        if (i < 0) continue;

        for (let j = i + 2; j < candles.length - 1; j++) {
            const l1 = Number(candles[i].low);
            const l2 = Number(candles[j].low);

            if (Math.abs(l1 - l2) <= tolerance) {
                return {
                    found: true,
                    level: (l1 + l2) / 2,
                    firstIndex: i,
                    secondIndex: j
                };
            }
        }
    }

    return { found: false, level: null };
}

function detectBuySideSweep(candles, equalHighs) {
    if (!equalHighs.found) return { found: false };

    const last = candles[candles.length - 1];

    const swept =
        Number(last.high) > Number(equalHighs.level) &&
        Number(last.close) < Number(equalHighs.level);

    return {
        found: swept,
        level: equalHighs.level
    };
}

function detectSellSideSweep(candles, equalLows) {
    if (!equalLows.found) return { found: false };

    const last = candles[candles.length - 1];

    const swept =
        Number(last.low) < Number(equalLows.level) &&
        Number(last.close) > Number(equalLows.level);

    return {
        found: swept,
        level: equalLows.level
    };
}

function average(values) {
    const clean = values.filter(v => Number.isFinite(v));
    if (clean.length === 0) return 0;

    return clean.reduce((sum, v) => sum + v, 0) / clean.length;
}