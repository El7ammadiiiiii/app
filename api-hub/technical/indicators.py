# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis - Core Indicators Module
# ═══════════════════════════════════════════════════════════════
# Uses pandas-ta as primary library with TA-Lib as backup
# ═══════════════════════════════════════════════════════════════

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

try:
    import pandas_ta as ta
    PANDAS_TA_AVAILABLE = True
except ImportError:
    PANDAS_TA_AVAILABLE = False
    print("Warning: pandas-ta not installed. Run: pip install pandas-ta")

try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════
# DATA CLASSES FOR INDICATOR RESULTS
# ═══════════════════════════════════════════════════════════════

@dataclass
class IndicatorResult:
    """Result of indicator calculation"""
    name: str
    values: pd.DataFrame
    signals: List[Dict] = None
    metadata: Dict = None


# ═══════════════════════════════════════════════════════════════
# SUPERTREND INDICATOR
# ═══════════════════════════════════════════════════════════════

def calculate_supertrend(
    df: pd.DataFrame,
    length: int = 10,
    multiplier: float = 3.0
) -> IndicatorResult:
    """
    Calculate Supertrend indicator
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    length : ATR period (default: 10)
    multiplier : ATR multiplier (default: 3.0)
    
    Returns:
    --------
    IndicatorResult with supertrend values and signals
    """
    if PANDAS_TA_AVAILABLE:
        st = ta.supertrend(
            df['high'], 
            df['low'], 
            df['close'], 
            length=length, 
            multiplier=multiplier
        )
        
        result_df = pd.DataFrame({
            'supertrend': st[f'SUPERT_{length}_{multiplier}'],
            'direction': st[f'SUPERTd_{length}_{multiplier}'],
            'lower_band': st[f'SUPERTl_{length}_{multiplier}'],
            'upper_band': st[f'SUPERTs_{length}_{multiplier}']
        })
        
        # Generate signals
        signals = []
        direction = result_df['direction']
        for i in range(1, len(direction)):
            if direction.iloc[i] == 1 and direction.iloc[i-1] == -1:
                signals.append({
                    'index': i,
                    'type': 'buy',
                    'price': df['close'].iloc[i],
                    'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
                })
            elif direction.iloc[i] == -1 and direction.iloc[i-1] == 1:
                signals.append({
                    'index': i,
                    'type': 'sell',
                    'price': df['close'].iloc[i],
                    'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
                })
        
        return IndicatorResult(
            name="Supertrend",
            values=result_df,
            signals=signals,
            metadata={'length': length, 'multiplier': multiplier}
        )
    else:
        # Manual calculation fallback
        return _calculate_supertrend_manual(df, length, multiplier)


def _calculate_supertrend_manual(
    df: pd.DataFrame,
    length: int = 10,
    multiplier: float = 3.0
) -> IndicatorResult:
    """Manual Supertrend calculation without pandas-ta"""
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Calculate ATR
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=length).mean()
    
    # Calculate basic bands
    hl2 = (high + low) / 2
    upper_band = hl2 + (multiplier * atr)
    lower_band = hl2 - (multiplier * atr)
    
    # Initialize
    supertrend = pd.Series(index=df.index, dtype=float)
    direction = pd.Series(index=df.index, dtype=int)
    
    for i in range(length, len(df)):
        if close.iloc[i] > upper_band.iloc[i-1]:
            direction.iloc[i] = 1
        elif close.iloc[i] < lower_band.iloc[i-1]:
            direction.iloc[i] = -1
        else:
            direction.iloc[i] = direction.iloc[i-1] if i > length else 1
            
        if direction.iloc[i] == 1:
            supertrend.iloc[i] = lower_band.iloc[i]
        else:
            supertrend.iloc[i] = upper_band.iloc[i]
    
    result_df = pd.DataFrame({
        'supertrend': supertrend,
        'direction': direction,
        'lower_band': lower_band,
        'upper_band': upper_band
    })
    
    return IndicatorResult(
        name="Supertrend",
        values=result_df,
        signals=[],
        metadata={'length': length, 'multiplier': multiplier}
    )


# ═══════════════════════════════════════════════════════════════
# BOLLINGER BANDS
# ═══════════════════════════════════════════════════════════════

def calculate_bollinger_bands(
    df: pd.DataFrame,
    length: int = 20,
    std: float = 2.0
) -> IndicatorResult:
    """
    Calculate Bollinger Bands
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    length : SMA period (default: 20)
    std : Standard deviation multiplier (default: 2.0)
    
    Returns:
    --------
    IndicatorResult with BB values
    """
    if PANDAS_TA_AVAILABLE:
        bbands = ta.bbands(df['close'], length=length, std=std)
        
        result_df = pd.DataFrame({
            'lower': bbands[f'BBL_{length}_{std}'],
            'middle': bbands[f'BBM_{length}_{std}'],
            'upper': bbands[f'BBU_{length}_{std}'],
            'bandwidth': bbands[f'BBB_{length}_{std}'],
            'percent': bbands[f'BBP_{length}_{std}']
        })
    else:
        # Manual calculation
        middle = df['close'].rolling(window=length).mean()
        rolling_std = df['close'].rolling(window=length).std()
        upper = middle + (std * rolling_std)
        lower = middle - (std * rolling_std)
        bandwidth = (upper - lower) / middle * 100
        percent = (df['close'] - lower) / (upper - lower)
        
        result_df = pd.DataFrame({
            'lower': lower,
            'middle': middle,
            'upper': upper,
            'bandwidth': bandwidth,
            'percent': percent
        })
    
    # Generate signals (squeeze, expansion, breakouts)
    signals = []
    bandwidth = result_df['bandwidth']
    percent = result_df['percent']
    
    for i in range(20, len(df)):
        # Squeeze detection (low bandwidth)
        if bandwidth.iloc[i] < bandwidth.rolling(50).min().iloc[i] * 1.1:
            signals.append({
                'index': i,
                'type': 'squeeze',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        
        # Breakout signals
        if percent.iloc[i] > 1 and percent.iloc[i-1] <= 1:
            signals.append({
                'index': i,
                'type': 'breakout_up',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        elif percent.iloc[i] < 0 and percent.iloc[i-1] >= 0:
            signals.append({
                'index': i,
                'type': 'breakout_down',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name="Bollinger Bands",
        values=result_df,
        signals=signals,
        metadata={'length': length, 'std': std}
    )


# ═══════════════════════════════════════════════════════════════
# MOVING AVERAGES (SMA & EMA)
# ═══════════════════════════════════════════════════════════════

def calculate_sma(
    df: pd.DataFrame,
    length: int = 20,
    source: str = 'close'
) -> IndicatorResult:
    """
    Calculate Simple Moving Average
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    length : Period (default: 20)
    source : Price source column (default: 'close')
    """
    if PANDAS_TA_AVAILABLE:
        sma = ta.sma(df[source], length=length)
    else:
        sma = df[source].rolling(window=length).mean()
    
    result_df = pd.DataFrame({
        f'sma{length}': sma
    })
    
    # Generate crossover signals with price
    signals = []
    for i in range(1, len(df)):
        if df['close'].iloc[i] > sma.iloc[i] and df['close'].iloc[i-1] <= sma.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'price_cross_above',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        elif df['close'].iloc[i] < sma.iloc[i] and df['close'].iloc[i-1] >= sma.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'price_cross_below',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name=f"SMA{length}",
        values=result_df,
        signals=signals,
        metadata={'length': length, 'source': source}
    )


def calculate_ema(
    df: pd.DataFrame,
    length: int = 20,
    source: str = 'close'
) -> IndicatorResult:
    """
    Calculate Exponential Moving Average
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    length : Period (default: 20)
    source : Price source column (default: 'close')
    """
    if PANDAS_TA_AVAILABLE:
        ema = ta.ema(df[source], length=length)
    else:
        ema = df[source].ewm(span=length, adjust=False).mean()
    
    result_df = pd.DataFrame({
        f'ema{length}': ema
    })
    
    # Generate crossover signals
    signals = []
    for i in range(1, len(df)):
        if df['close'].iloc[i] > ema.iloc[i] and df['close'].iloc[i-1] <= ema.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'price_cross_above',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        elif df['close'].iloc[i] < ema.iloc[i] and df['close'].iloc[i-1] >= ema.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'price_cross_below',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name=f"EMA{length}",
        values=result_df,
        signals=signals,
        metadata={'length': length, 'source': source}
    )


def calculate_all_smas(df: pd.DataFrame) -> Dict[str, IndicatorResult]:
    """Calculate all standard SMAs (10, 25, 50, 100, 200)"""
    periods = [10, 25, 50, 100, 200]
    results = {}
    
    for period in periods:
        results[f'sma{period}'] = calculate_sma(df, length=period)
    
    return results


def calculate_all_emas(df: pd.DataFrame) -> Dict[str, IndicatorResult]:
    """Calculate all standard EMAs (10, 25, 50, 100, 200)"""
    periods = [10, 25, 50, 100, 200]
    results = {}
    
    for period in periods:
        results[f'ema{period}'] = calculate_ema(df, length=period)
    
    return results


# ═══════════════════════════════════════════════════════════════
# MA CROSSOVER SIGNALS
# ═══════════════════════════════════════════════════════════════

def detect_ma_crossovers(
    df: pd.DataFrame,
    fast_period: int = 9,
    slow_period: int = 21,
    ma_type: str = 'ema'
) -> List[Dict]:
    """
    Detect moving average crossovers (Golden Cross / Death Cross)
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    fast_period : Fast MA period
    slow_period : Slow MA period
    ma_type : 'sma' or 'ema'
    """
    if ma_type == 'ema':
        fast_ma = calculate_ema(df, fast_period).values.iloc[:, 0]
        slow_ma = calculate_ema(df, slow_period).values.iloc[:, 0]
    else:
        fast_ma = calculate_sma(df, fast_period).values.iloc[:, 0]
        slow_ma = calculate_sma(df, slow_period).values.iloc[:, 0]
    
    signals = []
    for i in range(1, len(df)):
        # Golden Cross (fast crosses above slow)
        if fast_ma.iloc[i] > slow_ma.iloc[i] and fast_ma.iloc[i-1] <= slow_ma.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'golden_cross',
                'name': f'{ma_type.upper()}{fast_period}/{slow_period} Golden Cross',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i,
                'strength': 'strong' if fast_period in [9, 10] and slow_period in [21, 25] else 'moderate'
            })
        # Death Cross (fast crosses below slow)
        elif fast_ma.iloc[i] < slow_ma.iloc[i] and fast_ma.iloc[i-1] >= slow_ma.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'death_cross',
                'name': f'{ma_type.upper()}{fast_period}/{slow_period} Death Cross',
                'price': df['close'].iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i,
                'strength': 'strong' if fast_period in [9, 10] and slow_period in [21, 25] else 'moderate'
            })
    
    return signals


# ═══════════════════════════════════════════════════════════════
# MOMENTUM INDICATORS
# ═══════════════════════════════════════════════════════════════

def calculate_rsi(
    df: pd.DataFrame,
    length: int = 14
) -> IndicatorResult:
    """Calculate RSI (Relative Strength Index)"""
    if PANDAS_TA_AVAILABLE:
        rsi = ta.rsi(df['close'], length=length)
    else:
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=length).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=length).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
    
    result_df = pd.DataFrame({'rsi': rsi})
    
    # Generate overbought/oversold signals
    signals = []
    for i in range(1, len(df)):
        if rsi.iloc[i] < 30 and rsi.iloc[i-1] >= 30:
            signals.append({
                'index': i,
                'type': 'oversold',
                'value': rsi.iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        elif rsi.iloc[i] > 70 and rsi.iloc[i-1] <= 70:
            signals.append({
                'index': i,
                'type': 'overbought',
                'value': rsi.iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name="RSI",
        values=result_df,
        signals=signals,
        metadata={'length': length}
    )


def calculate_stoch_rsi(
    df: pd.DataFrame,
    length: int = 14,
    rsi_length: int = 14,
    k: int = 3,
    d: int = 3
) -> IndicatorResult:
    """Calculate Stochastic RSI"""
    if PANDAS_TA_AVAILABLE:
        stoch_rsi = ta.stochrsi(df['close'], length=length, rsi_length=rsi_length, k=k, d=d)
        result_df = pd.DataFrame({
            'stoch_rsi_k': stoch_rsi[f'STOCHRSIk_{length}_{rsi_length}_{k}_{d}'],
            'stoch_rsi_d': stoch_rsi[f'STOCHRSId_{length}_{rsi_length}_{k}_{d}']
        })
    else:
        # Manual calculation
        rsi = calculate_rsi(df, length).values['rsi']
        stoch_rsi_raw = (rsi - rsi.rolling(length).min()) / (rsi.rolling(length).max() - rsi.rolling(length).min())
        stoch_rsi_k = stoch_rsi_raw.rolling(k).mean() * 100
        stoch_rsi_d = stoch_rsi_k.rolling(d).mean()
        
        result_df = pd.DataFrame({
            'stoch_rsi_k': stoch_rsi_k,
            'stoch_rsi_d': stoch_rsi_d
        })
    
    # Generate signals
    signals = []
    k_line = result_df['stoch_rsi_k']
    d_line = result_df['stoch_rsi_d']
    
    for i in range(1, len(df)):
        # Oversold crossover (bullish)
        if k_line.iloc[i] > d_line.iloc[i] and k_line.iloc[i-1] <= d_line.iloc[i-1] and k_line.iloc[i] < 20:
            signals.append({
                'index': i,
                'type': 'bullish_crossover',
                'zone': 'oversold',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        # Overbought crossover (bearish)
        elif k_line.iloc[i] < d_line.iloc[i] and k_line.iloc[i-1] >= d_line.iloc[i-1] and k_line.iloc[i] > 80:
            signals.append({
                'index': i,
                'type': 'bearish_crossover',
                'zone': 'overbought',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name="Stochastic RSI",
        values=result_df,
        signals=signals,
        metadata={'length': length, 'rsi_length': rsi_length, 'k': k, 'd': d}
    )


def calculate_macd(
    df: pd.DataFrame,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> IndicatorResult:
    """Calculate MACD (Moving Average Convergence Divergence)"""
    if PANDAS_TA_AVAILABLE:
        macd_result = ta.macd(df['close'], fast=fast, slow=slow, signal=signal)
        result_df = pd.DataFrame({
            'macd': macd_result[f'MACD_{fast}_{slow}_{signal}'],
            'signal': macd_result[f'MACDs_{fast}_{slow}_{signal}'],
            'histogram': macd_result[f'MACDh_{fast}_{slow}_{signal}']
        })
    else:
        ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
        ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        result_df = pd.DataFrame({
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        })
    
    # Generate signals
    signals = []
    macd_line = result_df['macd']
    signal_line = result_df['signal']
    
    for i in range(1, len(df)):
        if macd_line.iloc[i] > signal_line.iloc[i] and macd_line.iloc[i-1] <= signal_line.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'bullish_crossover',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        elif macd_line.iloc[i] < signal_line.iloc[i] and macd_line.iloc[i-1] >= signal_line.iloc[i-1]:
            signals.append({
                'index': i,
                'type': 'bearish_crossover',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name="MACD",
        values=result_df,
        signals=signals,
        metadata={'fast': fast, 'slow': slow, 'signal': signal}
    )


def calculate_adx(
    df: pd.DataFrame,
    length: int = 14
) -> IndicatorResult:
    """Calculate ADX (Average Directional Index)"""
    if PANDAS_TA_AVAILABLE:
        adx_result = ta.adx(df['high'], df['low'], df['close'], length=length)
        result_df = pd.DataFrame({
            'adx': adx_result[f'ADX_{length}'],
            'dmp': adx_result[f'DMP_{length}'],
            'dmn': adx_result[f'DMN_{length}']
        })
    else:
        # Manual ADX calculation
        plus_dm = df['high'].diff()
        minus_dm = df['low'].diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm > 0] = 0
        
        tr1 = df['high'] - df['low']
        tr2 = abs(df['high'] - df['close'].shift(1))
        tr3 = abs(df['low'] - df['close'].shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        atr = tr.rolling(length).mean()
        plus_di = 100 * (plus_dm.rolling(length).mean() / atr)
        minus_di = abs(100 * (minus_dm.rolling(length).mean() / atr))
        
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(length).mean()
        
        result_df = pd.DataFrame({
            'adx': adx,
            'dmp': plus_di,
            'dmn': minus_di
        })
    
    # Generate trend strength signals
    signals = []
    adx_values = result_df['adx']
    
    for i in range(1, len(df)):
        if adx_values.iloc[i] > 25 and adx_values.iloc[i-1] <= 25:
            signals.append({
                'index': i,
                'type': 'trend_strengthening',
                'value': adx_values.iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        elif adx_values.iloc[i] < 20 and adx_values.iloc[i-1] >= 20:
            signals.append({
                'index': i,
                'type': 'trend_weakening',
                'value': adx_values.iloc[i],
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name="ADX",
        values=result_df,
        signals=signals,
        metadata={'length': length}
    )


# ═══════════════════════════════════════════════════════════════
# VOLUME INDICATORS
# ═══════════════════════════════════════════════════════════════

def calculate_obv(df: pd.DataFrame) -> IndicatorResult:
    """Calculate On-Balance Volume (OBV)"""
    if PANDAS_TA_AVAILABLE:
        obv = ta.obv(df['close'], df['volume'])
    else:
        obv = pd.Series(index=df.index, dtype=float)
        obv.iloc[0] = 0
        for i in range(1, len(df)):
            if df['close'].iloc[i] > df['close'].iloc[i-1]:
                obv.iloc[i] = obv.iloc[i-1] + df['volume'].iloc[i]
            elif df['close'].iloc[i] < df['close'].iloc[i-1]:
                obv.iloc[i] = obv.iloc[i-1] - df['volume'].iloc[i]
            else:
                obv.iloc[i] = obv.iloc[i-1]
    
    result_df = pd.DataFrame({'obv': obv})
    
    # Divergence detection
    signals = []
    obv_sma = obv.rolling(20).mean()
    
    for i in range(20, len(df)):
        # Bullish divergence: price making lower lows, OBV making higher lows
        if df['close'].iloc[i] < df['close'].iloc[i-10] and obv.iloc[i] > obv.iloc[i-10]:
            signals.append({
                'index': i,
                'type': 'bullish_divergence',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
        # Bearish divergence: price making higher highs, OBV making lower highs
        elif df['close'].iloc[i] > df['close'].iloc[i-10] and obv.iloc[i] < obv.iloc[i-10]:
            signals.append({
                'index': i,
                'type': 'bearish_divergence',
                'timestamp': df.index[i] if isinstance(df.index, pd.DatetimeIndex) else i
            })
    
    return IndicatorResult(
        name="OBV",
        values=result_df,
        signals=signals,
        metadata={}
    )


def calculate_volume_profile(
    df: pd.DataFrame,
    num_bins: int = 50
) -> Dict:
    """Calculate Volume Profile (VPVR-like)"""
    price_range = df['high'].max() - df['low'].min()
    bin_size = price_range / num_bins
    
    bins = []
    for i in range(num_bins):
        bin_low = df['low'].min() + (i * bin_size)
        bin_high = bin_low + bin_size
        bin_volume = df[(df['close'] >= bin_low) & (df['close'] < bin_high)]['volume'].sum()
        bins.append({
            'price_low': bin_low,
            'price_high': bin_high,
            'price_mid': (bin_low + bin_high) / 2,
            'volume': bin_volume
        })
    
    # Find POC (Point of Control)
    poc = max(bins, key=lambda x: x['volume'])
    
    # Find Value Area (70% of volume)
    total_volume = sum(b['volume'] for b in bins)
    target_volume = total_volume * 0.7
    
    sorted_bins = sorted(bins, key=lambda x: x['volume'], reverse=True)
    cumulative_volume = 0
    value_area_bins = []
    
    for b in sorted_bins:
        cumulative_volume += b['volume']
        value_area_bins.append(b)
        if cumulative_volume >= target_volume:
            break
    
    value_area_high = max(b['price_high'] for b in value_area_bins)
    value_area_low = min(b['price_low'] for b in value_area_bins)
    
    return {
        'bins': bins,
        'poc': poc['price_mid'],
        'value_area_high': value_area_high,
        'value_area_low': value_area_low,
        'total_volume': total_volume
    }


# ═══════════════════════════════════════════════════════════════
# COMPREHENSIVE INDICATOR CALCULATION
# ═══════════════════════════════════════════════════════════════

def calculate_all_indicators(
    df: pd.DataFrame,
    config: Dict[str, bool] = None
) -> Dict[str, IndicatorResult]:
    """
    Calculate all enabled indicators based on configuration
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    config : Dictionary of indicator names and enabled status
    """
    results = {}
    
    # Default: calculate all if no config provided
    if config is None:
        config = {
            'supertrend': True,
            'bollinger_bands': True,
            'sma10': True, 'sma25': True, 'sma50': True, 'sma100': True, 'sma200': True,
            'ema10': True, 'ema25': True, 'ema50': True, 'ema100': True, 'ema200': True,
            'rsi': True,
            'stoch_rsi': True,
            'macd': True,
            'adx': True,
            'obv': True
        }
    
    # Calculate enabled indicators
    if config.get('supertrend'):
        results['supertrend'] = calculate_supertrend(df)
    
    if config.get('bollinger_bands'):
        results['bollinger_bands'] = calculate_bollinger_bands(df)
    
    # SMAs
    for period in [10, 25, 50, 100, 200]:
        if config.get(f'sma{period}'):
            results[f'sma{period}'] = calculate_sma(df, length=period)
    
    # EMAs
    for period in [10, 25, 50, 100, 200]:
        if config.get(f'ema{period}'):
            results[f'ema{period}'] = calculate_ema(df, length=period)
    
    # Momentum
    if config.get('rsi'):
        results['rsi'] = calculate_rsi(df)
    
    if config.get('stoch_rsi'):
        results['stoch_rsi'] = calculate_stoch_rsi(df)
    
    if config.get('macd'):
        results['macd'] = calculate_macd(df)
    
    if config.get('adx'):
        results['adx'] = calculate_adx(df)
    
    # Volume
    if config.get('obv'):
        results['obv'] = calculate_obv(df)
    
    return results


# ═══════════════════════════════════════════════════════════════
# EXPORT FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def results_to_json(results: Dict[str, IndicatorResult]) -> Dict:
    """Convert indicator results to JSON-serializable format"""
    output = {}
    
    for name, result in results.items():
        output[name] = {
            'name': result.name,
            'values': result.values.to_dict(orient='list'),
            'signals': result.signals,
            'metadata': result.metadata
        }
    
    return output
