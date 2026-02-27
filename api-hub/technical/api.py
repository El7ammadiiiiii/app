# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis - FastAPI Server
# ═══════════════════════════════════════════════════════════════
# Main API endpoint for technical analysis
# ═══════════════════════════════════════════════════════════════

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from datetime import datetime
import asyncio
import json

# Import analysis modules
from indicators import (
    calculate_all_indicators,
    calculate_supertrend,
    calculate_bollinger_bands,
    calculate_sma,
    calculate_ema,
    calculate_rsi,
    calculate_stoch_rsi,
    calculate_macd,
    calculate_adx,
    calculate_obv,
    detect_ma_crossovers,
    results_to_json
)
from patterns import detect_all_patterns, patterns_to_json
from trendlines import analyze_all_trendlines, trendlines_to_json
from coingecko import CryptoTracker

# Centralized API used as per requirements
CENTRALIZED_API_AVAILABLE = True


# ═══════════════════════════════════════════════════════════════
# FASTAPI SETUP
# ═══════════════════════════════════════════════════════════════

app = FastAPI(
    title="NEXUS Technical Analysis API",
    description="Advanced technical analysis API for cryptocurrency trading",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════

class OHLCVData(BaseModel):
    """OHLCV candlestick data"""
    timestamp: List[int]
    open: List[float]
    high: List[float]
    low: List[float]
    close: List[float]
    volume: List[float]


class IndicatorConfig(BaseModel):
    """Configuration for which indicators to calculate"""
    supertrend: bool = False
    bollinger_bands: bool = False
    sma10: bool = False
    sma25: bool = False
    sma50: bool = False
    sma100: bool = False
    sma200: bool = False
    ema10: bool = False
    ema25: bool = False
    ema50: bool = False
    ema100: bool = False
    ema200: bool = False
    rsi: bool = False
    stoch_rsi: bool = False
    macd: bool = False
    adx: bool = False
    obv: bool = False


class TrendlineConfig(BaseModel):
    """Configuration for trendline analysis"""
    trendlines: bool = False
    horizontal_levels: bool = False
    fibonacci_retracements: bool = False
    vertical_resistance: bool = False
    vertical_support: bool = False


class PatternConfig(BaseModel):
    """Configuration for pattern detection"""
    # Bullish
    ascending_channel: bool = False
    ascending_triangle: bool = False
    bull_flag: bool = False
    bull_pennant: bool = False
    continuation_falling_wedge: bool = False
    descending_broadening_wedge: bool = False
    reversal_falling_wedge: bool = False
    # Bearish
    ascending_broadening_wedge: bool = False
    bear_flag: bool = False
    bear_pennant: bool = False
    continuation_rising_wedge: bool = False
    descending_channel: bool = False
    descending_triangle: bool = False
    reversal_rising_wedge: bool = False
    # Neutral
    symmetrical_triangle: bool = False


class AnalysisRequest(BaseModel):
    """Full analysis request"""
    ohlcv: OHLCVData
    indicators: Optional[IndicatorConfig] = None
    trendlines: Optional[TrendlineConfig] = None
    patterns: Optional[PatternConfig] = None


class AnalysisResponse(BaseModel):
    """Full analysis response"""
    success: bool
    timestamp: str
    symbol: Optional[str] = None
    timeframe: Optional[str] = None
    indicators: Optional[Dict] = None
    trendlines: Optional[Dict] = None
    patterns: Optional[Dict] = None
    signals: Optional[List[Dict]] = None
    error: Optional[str] = None


class PriceData(BaseModel):
    """Price data for pattern scanning"""
    symbol: str
    timeframe: str
    ohlcv: List[List[float]]  # [[timestamp, open, high, low, close, volume], ...]


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def ohlcv_to_dataframe(ohlcv: OHLCVData) -> pd.DataFrame:
    """Convert OHLCV model to pandas DataFrame"""
    df = pd.DataFrame({
        'timestamp': pd.to_datetime(ohlcv.timestamp, unit='ms'),
        'open': ohlcv.open,
        'high': ohlcv.high,
        'low': ohlcv.low,
        'close': ohlcv.close,
        'volume': ohlcv.volume
    })
    df.set_index('timestamp', inplace=True)
    return df


def aggregate_signals(
    indicator_results: Dict,
    pattern_results: Dict,
    trendline_results: Dict
) -> List[Dict]:
    """Aggregate all signals from different analyses"""
    all_signals = []
    
    # Collect indicator signals
    if indicator_results:
        for name, result in indicator_results.items():
            if 'signals' in result and result['signals']:
                for signal in result['signals']:
                    signal['source'] = name
                    all_signals.append(signal)
    
    # Collect pattern signals
    if pattern_results:
        for category, patterns in pattern_results.items():
            for pattern in patterns:
                all_signals.append({
                    'source': 'pattern',
                    'type': pattern['type'],
                    'name': pattern['name'],
                    'strength': pattern['strength'],
                    'target': pattern.get('target_price'),
                    'stop_loss': pattern.get('stop_loss'),
                    'probability': pattern.get('probability')
                })
    
    return all_signals


# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """API health check"""
    return {
        "status": "online",
        "api": "NEXUS Technical Analysis",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """
    Perform comprehensive technical analysis
    
    Accepts OHLCV data and configuration for which analyses to perform.
    Returns indicators, patterns, trendlines, and aggregated signals.
    """
    try:
        # Convert to DataFrame
        df = ohlcv_to_dataframe(request.ohlcv)
        
        if len(df) < 50:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data. Minimum 50 candles required."
            )
        
        results = {
            'indicators': None,
            'trendlines': None,
            'patterns': None
        }
        
        # Calculate indicators
        if request.indicators:
            indicator_config = request.indicators.dict()
            if any(indicator_config.values()):
                indicator_results = calculate_all_indicators(df, indicator_config)
                results['indicators'] = results_to_json(indicator_results)
        
        # Analyze trendlines
        if request.trendlines:
            trendline_config = request.trendlines.dict()
            if any(trendline_config.values()):
                trendline_results = analyze_all_trendlines(df, trendline_config)
                results['trendlines'] = trendlines_to_json(trendline_results)
        
        # Detect patterns
        if request.patterns:
            pattern_config = request.patterns.dict()
            if any(pattern_config.values()):
                pattern_results = detect_all_patterns(df, pattern_config)
                results['patterns'] = patterns_to_json(pattern_results)
        
        # Aggregate signals
        signals = aggregate_signals(
            results['indicators'] or {},
            results['patterns'] or {},
            results['trendlines'] or {}
        )
        
        return AnalysisResponse(
            success=True,
            timestamp=datetime.utcnow().isoformat(),
            indicators=results['indicators'],
            trendlines=results['trendlines'],
            patterns=results['patterns'],
            signals=signals
        )
        
    except Exception as e:
        return AnalysisResponse(
            success=False,
            timestamp=datetime.utcnow().isoformat(),
            error=str(e)
        )


@app.post("/indicators")
async def calculate_indicators_endpoint(
    ohlcv: OHLCVData,
    config: IndicatorConfig
):
    """Calculate specific indicators"""
    try:
        df = ohlcv_to_dataframe(ohlcv)
        results = calculate_all_indicators(df, config.dict())
        return {
            "success": True,
            "indicators": results_to_json(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/patterns")
async def detect_patterns_endpoint(
    ohlcv: OHLCVData,
    config: PatternConfig
):
    """Detect chart patterns"""
    try:
        df = ohlcv_to_dataframe(ohlcv)
        results = detect_all_patterns(df, config.dict())
        return {
            "success": True,
            "patterns": patterns_to_json(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/trendlines")
async def analyze_trendlines_endpoint(
    ohlcv: OHLCVData,
    config: TrendlineConfig
):
    """Analyze trendlines and levels"""
    try:
        df = ohlcv_to_dataframe(ohlcv)
        results = analyze_all_trendlines(df, config.dict())
        return {
            "success": True,
            "trendlines": trendlines_to_json(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# LIVE DATA ENDPOINTS (Centralized API)


# ═══════════════════════════════════════════════════════════════
# AVAILABLE INDICATORS/PATTERNS INFO
# ═══════════════════════════════════════════════════════════════

@app.get("/info/indicators")
async def get_available_indicators():
    """Get list of all available indicators"""
    return {
        "overlay_indicators": [
            {"id": "supertrend", "name": "Supertrend", "category": "trend"},
            {"id": "bollinger_bands", "name": "Bollinger Bands", "category": "volatility"},
            {"id": "sma10", "name": "SMA 10", "category": "moving_average"},
            {"id": "sma25", "name": "SMA 25", "category": "moving_average"},
            {"id": "sma50", "name": "SMA 50", "category": "moving_average"},
            {"id": "sma100", "name": "SMA 100", "category": "moving_average"},
            {"id": "sma200", "name": "SMA 200", "category": "moving_average"},
            {"id": "ema10", "name": "EMA 10", "category": "moving_average"},
            {"id": "ema25", "name": "EMA 25", "category": "moving_average"},
            {"id": "ema50", "name": "EMA 50", "category": "moving_average"},
            {"id": "ema100", "name": "EMA 100", "category": "moving_average"},
            {"id": "ema200", "name": "EMA 200", "category": "moving_average"},
        ],
        "panel_indicators": [
            {"id": "rsi", "name": "RSI", "category": "momentum"},
            {"id": "stoch_rsi", "name": "Stochastic RSI", "category": "momentum"},
            {"id": "macd", "name": "MACD", "category": "momentum"},
            {"id": "adx", "name": "ADX", "category": "trend"},
            {"id": "obv", "name": "OBV", "category": "volume"},
        ]
    }


@app.get("/info/patterns")
async def get_available_patterns():
    """Get list of all available patterns"""
    return {
        "bullish": [
            {"id": "ascending_channel", "name": "Ascending Channel"},
            {"id": "ascending_triangle", "name": "Ascending Triangle"},
            {"id": "bull_flag", "name": "Bull Flag"},
            {"id": "bull_pennant", "name": "Bull Pennant"},
            {"id": "continuation_falling_wedge", "name": "Continuation Falling Wedge"},
            {"id": "descending_broadening_wedge", "name": "Descending Broadening Wedge"},
            {"id": "reversal_falling_wedge", "name": "Reversal Falling Wedge"},
        ],
        "bearish": [
            {"id": "ascending_broadening_wedge", "name": "Ascending Broadening Wedge"},
            {"id": "bear_flag", "name": "Bear Flag"},
            {"id": "bear_pennant", "name": "Bear Pennant"},
            {"id": "continuation_rising_wedge", "name": "Continuation Rising Wedge"},
            {"id": "descending_channel", "name": "Descending Channel"},
            {"id": "descending_triangle", "name": "Descending Triangle"},
            {"id": "reversal_rising_wedge", "name": "Reversal Rising Wedge"},
        ],
        "neutral": [
            {"id": "symmetrical_triangle", "name": "Symmetrical Triangle"},
        ]
    }


@app.get("/info/trendlines")
async def get_available_trendlines():
    """Get list of all available trendline analyses"""
    return {
        "analyses": [
            {"id": "trendlines", "name": "Auto Trendlines"},
            {"id": "horizontal_levels", "name": "Horizontal S/R Levels"},
            {"id": "fibonacci_retracements", "name": "Fibonacci Retracements"},
            {"id": "vertical_resistance", "name": "Vertical Resistance"},
            {"id": "vertical_support", "name": "Vertical Support"},
        ]
    }


# ═══════════════════════════════════════════════════════════════
# COINGECKO ENDPOINTS - Free Crypto Data API
# ═══════════════════════════════════════════════════════════════

# Initialize CryptoTracker
crypto_tracker = CryptoTracker()


@app.get("/coingecko/ping")
async def coingecko_ping():
    """Test CoinGecko API connection"""
    return crypto_tracker.ping()


@app.get("/coingecko/price/{coin_id}")
async def get_coin_price(coin_id: str, include_change: bool = True):
    """
    Get current price for a cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
        include_change: Include 24h price change percentage
    
    Example:
        GET /coingecko/price/bitcoin?include_change=true
    """
    try:
        result = crypto_tracker.get_price(
            coin_id,
            include_24hr_change=include_change,
            include_market_cap=True,
            include_24hr_vol=True
        )
        
        if coin_id not in result:
            raise HTTPException(status_code=404, detail=f"Coin '{coin_id}' not found")
        
        return {
            "coin_id": coin_id,
            "data": result[coin_id],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/prices")
async def get_multiple_prices(
    coin_ids: str = Query(..., description="Comma-separated coin IDs (e.g., 'bitcoin,ethereum,cardano')")
):
    """
    Get prices for multiple cryptocurrencies
    
    Args:
        coin_ids: Comma-separated list of coin IDs
    
    Example:
        GET /coingecko/prices?coin_ids=bitcoin,ethereum,cardano
    """
    try:
        ids_list = [coin.strip() for coin in coin_ids.split(',')]
        result = crypto_tracker.get_price(
            ids_list,
            include_24hr_change=True,
            include_market_cap=True
        )
        
        return {
            "coins": result,
            "count": len(result),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/top")
async def get_top_coins(limit: int = Query(10, ge=1, le=250)):
    """
    Get top cryptocurrencies by market cap
    
    Args:
        limit: Number of coins (1-250, default 10)
    
    Example:
        GET /coingecko/top?limit=20
    """
    try:
        coins = crypto_tracker.get_top_coins(limit=limit)
        return {
            "coins": coins,
            "count": len(coins),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/trending")
async def get_trending_coins():
    """
    Get trending cryptocurrencies
    
    Example:
        GET /coingecko/trending
    """
    try:
        result = crypto_tracker.get_trending()
        return {
            "trending": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/global")
async def get_global_market_data():
    """
    Get global cryptocurrency market data
    
    Example:
        GET /coingecko/global
    """
    try:
        result = crypto_tracker.get_global_data()
        return {
            "global": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/search")
async def search_coins(query: str = Query(..., min_length=1)):
    """
    Search for cryptocurrencies
    
    Args:
        query: Search query (coin name or symbol)
    
    Example:
        GET /coingecko/search?query=bitcoin
    """
    try:
        result = crypto_tracker.search_coins(query)
        return {
            "results": result,
            "query": query,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/coin/{coin_id}")
async def get_coin_details(coin_id: str):
    """
    Get detailed information about a cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID
    
    Example:
        GET /coingecko/coin/bitcoin
    """
    try:
        result = crypto_tracker.get_coin_by_id(coin_id)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=f"Coin '{coin_id}' not found")
        
        return {
            "coin": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/chart/{coin_id}")
async def get_coin_chart(
    coin_id: str,
    days: int = Query(30, ge=1, description="Number of days (1-365 or 'max')")
):
    """
    Get market chart data for a cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID
        days: Number of days of historical data
    
    Example:
        GET /coingecko/chart/bitcoin?days=7
    """
    try:
        result = crypto_tracker.get_coin_market_chart(coin_id, days=days)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=f"Chart data for '{coin_id}' not found")
        
        return {
            "coin_id": coin_id,
            "days": days,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/ohlc/{coin_id}")
async def get_coin_ohlc(
    coin_id: str,
    days: int = Query(30, description="Number of days (1, 7, 14, 30, 90, 180, 365)")
):
    """
    Get OHLC data for a cryptocurrency
    
    Args:
        coin_id: CoinGecko coin ID
        days: Number of days (1, 7, 14, 30, 90, 180, 365)
    
    Example:
        GET /coingecko/ohlc/bitcoin?days=7
    """
    try:
        result = crypto_tracker.get_coin_ohlc(coin_id, days=days)
        
        if not result or (isinstance(result, dict) and "error" in result):
            raise HTTPException(status_code=404, detail=f"OHLC data for '{coin_id}' not found")
        
        return {
            "coin_id": coin_id,
            "days": days,
            "ohlc": result,
            "count": len(result),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/categories")
async def get_categories():
    """
    Get cryptocurrency categories (DeFi, NFT, Gaming, etc.)
    
    Example:
        GET /coingecko/categories
    """
    try:
        result = crypto_tracker.get_categories()
        return {
            "categories": result,
            "count": len(result),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coingecko/exchanges")
async def get_exchanges(limit: int = Query(100, ge=1, le=250)):
    """
    Get cryptocurrency exchanges
    
    Args:
        limit: Number of exchanges (1-250)
    
    Example:
        GET /coingecko/exchanges?limit=50
    """
    try:
        result = crypto_tracker.get_exchanges(limit=limit)
        return {
            "exchanges": result,
            "count": len(result),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# 77-PATTERN SCANNER ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.post("/patterns/scan-all")
async def scan_all_patterns(data: PriceData):
    """
    Scan for all 77 patterns across 12 categories
    
    Request body:
        - symbol: Trading pair symbol
        - timeframe: Candle timeframe (1m, 5m, 15m, 1h, 4h, 1d)
        - ohlcv: OHLCV data array [[timestamp, open, high, low, close, volume], ...]
    
    Returns:
        All detected patterns with confidence scores, targets, and rendering coordinates
    """
    try:
        # Import all detectors
        from detectors import (
            TrianglesDetector, ChannelsDetector, FlagsPennantsDetector,
            WedgesDetector, TopsBottomsDetector, HeadShouldersDetector,
            RangesDetector, TrendlinesDetector, LevelsDetector,
            BreakoutsDetector, LiquidityDetector, ScalpingDetector
        )
        
        # Convert to DataFrame
        df = pd.DataFrame(data.ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        # Initialize all detectors
        detectors = {
            "triangles": TrianglesDetector(),
            "channels": ChannelsDetector(),
            "flags_pennants": FlagsPennantsDetector(),
            "wedges": WedgesDetector(),
            "tops_bottoms": TopsBottomsDetector(),
            "head_shoulders": HeadShouldersDetector(),
            "ranges": RangesDetector(),
            "trendlines": TrendlinesDetector(),
            "levels": LevelsDetector(),
            "breakouts": BreakoutsDetector(),
            "liquidity": LiquidityDetector(),
            "scalping": ScalpingDetector(),
        }
        
        # Run all detectors
        all_patterns = []
        category_counts = {}
        
        for category, detector in detectors.items():
            patterns = detector.detect(df, data.timeframe)
            category_counts[category] = len(patterns)
            all_patterns.extend([p.to_dict() for p in patterns])
        
        # Sort by confidence
        all_patterns.sort(key=lambda p: p['confidence'], reverse=True)
        
        return {
            "symbol": data.symbol,
            "timeframe": data.timeframe,
            "total_patterns": len(all_patterns),
            "category_breakdown": category_counts,
            "patterns": all_patterns,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern scanning failed: {str(e)}")


@app.post("/patterns/scan-category/{category}")
async def scan_category_patterns(category: str, data: PriceData):
    """
    Scan for patterns in a specific category
    
    Categories:
        - triangles (8 patterns)
        - channels (9 patterns)
        - flags_pennants (8 patterns)
        - wedges (8 patterns)
        - tops_bottoms (8 patterns)
        - head_shoulders (4 patterns)
        - ranges (5 patterns)
        - trendlines (7 patterns)
        - levels (6 patterns)
        - breakouts (5 patterns)
        - liquidity (5 patterns)
        - scalping (4 patterns)
    """
    try:
        from detectors import (
            TrianglesDetector, ChannelsDetector, FlagsPennantsDetector,
            WedgesDetector, TopsBottomsDetector, HeadShouldersDetector,
            RangesDetector, TrendlinesDetector, LevelsDetector,
            BreakoutsDetector, LiquidityDetector, ScalpingDetector
        )
        
        detector_map = {
            "triangles": TrianglesDetector,
            "channels": ChannelsDetector,
            "flags_pennants": FlagsPennantsDetector,
            "wedges": WedgesDetector,
            "tops_bottoms": TopsBottomsDetector,
            "head_shoulders": HeadShouldersDetector,
            "ranges": RangesDetector,
            "trendlines": TrendlinesDetector,
            "levels": LevelsDetector,
            "breakouts": BreakoutsDetector,
            "liquidity": LiquidityDetector,
            "scalping": ScalpingDetector,
        }
        
        if category not in detector_map:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        # Convert to DataFrame
        df = pd.DataFrame(data.ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        # Run detector
        detector = detector_map[category]()
        patterns = detector.detect(df, data.timeframe)
        
        return {
            "symbol": data.symbol,
            "timeframe": data.timeframe,
            "category": category,
            "total_patterns": len(patterns),
            "patterns": [p.to_dict() for p in patterns],
            "timestamp": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern scanning failed: {str(e)}")


@app.get("/patterns/categories")
async def get_pattern_categories():
    """
    Get all available pattern categories and their pattern counts
    
    Returns:
        List of categories with pattern counts and descriptions
    """
    from detectors import PATTERN_STATS, TOTAL_PATTERNS
    
    categories = [
        {"name": "triangles", "count": PATTERN_STATS["triangles"], "description": "Ascending, Descending, Symmetrical, Broadening triangles"},
        {"name": "channels", "count": PATTERN_STATS["channels"], "description": "Ascending, Descending, Horizontal, Parallel channels"},
        {"name": "flags_pennants", "count": PATTERN_STATS["flags_pennants"], "description": "Bull/Bear flags and pennants"},
        {"name": "wedges", "count": PATTERN_STATS["wedges"], "description": "Rising, Falling, Broadening wedges"},
        {"name": "tops_bottoms", "count": PATTERN_STATS["tops_bottoms"], "description": "Double/Triple tops/bottoms, Rounding, V-patterns"},
        {"name": "head_shoulders", "count": PATTERN_STATS["head_shoulders"], "description": "Head & Shoulders, Inverse H&S"},
        {"name": "ranges", "count": PATTERN_STATS["ranges"], "description": "Accumulation, Distribution, Trading ranges"},
        {"name": "trendlines", "count": PATTERN_STATS["trendlines"], "description": "Support, Resistance, Trendlines"},
        {"name": "levels", "count": PATTERN_STATS["levels"], "description": "Key levels, Supply/Demand zones, FVG"},
        {"name": "breakouts", "count": PATTERN_STATS["breakouts"], "description": "Range, Volume, False breakouts"},
        {"name": "liquidity", "count": PATTERN_STATS["liquidity"], "description": "Sweeps, Order blocks, BOS, CHOCH"},
        {"name": "scalping", "count": PATTERN_STATS["scalping"], "description": "Micro channels, Quick reversals, Momentum"},
    ]
    
    return {
        "total_categories": len(categories),
        "total_patterns": TOTAL_PATTERNS,
        "categories": categories
    }


# Batch scanning (Centralized API)


# ═══════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
