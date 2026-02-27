
// Helper for "change" (diff)
function calculateChange(arr: number[]): number[] {
    const result = new Array(arr.length).fill(0);
    for (let i = 1; i < arr.length; i++) {
        result[i] = arr[i] - arr[i - 1];
    }
    return result;
}

// Helper for crossover
function calculateCrossover(series1: number[], series2: number[] | number): boolean[] {
    const result = new Array(series1.length).fill(false);
    const isNum = typeof series2 === 'number';
    
    for (let i = 1; i < series1.length; i++) {
        const prev1 = series1[i - 1];
        const curr1 = series1[i];
        const prev2 = isNum ? (series2 as number) : (series2 as number[])[i - 1];
        const curr2 = isNum ? (series2 as number) : (series2 as number[])[i];
        
        if (prev1 <= prev2 && curr1 > curr2) {
            result[i] = true;
        }
    }
    return result;
}

// Helper for crossunder
function calculateCrossunder(series1: number[], series2: number[] | number): boolean[] {
    const result = new Array(series1.length).fill(false);
    const isNum = typeof series2 === 'number';
    
    for (let i = 1; i < series1.length; i++) {
        const prev1 = series1[i - 1];
        const curr1 = series1[i];
        const prev2 = isNum ? (series2 as number) : (series2 as number[])[i - 1];
        const curr2 = isNum ? (series2 as number) : (series2 as number[])[i];
        
        if (prev1 >= prev2 && curr1 < curr2) {
            result[i] = true;
        }
    }
    return result;
}

// Helper for SMA if not imported
function sma(data: number[], period: number): number[] {
    const result = new Array(data.length).fill(0);
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        result[i] = sum / period;
    }
    return result;
}

// Helper for Stdev if not imported
function stdev(data: number[], period: number): number[] {
    const result = new Array(data.length).fill(0);
    const smaVals = sma(data, period);
    
    for (let i = period - 1; i < data.length; i++) {
        let sumSqDiff = 0;
        for (let j = 0; j < period; j++) {
            const diff = data[i - j] - smaVals[i];
            sumSqDiff += diff * diff;
        }
        result[i] = Math.sqrt(sumSqDiff / period);
    }
    return result;
}

// Helper for RSI if not imported
function rsi(close: number[], period: number): number[] {
    const result = new Array(close.length).fill(0);
    let gains = 0;
    let losses = 0;
    
    // First average
    for (let i = 1; i <= period; i++) {
        const change = close[i] - close[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    result[period] = 100 - (100 / (1 + avgGain / (avgLoss === 0 ? 1 : avgLoss)));
    
    for (let i = period + 1; i < close.length; i++) {
        const change = close[i] - close[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        
        if (avgLoss === 0) {
            result[i] = 100;
        } else {
            const rs = avgGain / avgLoss;
            result[i] = 100 - (100 / (1 + rs));
        }
    }
    return result;
}

export interface RAVMResult {
    signals: {
        index: number;
        type: 'bullish' | 'bearish';
        confirmed: boolean;
        score: number;
        label: string;
        source: string;
    }[];
    matrix: {
        mState: number;
        vState: number;
        interpretation: {
            title: string;
            bias: string;
            signal: string;
        };
    }[]; // Per bar
    metrics: {
        rsi: number[];
        msi: number[];
        volumePower: number[];
    };
}

export function calculateRAVMMatrix(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[]
): RAVMResult {
    const len = closes.length;
    
    // 1. Settings
    const rsi_len = 14;
    const rsi_ob = 70.0;
    const rsi_os = 30.0;
    const aot_sigma = 2.5;
    const confirmation_ratio = 0.6;
    const norm_len_mult = 2;
    const normalization_period = rsi_len * norm_len_mult;
    const z_thresh = 2.0;

    // 2. Core Calculations
    // RSI
    const rsi_val = rsi(closes, rsi_len);
    
    // Volume Engine (Geometry Approx)
    const v_total = new Array(len).fill(0);
    const v_buy = new Array(len).fill(0);
    const v_sell = new Array(len).fill(0);
    const v_delta = new Array(len).fill(0);
    
    for (let i = 0; i < len; i++) {
        const range = highs[i] - lows[i];
        let vb = 0;
        let vs = 0;
        if (range === 0) {
            vb = volumes[i] * 0.5;
            vs = volumes[i] * 0.5;
        } else {
            vb = volumes[i] * ((closes[i] - lows[i]) / range);
            vs = volumes[i] * ((highs[i] - closes[i]) / range);
        }
        v_total[i] = volumes[i];
        v_buy[i] = vb;
        v_sell[i] = vs;
        v_delta[i] = vb - vs;
    }

    // 3. Geometric Engine
    const rsi_velocity = calculateChange(rsi_val);
    const rsi_acceleration = calculateChange(rsi_velocity);
    
    const avg_accel = sma(rsi_acceleration, normalization_period);
    const std_accel = stdev(rsi_acceleration, normalization_period);
    
    const z_score_aot = new Array(len).fill(0);
    const msi = new Array(len).fill(0);
    
    for (let i = 0; i < len; i++) {
        if (std_accel[i] !== 0) {
            z_score_aot[i] = (rsi_acceleration[i] - avg_accel[i]) / std_accel[i];
        }
        // Normalize Z (MSI)
        msi[i] = Math.min(Math.abs(z_score_aot[i]), aot_sigma) / aot_sigma;
    }

    // 4. Statistical Engine (Volume)
    function calcStats(series: number[], length: number, zLimit: number) {
        const avg = sma(series, length);
        const std = stdev(series, length);
        const zScr = new Array(series.length).fill(0);
        const isBrk = new Array(series.length).fill(false);
        
        for (let i = 0; i < series.length; i++) {
            if (std[i] !== 0) {
                zScr[i] = (series[i] - avg[i]) / std[i];
            }
            isBrk[i] = Math.abs(zScr[i]) > zLimit;
        }
        return { zScr, isBrk };
    }

    const statsT = calcStats(v_total, normalization_period, z_thresh);
    const statsB = calcStats(v_buy, normalization_period, z_thresh);
    const statsS = calcStats(v_sell, normalization_period, z_thresh);
    const absDelta = v_delta.map(v => Math.abs(v));
    const statsD = calcStats(absDelta, normalization_period, z_thresh);
    
    const volume_power = new Array(len).fill(0);
    for(let i=0; i<len; i++) {
        volume_power[i] = Math.min(Math.abs(statsT.zScr[i]), z_thresh) / z_thresh;
    }

    // 5. Trigger Logic
    const CONFIRMATION_THRESHOLD = aot_sigma * confirmation_ratio;
    
    // Triggers
    const contextual_bull_trigger = calculateCrossover(z_score_aot, CONFIRMATION_THRESHOLD);
    const contextual_bear_trigger = calculateCrossunder(z_score_aot, -CONFIRMATION_THRESHOLD);
    
    const _raw_bull_geo = calculateCrossover(z_score_aot, aot_sigma);
    const _raw_bear_geo = calculateCrossunder(z_score_aot, -aot_sigma);
    
    const hidden_bull_trigger = _raw_bull_geo; // use_geo assumed true
    const hidden_bear_trigger = _raw_bear_geo;

    const just_entered_os = calculateCrossunder(rsi_val, rsi_os);
    const just_entered_ob = calculateCrossover(rsi_val, rsi_ob);

    const signals: RAVMResult['signals'] = [];
    const matrix: RAVMResult['matrix'] = [];

    // Loop through bars to determine state
    for (let i = 0; i < len; i++) {
        // Skip early bars
        if (i < normalization_period) {
            matrix.push({ mState: 3, vState: 3, interpretation: { title: "Loading", bias: "Neutral", signal: "Loading" } });
            continue;
        }

        const in_ob_zone = rsi_val[i] >= rsi_ob;
        const in_os_zone = rsi_val[i] <= rsi_os;
        
        const is_sharp_bullish_turn = z_score_aot[i] > aot_sigma;
        const is_sharp_bearish_turn = z_score_aot[i] < -aot_sigma;

        let is_bullish_setup = false;
        let is_bearish_setup = false;
        let is_confirmed = false;
        let trigger_source = "";
        let trigger_status = "";

        // Bullish Logic
        if (in_os_zone) {
            if (contextual_bull_trigger[i]) {
                is_bullish_setup = true;
                is_confirmed = true;
                trigger_source = "Oversold";
                trigger_status = "Confirmed";
            } else if (just_entered_os[i]) {
                is_bullish_setup = true;
                is_confirmed = false;
                trigger_source = "Oversold";
                trigger_status = "Warning";
            }
        } else if (hidden_bull_trigger[i]) {
            if (rsi_val[i] < rsi_ob - 5) {
                is_bullish_setup = true;
                is_confirmed = true;
                trigger_source = "Bullish Turn (Geo)";
                trigger_status = "Confirmed";
            }
        }

        // Bearish Logic
        if (in_ob_zone) {
            if (contextual_bear_trigger[i]) {
                is_bearish_setup = true;
                is_confirmed = true;
                trigger_source = "Overbought";
                trigger_status = "Confirmed";
            } else if (just_entered_ob[i]) {
                is_bearish_setup = true;
                is_confirmed = false;
                trigger_source = "Overbought";
                trigger_status = "Warning";
            }
        } else if (hidden_bear_trigger[i]) {
            if (rsi_val[i] > rsi_os + 5) {
                is_bearish_setup = true;
                is_confirmed = true;
                trigger_source = "Bearish Turn (Geo)";
                trigger_status = "Confirmed";
            }
        }

        // Scoring
        let score = 0;
        if (is_bullish_setup || is_bearish_setup) {
            const is_bullish = is_bullish_setup;
            
            // 1. Volume Power
            score += volume_power[i] * 40.0;

            // 2. Geometry + Context
            let zone_score = 0;
            if (is_bullish) {
                if (rsi_val[i] <= rsi_os) zone_score = 1.0;
                else if (rsi_val[i] < 50) zone_score = 0.5;
            } else {
                if (rsi_val[i] >= rsi_ob) zone_score = 1.0;
                else if (rsi_val[i] > 50) zone_score = 0.5;
            }
            const geo_zone_score = (msi[i] * 0.7) + (zone_score * 0.3);
            score += geo_zone_score * 30.0;

            // 3. Volume Story
            let delta_score = 0;
            const high_activity = volume_power[i] > 0.6;
            const buy_expanded = statsB.isBrk[i] && statsB.zScr[i] > 0;
            const sell_expanded = statsS.isBrk[i] && statsS.zScr[i] > 0;
            
            let side_score = 0;
            if (high_activity) {
                if (is_bullish) {
                    if (buy_expanded && !sell_expanded) side_score = 1.0;
                    else if (buy_expanded && sell_expanded) side_score = 0.5;
                    else if (sell_expanded && !buy_expanded) side_score = 1.0; // Absorption
                } else {
                    if (sell_expanded && !buy_expanded) side_score = 1.0;
                    else if (buy_expanded && sell_expanded) side_score = 0.5;
                    else if (buy_expanded && !sell_expanded) side_score = 1.0; // Distribution
                }
            }
            
            const power_score = high_activity ? Math.min(Math.abs(statsD.zScr[i]), z_thresh) / z_thresh : 0;
            delta_score = side_score * 0.6 + power_score * 0.4;
            score += delta_score * 30.0;

            // 4. Capping
            if (!is_confirmed) {
                score = Math.min(score, 49.0);
            }
            score = Math.max(0, Math.min(score, 100));

            signals.push({
                index: i,
                type: is_bullish_setup ? 'bullish' : 'bearish',
                confirmed: is_confirmed,
                score: Math.round(score),
                label: `${trigger_source}\n${trigger_status}\nScore: ${Math.round(score)}%`,
                source: trigger_source
            });
        }

        // Matrix Interpretation
        let m_state = 3;
        if (rsi_val[i] > rsi_ob || is_sharp_bearish_turn) m_state = 5;
        else if (rsi_val[i] < rsi_os || is_sharp_bullish_turn) m_state = 1;
        else if (rsi_val[i] > 55) m_state = 2;
        else if (rsi_val[i] < 45) m_state = 4;

        let v_state = 3;
        const ha = statsT.isBrk[i];
        const sd = statsD.isBrk[i];
        if (ha) {
            if (v_delta[i] > 0) {
                if (sd && statsB.isBrk[i]) v_state = 1;
                else v_state = 2;
            } else {
                if (sd && statsS.isBrk[i]) v_state = 5;
                else v_state = 4;
            }
        }

        // Interpretation Logic (Simplified for brevity, can expand if needed)
        let title = "Neutral", bias = "Neutral", signal = "Neutral";
        // ... (Implement full matrix logic if dashboard is needed, for now basic mapping)
        // Just implementing a few key ones for debug/tooltip
        if (m_state === 1 && v_state === 1) { title = "Confirmation Bull"; bias = "Bullish"; signal = "Strong Reversal"; }
        else if (m_state === 5 && v_state === 5) { title = "Confirmation Bear"; bias = "Bearish"; signal = "Strong Drop"; }
        
        matrix.push({
            mState: m_state,
            vState: v_state,
            interpretation: { title, bias, signal }
        });
    }

    return {
        signals,
        matrix,
        metrics: {
            rsi: rsi_val,
            msi,
            volumePower: volume_power
        }
    };
}
