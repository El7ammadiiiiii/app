# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis - Server Runner
# ═══════════════════════════════════════════════════════════════
# Start the FastAPI server for technical analysis
# ═══════════════════════════════════════════════════════════════

import uvicorn
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    """Run the API server"""
    print("=" * 60)
    print("   NEXUS Technical Analysis API Server")
    print("=" * 60)
    print()
    print("Starting server on http://localhost:8001")
    print()
    print("Available endpoints:")
    print("  - GET  /                           - Health check")
    print("  - POST /analyze                    - Full analysis")
    print("  - POST /indicators                 - Calculate indicators")
    print("  - POST /patterns                   - Detect patterns")
    print("  - POST /trendlines                 - Analyze trendlines")
    print("  - GET  /live/{exchange}/{symbol}   - Live analysis")
    print("  - GET  /info/indicators            - Available indicators")
    print("  - GET  /info/patterns              - Available patterns")
    print()
    print("API Documentation: http://localhost:8001/docs")
    print("=" * 60)
    print()
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
