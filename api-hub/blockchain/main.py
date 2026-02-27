#!/usr/bin/env python3
# omnichain/main.py
"""
🚀 Omnichain Main Entry Point
Multi-Agent Blockchain Data System with FastAPI server and CLI interface
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import API_KEYS, SETTINGS, SYSTEM_SUMMARY
from orchestrator import Orchestrator
from routes.onchain import router as onchain_router
from routes.ccways import router as ccways_router

# Configure logging
_log_level = getattr(logging, SETTINGS.LOG_LEVEL, logging.INFO)
try:
    logging.basicConfig(
        level=_log_level,
        format=SETTINGS.LOG_FORMAT,
        force=True,
    )
except TypeError:  # Python < 3.8
    logging.basicConfig(
        level=_log_level,
        format=SETTINGS.LOG_FORMAT,
    )
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# 📡 FASTAPI APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="🌐 Omnichain API",
    description="Multi-Agent Blockchain Data System - 101+ chains",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onchain_router)
app.include_router(ccways_router)

# Global orchestrator instance
orchestrator: Optional[Orchestrator] = None


# ─────────────────────────────────────────────────────────────────────────────
# 📋 REQUEST/RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    """Natural language query request"""
    query: str = Field(..., description="Natural language query about blockchain data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "What is the balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum?"
            }
        }


class BalanceRequest(BaseModel):
    """Balance request for multiple chains"""
    address: str = Field(..., description="Blockchain address")
    chains: list[str] = Field(
        default=["ethereum", "polygon", "arbitrum", "base", "optimism"],
        description="List of chains to check"
    )


class AnalyzeRequest(BaseModel):
    """Address analysis request"""
    address: str = Field(..., description="Blockchain address")
    chain: str = Field(default="ethereum", description="Chain name")


class CompareRequest(BaseModel):
    """Chain comparison request"""
    chains: list[str] = Field(..., description="Chains to compare")
    metric: str = Field(default="gas", description="Metric to compare")


class GraphAnalysisRequest(BaseModel):
    """Graph analysis request"""
    transactions: list[dict] = Field(..., description="List of transactions")
    analysis_type: str = Field(
        default="clusters",
        description="Analysis type: clusters, central, trace"
    )
    address: Optional[str] = Field(None, description="Address for trace analysis")


class AnomalyDetectionRequest(BaseModel):
    """Anomaly detection request"""
    historical_data: list[float] = Field(..., description="Historical values")
    current_value: float = Field(..., description="Current value to check")
    threshold: float = Field(default=2.0, description="Z-score threshold")


class FusionRequest(BaseModel):
    """Fusion engine request"""
    fundamental_score: Optional[float] = Field(None, description="Fundamental analysis score (0-100)")
    onchain_score: Optional[float] = Field(None, description="On-chain analysis score (0-100)")
    technical_score: Optional[float] = Field(None, description="Technical analysis score (0-100)")
    agent_results: Optional[list[dict]] = Field(None, description="Multiple agent results to fuse")


class APIResponse(BaseModel):
    """Standard API response"""
    success: bool
    data: Optional[dict] = None
    analysis: Optional[str] = None
    error: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# 🔧 LIFECYCLE EVENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator on startup"""
    global orchestrator
    enable_orchestrator = os.getenv("ORCHESTRATOR_ENABLED", "0").strip().lower() in {"1", "true", "yes", "on"}
    if API_KEYS.ANTHROPIC_API_KEY and enable_orchestrator:
        orchestrator = Orchestrator(API_KEYS.ANTHROPIC_API_KEY)
        await orchestrator.initialize()

        # TODO: Register all agents here
        # from providers.bitcoin import BitcoinAgent
        # orchestrator.register_agent("bitcoin", BitcoinAgent(...))

        logger.info("🚀 Omnichain API started")
        print(SYSTEM_SUMMARY)
    else:
        orchestrator = None
        if not API_KEYS.ANTHROPIC_API_KEY:
            logger.warning("⚠️ ANTHROPIC_API_KEY missing; orchestrator disabled. Onchain routes still available.")
        else:
            logger.warning("⚠️ ORCHESTRATOR_ENABLED is false; orchestrator disabled. Onchain routes still available.")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global orchestrator
    if orchestrator:
        await orchestrator.close()
    logger.info("👋 Omnichain API stopped")


# ─────────────────────────────────────────────────────────────────────────────
# 📍 API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Info"])
async def root():
    """API root - system info"""
    return {
        "name": "Omnichain API",
        "version": "1.0.0",
        "status": "running",
        "chains_supported": "101+",
        "agents": 12,
        "orchestrator": "Claude 3.5 Sonnet",
    }


@app.get("/health", tags=["Info"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "orchestrator": orchestrator is not None}


@app.get("/chains", tags=["Info"])
async def list_chains():
    """List all supported chains"""
    from orchestrator.orchestrator import CHAIN_TO_AGENT, CHAIN_NAME_TO_ID
    
    return {
        "total_chains": len(CHAIN_TO_AGENT),
        "chains": [
            {
                "name": chain,
                "chain_id": CHAIN_NAME_TO_ID.get(chain),
                "agent": agent,
            }
            for chain, agent in CHAIN_TO_AGENT.items()
        ]
    }


@app.get("/agents", tags=["Info"])
async def list_agents():
    """List all registered agents"""
    from config import AGENT_CONFIGS
    
    return {
        "total_agents": len(AGENT_CONFIGS),
        "agents": [
            {
                "id": agent_id,
                "name": config.get("name"),
                "model": config.get("model"),
                "chains_count": config.get("chains_count", 1),
            }
            for agent_id, config in AGENT_CONFIGS.items()
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 🔍 QUERY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/query", response_model=APIResponse, tags=["Query"])
async def process_query(request: QueryRequest):
    """
    Process a natural language query about blockchain data.
    
    Examples:
    - "What is the balance of 0x... on Ethereum?"
    - "Show me the transactions for 0x... on Polygon"
    - "Compare gas prices on Ethereum, Arbitrum, and Base"
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        result = await orchestrator.process_query(request.query)
        return APIResponse(
            success=result.get("success", False),
            data=result.get("responses"),
            analysis=result.get("analysis"),
        )
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/balance", response_model=APIResponse, tags=["Data"])
async def get_balance(request: BalanceRequest):
    """Get balance for an address across multiple chains"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        result = await orchestrator.get_balance(request.address, request.chains)
        return APIResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Balance error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze", response_model=APIResponse, tags=["Analysis"])
async def analyze_address(request: AnalyzeRequest):
    """Deep analysis of an address"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        result = await orchestrator.analyze_address(request.address, request.chain)
        return APIResponse(
            success=result.get("success", False),
            data=result.get("responses"),
            analysis=result.get("analysis"),
        )
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare", response_model=APIResponse, tags=["Analysis"])
async def compare_chains(request: CompareRequest):
    """Compare metrics across chains"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        result = await orchestrator.compare_chains(request.chains, request.metric)
        return APIResponse(
            success=result.get("success", False),
            data=result.get("responses"),
            analysis=result.get("analysis"),
        )
    except Exception as e:
        logger.error(f"Compare error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/portfolio/{address}", response_model=APIResponse, tags=["Data"])
async def get_portfolio(address: str):
    """Get complete portfolio for an address"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        result = await orchestrator.get_portfolio(address)
        return APIResponse(
            success=result.get("success", False),
            data=result.get("responses"),
            analysis=result.get("analysis"),
        )
    except Exception as e:
        logger.error(f"Portfolio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 📊 ANALYTICS ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/analytics/graph", response_model=APIResponse, tags=["Analytics"])
async def analyze_graph(request: GraphAnalysisRequest):
    """
    Analyze transaction graph to detect patterns.
    
    Analysis Types:
    - clusters: Detect wallet clusters
    - central: Find central/important wallets
    - trace: Trace money flow from address
    """
    try:
        from analytics import GraphAnalyzer
        
        analyzer = GraphAnalyzer()
        analyzer.build_transaction_graph(request.transactions)
        
        result = {}
        if request.analysis_type == "clusters":
            result["clusters"] = analyzer.detect_clusters()
        elif request.analysis_type == "central":
            result["central_wallets"] = analyzer.find_central_wallets()
        elif request.analysis_type == "trace":
            if not request.address:
                raise HTTPException(400, "Address required for trace analysis")
            result["money_flow"] = analyzer.trace_money_flow(request.address)
        else:
            raise HTTPException(400, f"Invalid analysis_type: {request.analysis_type}")
        
        return APIResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Graph analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analytics/anomaly", response_model=APIResponse, tags=["Analytics"])
async def detect_anomaly(request: AnomalyDetectionRequest):
    """
    Detect anomalies using statistical analysis.
    
    Returns:
    - is_anomaly: Boolean indicating if current value is anomalous
    - z_score: Statistical z-score
    """
    try:
        from analytics import AnomalyDetector
        
        detector = AnomalyDetector()
        is_anomaly, z_score = detector.detect_volume_spike(
            request.historical_data,
            request.current_value,
            request.threshold
        )
        
        return APIResponse(
            success=True,
            data={
                "is_anomaly": is_anomaly,
                "z_score": z_score,
                "threshold": request.threshold,
                "current_value": request.current_value,
                "mean": sum(request.historical_data) / len(request.historical_data) if request.historical_data else 0
            }
        )
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/score/fusion", response_model=APIResponse, tags=["Scoring"])
async def fuse_scores(request: FusionRequest):
    """
    Fuse multiple analysis scores into unified decision.
    
    Can fuse:
    - Individual scores (fundamental, onchain, technical)
    - Multiple agent results
    
    Returns unified decision with risk assessment.
    """
    try:
        from scoring import FusionEngine
        
        engine = FusionEngine()
        
        if request.agent_results:
            # Fuse multiple agent results
            result = engine.fuse_multi_agent_results(request.agent_results)
        else:
            # Fuse individual scores
            fundamental_result = {"final_score": request.fundamental_score} if request.fundamental_score else None
            onchain_result = {"final_onchain_score": request.onchain_score} if request.onchain_score else None
            technical_result = {"score": request.technical_score} if request.technical_score else None
            
            result = engine.fuse_decisions(
                fundamental_result=fundamental_result,
                onchain_result=onchain_result,
                technical_result=technical_result
            )
        
        return APIResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Fusion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 🖥️ CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

async def cli_mode():
    """Interactive CLI mode"""
    print(SYSTEM_SUMMARY)
    print("\n🌐 Omnichain CLI - Type 'help' for commands, 'exit' to quit\n")
    
    async with Orchestrator(API_KEYS.ANTHROPIC_API_KEY) as orch:
        while True:
            try:
                query = input("\n📝 Query: ").strip()
                
                if not query:
                    continue
                
                if query.lower() in ["exit", "quit", "q"]:
                    print("👋 Goodbye!")
                    break
                
                if query.lower() == "help":
                    print("""
📚 Available Commands:
─────────────────────────────────────────────────────────
• Natural language queries about any blockchain
• 'balance <address> [chains]' - Get balance
• 'analyze <address> [chain]' - Deep analysis
• 'compare <chain1,chain2,...> [metric]' - Compare chains
• 'chains' - List supported chains
• 'agents' - List agents
• 'exit' - Exit CLI

💡 Examples:
• "What is the balance of 0x... on Ethereum?"
• "Show transactions for vitalik.eth on Polygon"
• "Compare gas on Ethereum, Arbitrum, Base"
""")
                    continue
                
                if query.lower() == "chains":
                    from orchestrator.orchestrator import CHAIN_TO_AGENT
                    print(f"\n📊 Supported Chains ({len(CHAIN_TO_AGENT)}):")
                    for chain, agent in sorted(CHAIN_TO_AGENT.items()):
                        print(f"  • {chain} → {agent}")
                    continue
                
                if query.lower() == "agents":
                    from config import AGENT_CONFIGS
                    print(f"\n🤖 Registered Agents ({len(AGENT_CONFIGS)}):")
                    for agent_id, config in AGENT_CONFIGS.items():
                        print(f"  • {agent_id}: {config.get('name')} ({config.get('model')})")
                    continue
                
                # Process query
                print("\n⏳ Processing...")
                result = await orch.process_query(query)
                
                print("\n" + "═" * 60)
                if result.get("analysis"):
                    print(result["analysis"])
                else:
                    print(json.dumps(result, indent=2))
                print("═" * 60)
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="🌐 Omnichain - Multi-Agent Blockchain Data System"
    )
    parser.add_argument(
        "--mode",
        choices=["api", "cli"],
        default="api",
        help="Run mode: 'api' for FastAPI server, 'cli' for interactive CLI"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="API host (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="API port (default: 8000)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    
    args = parser.parse_args()
    
    if args.mode == "cli":
        asyncio.run(cli_mode())
    else:
        print(f"\nStarting Omnichain API at http://{args.host}:{args.port}")
        print(f"Docs available at http://{args.host}:{args.port}/docs\n")

        access_log_enabled = os.getenv("UVICORN_ACCESS_LOG", "0").strip().lower() in {"1", "true", "yes", "on"}
        uvicorn_log_level = os.getenv("UVICORN_LOG_LEVEL", SETTINGS.LOG_LEVEL).strip().lower()
        
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level=uvicorn_log_level,
            access_log=access_log_enabled,
        )


if __name__ == "__main__":
    main()
