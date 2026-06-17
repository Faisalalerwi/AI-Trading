// Fair Value Gap Engine v0.6

export function analyzeFVG(candles = []) {

    if (!Array.isArray(candles) || candles.length < 10) {
        return {
            hasBullishFVG: false,
            hasBearishFVG: false,
            bullish: [],
            bearish: [],
            strength: 0,
            reason: "Not enough candles"
        };
    }

    const bullish = [];
    const bearish = [];

    for (let i = 2; i < candles.length; i++) {

        const c1 = candles[i - 2];
        const c2 = candles[i - 1];
        const c3 = candles[i];

        // Bullish FVG
        if (Number(c1.high) < Number(c3.low)) {

            bullish.push({

                top: Number(c3.low),

                bottom: Number(c1.high),

                size: Number(c3.low) - Number(c1.high),

                filled: false,

                index: i

            });

        }

        // Bearish FVG
        if (Number(c1.low) > Number(c3.high)) {

            bearish.push({

                top: Number(c1.low),

                bottom: Number(c3.high),

                size: Number(c1.low) - Number(c3.high),

                filled: false,

                index: i

            });

        }

    }

    // هل تم ملء الفجوة؟

    bullish.forEach(gap => {

        for (let i = gap.index + 1; i < candles.length; i++) {

            if (Number(candles[i].low) <= gap.bottom) {

                gap.filled = true;

                break;

            }

        }

    });

    bearish.forEach(gap => {

        for (let i = gap.index + 1; i < candles.length; i++) {

            if (Number(candles[i].high) >= gap.top) {

                gap.filled = true;

                break;

            }

        }

    });

    const validBullish = bullish.filter(x => !x.filled);

    const validBearish = bearish.filter(x => !x.filled);

    let strength = 0;

    if (validBullish.length)
        strength += 50;

    if (validBearish.length)
        strength += 50;

    return {

        hasBullishFVG: validBullish.length > 0,

        hasBearishFVG: validBearish.length > 0,

        bullish: validBullish,

        bearish: validBearish,

        strength,

        reason:
            validBullish.length || validBearish.length
                ? "Active Fair Value Gaps Found"
                : "No Active FVG"

    };

}