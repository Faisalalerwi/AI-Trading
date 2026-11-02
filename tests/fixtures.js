// Origin at 8, upward BOS at 9, then price stays above the block.
export function bullishCandles(n = 30) {
    return Array.from({ length: n }, (_, i) => ({
        ...(i < 8 ? { open: 100, high: 102, low: 98, close: 100, volume: 100 }
            : i === 8 ? { open: 101, high: 102, low: 98, close: 99, volume: 200 }
            : i === 9 ? { open: 100, high: 110, low: 100, close: 109, volume: 200 }
            : { open: 110, high: 112, low: 108, close: 111, volume: 100 }),
        time: i + 1
    }));
}
export const compact = candles => candles.map(({ open:o, high:h, low:l, close:c, volume:v, time:t }) => ({ o,h,l,c,v,t }));
export const flatCandles = n => Array.from({ length:n }, () => ({ open:100, high:102, low:98, close:100, volume:100 }));
export function buyData(overrides = {}) {
    return { trend:'bullish', close:111, ema50:100, aboveVWAP:true, rsi:60,
        macd:2, macdSignal:1, volumeState:'high', atrTrend:'good', nearResistance:false,
        buyTrigger:true, sellTrigger:false, inTrade:false, candles:bullishCandles(), ...overrides };
}
