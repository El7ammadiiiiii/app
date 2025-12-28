# 🌐 API Reference - Complete Documentation

**Generated:** December 26, 2025  
**Version:** 1.0.0

---

## 📚 Table of Contents

1. [Omnichain Blockchain API](#omnichain-blockchain-api) (17 endpoints)
2. [NEXUS Technical Analysis API](#nexus-technical-analysis-api) (30+ endpoints)
3. [Orchestrator Methods](#orchestrator-methods) (15+ methods)

---

# Omnichain Blockchain API

**Base URL:** `http://localhost:8000`  
**Technology:** FastAPI + Claude 3.5 Sonnet + GPT-4o-mini  
**Chains Supported:** 101+

## 📊 System Information

### GET `/`
**Description:** API root - system information

**Response:**
```json
{
  "name": "Omnichain API",
  "version": "1.0.0",
  "status": "running",
  "chains_supported": "101+",
  "agents": 12,
  "orchestrator": "Claude 3.5 Sonnet"
}
```

**Example:**
```bash
curl http://localhost:8000/
```

---

### GET `/health`
**Description:** Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "orchestrator": true
}
```

---

### GET `/chains`
**Description:** List all supported blockchains

**Response:**
```json
{
  "total_chains": 101,
  "chains": [
    {
      "name": "ethereum",
      "chain_id": 1,
      "agent": "ethereum"
    },
    ...
  ]
}
```

**Example:**
```bash
curl http://localhost:8000/chains
```

---

### GET `/agents`
**Description:** List all registered AI agents

**Response:**
```json
{
  "total_agents": 12,
  "agents": [
    {
      "id": "bitcoin",
      "name": "Bitcoin Expert",
      "model": "gpt-4o-mini",
      "chains_count": 1
    },
    ...
  ]
}
```

---

## 🔍 Data Queries

### POST `/query`
**Description:** Natural language query about blockchain data

**Request Body:**
```json
{
  "query": "What is the balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum?"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "analysis": "AI-generated analysis text"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me Bitcoin price"}'
```

---

### POST `/balance`
**Description:** Get balance across multiple chains

**Request Body:**
```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chains": ["ethereum", "polygon", "arbitrum"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ethereum": { "balance": "1.234 ETH" },
    "polygon": { "balance": "567.89 MATIC" }
  }
}
```

---

### POST `/analyze`
**Description:** Deep analysis of blockchain address

**Request Body:**
```json
{
  "address": "0x...",
  "chain": "ethereum"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "analysis": "Detailed AI analysis"
}
```

---

### POST `/compare`
**Description:** Compare metrics across blockchains

**Request Body:**
```json
{
  "chains": ["ethereum", "arbitrum", "base"],
  "metric": "gas"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ethereum": { "gas_price": "25 gwei" },
    "arbitrum": { "gas_price": "0.1 gwei" }
  }
}
```

---

### GET `/portfolio/{address}`
**Description:** Get complete portfolio for address

**Parameters:**
- `address` (path): Blockchain address

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "analysis": "Portfolio analysis"
}
```

**Example:**
```bash
curl http://localhost:8000/portfolio/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

---

## 📊 Advanced Analytics

### POST `/analytics/graph`
**Description:** Transaction graph analysis (Nansen-style)

**Request Body:**
```json
{
  "transactions": [
    {"from": "0xA", "to": "0xB", "value": 1000},
    {"from": "0xB", "to": "0xC", "value": 500}
  ],
  "analysis_type": "clusters",
  "address": "0xA"
}
```

**Analysis Types:**
- `clusters` - Detect wallet clusters
- `central` - Find central wallets (PageRank)
- `trace` - Trace money flow

**Response:**
```json
{
  "success": true,
  "data": {
    "clusters": [
      ["0xA", "0xB", "0xC"]
    ],
    "central_wallets": [
      ["0xB", 0.42]
    ]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/analytics/graph \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [...],
    "analysis_type": "clusters"
  }'
```

---

### POST `/analytics/anomaly`
**Description:** Detect statistical anomalies

**Request Body:**
```json
{
  "historical_data": [100, 110, 95, 105, 100],
  "current_value": 300,
  "threshold": 2.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_anomaly": true,
    "z_score": 43.82,
    "threshold": 2.0,
    "current_value": 300,
    "mean": 102
  }
}
```

---

## 🎯 Scoring & Fusion

### POST `/score/fusion`
**Description:** Fuse multiple analysis scores into unified decision

**Request Body (Individual Scores):**
```json
{
  "fundamental_score": 80,
  "onchain_score": 70,
  "technical_score": 75
}
```

**Request Body (Multi-Agent):**
```json
{
  "agent_results": [
    {"score": 75},
    {"score": 80},
    {"score": 78}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "strategic_score": 76.0,
    "decision": "BUY",
    "risk_level": "LOW",
    "confluence_status": "ALIGNED",
    "confidence": "MODERATE",
    "components": {
      "fundamental_score": 80,
      "onchain_score": 70,
      "technical_score": 75
    }
  }
}
```

**Decisions:**
- `STRONG_BUY` (80+)
- `BUY` (65-79)
- `HOLD` (45-64)
- `SELL` (30-44)
- `STRONG_SELL` (<30)

---

# NEXUS Technical Analysis API

**Base URL:** `http://localhost:8001` (Python server)  
**Technology:** FastAPI + pandas-ta + CCXT  
**Patterns:** 77 types  
**Indicators:** 17+

## 📊 Core Analysis

### POST `/analyze`
**Description:** Complete technical analysis

**Request Body:**
```json
{
  "data": {
    "timestamp": [1234567890, ...],
    "open": [100, ...],
    "high": [105, ...],
    "low": [95, ...],
    "close": [102, ...],
    "volume": [1000000, ...]
  },
  "indicators": {
    "sma50": true,
    "rsi": true,
    "macd": true
  },
  "patterns": {
    "head_and_shoulders": true,
    "double_top": true
  },
  "trendlines": {
    "support_resistance": true
  }
}
```

**Response:**
```json
{
  "indicators": {
    "sma_50": [100, 101, ...],
    "rsi": [45, 52, ...],
    "macd": { "macd": [...], "signal": [...] }
  },
  "patterns": {
    "head_and_shoulders": [],
    "double_top": [...]
  },
  "trendlines": {
    "support": [...],
    "resistance": [...]
  }
}
```

---

### POST `/indicators`
**Description:** Calculate technical indicators only

**Request Body:**
```json
{
  "data": { ... },
  "config": {
    "sma10": true,
    "ema50": true,
    "rsi": true,
    "bollinger_bands": true
  }
}
```

---

### POST `/patterns`
**Description:** Detect chart patterns only

**Request Body:**
```json
{
  "data": { ... },
  "config": {
    "head_and_shoulders": true,
    "triangles": true,
    "wedges": true
  }
}
```

---

### POST `/trendlines`
**Description:** Analyze support/resistance trendlines

**Request Body:**
```json
{
  "data": { ... },
  "config": {
    "support_resistance": true,
    "channels": true
  }
}
```

---

## 📡 Live Data

### GET `/live/{exchange}/{symbol}/{timeframe}`
**Description:** Get live market data and analysis

**Parameters:**
- `exchange`: binance, coinbase, kraken, etc.
- `symbol`: BTC/USDT, ETH/USD, etc.
- `timeframe`: 1m, 5m, 15m, 1h, 4h, 1d
- `limit` (query): Number of candles (default: 500)

**Example:**
```bash
curl "http://localhost:8001/live/binance/BTC/USDT/1h?limit=500"
```

**Response:**
```json
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "data": { ... },
  "indicators": { ... },
  "patterns": { ... }
}
```

---

## 📚 Information Endpoints

### GET `/info/indicators`
**Description:** List all available indicators

**Response:**
```json
{
  "total": 17,
  "indicators": {
    "trend": ["sma", "ema", "supertrend"],
    "momentum": ["rsi", "stoch_rsi", "macd"],
    "volatility": ["bollinger_bands", "atr"],
    "volume": ["obv", "vwap"]
  }
}
```

---

### GET `/info/patterns`
**Description:** List all detectable patterns

**Response:**
```json
{
  "total": 77,
  "patterns": {
    "reversal": ["head_and_shoulders", "double_top", ...],
    "continuation": ["triangles", "flags", "pennants"],
    "breakout": ["wedges", "channels"]
  }
}
```

---

### GET `/info/trendlines`
**Description:** List trendline analysis types

**Response:**
```json
{
  "types": [
    "support_resistance",
    "trend_channels",
    "fibonacci_levels"
  ]
}
```

---

## 💰 CoinGecko Integration

### GET `/coingecko/price/{coin_id}`
**Description:** Get current price for coin

**Example:**
```bash
curl http://localhost:8001/coingecko/price/bitcoin
```

**Response:**
```json
{
  "bitcoin": {
    "usd": 45000,
    "usd_24h_change": 2.5
  }
}
```

---

### GET `/coingecko/prices`
**Description:** Get prices for multiple coins

**Parameters:**
- `ids` (query): Comma-separated coin IDs

**Example:**
```bash
curl "http://localhost:8001/coingecko/prices?ids=bitcoin,ethereum,solana"
```

---

### GET `/coingecko/top`
**Description:** Get top cryptocurrencies

**Parameters:**
- `limit` (query): Number of coins (default: 100)
- `page` (query): Page number (default: 1)

---

### GET `/coingecko/trending`
**Description:** Get trending cryptocurrencies

**Response:**
```json
{
  "coins": [
    {
      "id": "bitcoin",
      "name": "Bitcoin",
      "symbol": "BTC",
      "market_cap_rank": 1
    }
  ]
}
```

---

### GET `/coingecko/global`
**Description:** Get global cryptocurrency market data

**Response:**
```json
{
  "total_market_cap": { "usd": 2000000000000 },
  "total_volume": { "usd": 100000000000 },
  "market_cap_percentage": {
    "btc": 45.2,
    "eth": 18.5
  }
}
```

---

### GET `/coingecko/search`
**Description:** Search for cryptocurrencies

**Parameters:**
- `query` (query): Search query

**Example:**
```bash
curl "http://localhost:8001/coingecko/search?query=bitcoin"
```

---

### GET `/coingecko/coin/{coin_id}`
**Description:** Get detailed coin information

**Response:**
```json
{
  "id": "bitcoin",
  "symbol": "btc",
  "name": "Bitcoin",
  "market_data": { ... },
  "description": { ... }
}
```

---

### GET `/coingecko/chart/{coin_id}`
**Description:** Get price chart data

**Parameters:**
- `days` (query): Number of days (1, 7, 30, 90, 365, max)

**Example:**
```bash
curl "http://localhost:8001/coingecko/chart/bitcoin?days=30"
```

---

### GET `/coingecko/ohlc/{coin_id}`
**Description:** Get OHLC candlestick data

**Parameters:**
- `days` (query): 1, 7, 14, 30, 90, 180, 365

---

### GET `/coingecko/categories`
**Description:** Get cryptocurrency categories

**Response:**
```json
{
  "categories": [
    {
      "id": "defi",
      "name": "DeFi",
      "market_cap": 100000000000
    }
  ]
}
```

---

### GET `/coingecko/exchanges`
**Description:** Get exchange rankings

**Parameters:**
- `per_page` (query): Results per page (default: 100)

---

## 🔍 Pattern Scanner (77 Patterns)

### POST `/patterns/scan-all`
**Description:** Scan for all 77 patterns

**Request Body:**
```json
{
  "data": {
    "timestamp": [...],
    "open": [...],
    "high": [...],
    "low": [...],
    "close": [...],
    "volume": [...]
  }
}
```

**Response:**
```json
{
  "total_patterns": 5,
  "patterns_by_category": {
    "reversal": 2,
    "continuation": 3
  },
  "patterns": [
    {
      "type": "double_top",
      "category": "reversal",
      "confidence": 0.85,
      "index": 245,
      "price": 45000,
      "details": { ... }
    }
  ]
}
```

---

### POST `/patterns/scan-category/{category}`
**Description:** Scan specific pattern category

**Categories:**
- `reversal` (13 patterns)
- `continuation` (16 patterns)
- `breakout` (18 patterns)
- `candlestick` (30 patterns)

**Example:**
```bash
curl -X POST http://localhost:8001/patterns/scan-category/reversal \
  -H "Content-Type: application/json" \
  -d '{"data": {...}}'
```

---

### GET `/patterns/categories`
**Description:** List all pattern categories

**Response:**
```json
{
  "categories": {
    "reversal": {
      "count": 13,
      "patterns": ["head_and_shoulders", "double_top", ...]
    },
    "continuation": {
      "count": 16,
      "patterns": ["triangles", "flags", ...]
    }
  }
}
```

---

### POST `/patterns/scan-multiple`
**Description:** Scan multiple specific patterns

**Request Body:**
```json
{
  "data": { ... },
  "patterns": ["double_top", "head_and_shoulders", "triangles"]
}
```

---

# Orchestrator Methods

**Location:** `omnichain/orchestrator/orchestrator.py`  
**Class:** `Orchestrator`

## 🔄 Lifecycle Management

### `__init__(api_key: str)`
**Description:** Initialize orchestrator with Claude API key

**Parameters:**
- `api_key`: Anthropic API key for Claude 3.5 Sonnet

**Example:**
```python
from orchestrator import Orchestrator

orch = Orchestrator(api_key="sk-ant-...")
```

---

### `async initialize()`
**Description:** Initialize orchestrator and load agents

**Example:**
```python
await orch.initialize()
```

---

### `async close()`
**Description:** Cleanup and close connections

**Example:**
```python
await orch.close()
```

---

## 🤖 Agent Management

### `register_agent(agent_id: str, agent: BaseAgent)`
**Description:** Register a new agent

**Parameters:**
- `agent_id`: Unique agent identifier
- `agent`: Agent instance

**Example:**
```python
from providers.bitcoin import BitcoinAgent

bitcoin_agent = BitcoinAgent(api_key="...")
orch.register_agent("bitcoin", bitcoin_agent)
```

---

### `get_agent(agent_id: str) -> BaseAgent`
**Description:** Get registered agent by ID

---

## 🔍 Query Processing

### `async process_query(query: str) -> Dict`
**Description:** Process natural language query

**Parameters:**
- `query`: Natural language question

**Returns:**
```python
{
    "success": bool,
    "responses": dict,  # Agent responses
    "analysis": str     # Claude's analysis
}
```

**Example:**
```python
result = await orch.process_query(
    "What is the balance of 0x... on Ethereum?"
)
```

---

### `async get_balance(address: str, chains: List[str]) -> Dict`
**Description:** Get balance across multiple chains

**Example:**
```python
balance = await orch.get_balance(
    address="0x...",
    chains=["ethereum", "polygon"]
)
```

---

### `async analyze_address(address: str, chain: str) -> Dict`
**Description:** Deep analysis of address

**Example:**
```python
analysis = await orch.analyze_address(
    address="0x...",
    chain="ethereum"
)
```

---

### `async compare_chains(chains: List[str], metric: str) -> Dict`
**Description:** Compare metrics across chains

**Example:**
```python
comparison = await orch.compare_chains(
    chains=["ethereum", "arbitrum"],
    metric="gas"
)
```

---

### `async get_portfolio(address: str) -> Dict`
**Description:** Get complete portfolio

**Example:**
```python
portfolio = await orch.get_portfolio(address="0x...")
```

---

## 🔧 Internal Methods

### `_parse_query(query: str) -> Dict`
**Description:** Parse natural language query

**Returns:**
```python
{
    "intent": str,        # balance, transaction, analyze
    "chains": List[str],  # Detected chains
    "address": str,       # Extracted address
    "entities": dict      # Other entities
}
```

---

### `_route_to_agents(intent: str, chains: List[str]) -> List[str]`
**Description:** Determine which agents to use

---

### `_aggregate_responses(responses: Dict) -> str`
**Description:** Aggregate agent responses using Claude

---

### `_extract_address(text: str) -> Optional[str]`
**Description:** Extract blockchain address from text

---

### `_detect_chains(text: str) -> List[str]`
**Description:** Detect mentioned blockchain names

---

## 📊 Chain Routing Maps

### `CHAIN_ALIASES`
**Description:** Chain name aliases for parsing

```python
{
    "btc": "bitcoin",
    "eth": "ethereum",
    "matic": "polygon",
    ...
}
```

---

### `CHAIN_TO_AGENT`
**Description:** Map chains to responsible agents

```python
{
    "ethereum": "ethereum",
    "polygon": "etherscan_v2_layer2_optimistic",
    "bitcoin": "bitcoin",
    ...
}
```

---

### `CHAIN_NAME_TO_ID`
**Description:** Map chain names to chain IDs

```python
{
    "ethereum": 1,
    "polygon": 137,
    "arbitrum": 42161,
    ...
}
```

---

## 🎯 Usage Examples

### Complete Workflow
```python
from orchestrator import Orchestrator

# Initialize
orch = Orchestrator(api_key="sk-ant-...")
await orch.initialize()

# Natural language query
result = await orch.process_query(
    "Compare gas fees on Ethereum, Arbitrum, and Base"
)
print(result["analysis"])

# Specific balance check
balance = await orch.get_balance(
    address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    chains=["ethereum", "polygon", "arbitrum"]
)

# Portfolio analysis
portfolio = await orch.get_portfolio(
    address="0x..."
)

# Cleanup
await orch.close()
```

---

# 🔗 Integration Guide

## Running APIs Locally

### 1. Omnichain API
```bash
cd omnichain
python main.py --mode api --port 8000
```

### 2. NEXUS API
```bash
cd nexus-webapp/python_analysis
python api.py
```

### 3. Access Documentation
- Omnichain: http://localhost:8000/docs
- NEXUS: http://localhost:8001/docs

---

## Environment Variables

### Omnichain (.env)
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ETHERSCAN_API_KEY=...
```

### NEXUS (.env)
```env
COINGECKO_API_KEY=...
```

---

## Rate Limits

| API | Free Tier | Paid Tier |
|-----|-----------|-----------|
| Omnichain | 50 req/min | Unlimited |
| NEXUS | 100 req/min | 1000 req/min |
| CoinGecko | 10-30 calls/min | 500 calls/min |

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error description"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error
- `503` - Service Unavailable

---

## 📞 Support

**Documentation:** See individual README files  
**Issues:** GitHub Issues  
**Updates:** Check CHANGELOG.md

---

**Last Updated:** December 26, 2025  
**Total Endpoints:** 60+  
**Total Methods:** 15+
