"""
Simple Pattern Scanner Server
Run with: python simple_server.py
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
from datetime import datetime

app = FastAPI(title="Pattern Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PriceData(BaseModel):
    symbol: str
    timeframe: str
    ohlcv: List[List[float]]

@app.get("/")
def root():
    return {"status": "ok", "message": "Pattern Scanner API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/patterns/scan-all")
async def scan_all_patterns(data: PriceData):
    try:
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
            try:
                patterns = detector.detect(df, data.timeframe)
                category_counts[category] = len(patterns)
                all_patterns.extend([p.to_dict() for p in patterns])
            except Exception as e:
                print(f"Error in {category}: {e}")
                category_counts[category] = 0
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patterns/categories")
def get_categories():
    return {
        "categories": [
            {"id": "triangles", "name": "Triangles", "count": 8},
            {"id": "channels", "name": "Channels", "count": 9},
            {"id": "flags_pennants", "name": "Flags & Pennants", "count": 8},
            {"id": "wedges", "name": "Wedges", "count": 8},
            {"id": "tops_bottoms", "name": "Tops & Bottoms", "count": 8},
            {"id": "head_shoulders", "name": "Head & Shoulders", "count": 4},
            {"id": "ranges", "name": "Ranges", "count": 5},
            {"id": "trendlines", "name": "Trendlines", "count": 7},
            {"id": "levels", "name": "Levels", "count": 6},
            {"id": "breakouts", "name": "Breakouts", "count": 5},
            {"id": "liquidity", "name": "Liquidity", "count": 5},
            {"id": "scalping", "name": "Scalping", "count": 4},
        ],
        "total_patterns": 77
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
