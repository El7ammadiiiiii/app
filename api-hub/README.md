# 🌐 API Hub - Unified API Collection

**Generated:** December 26, 2025  
**Total APIs:** 79 endpoints across 3 categories

---

## 📁 Structure

```
api-hub/
├── blockchain/          # Omnichain Blockchain APIs (12 endpoints)
│   ├── main.py         # FastAPI server
│   ├── config.py       # API keys & configurations
│   ├── orchestrator/   # Claude 3.5 Sonnet orchestrator
│   ├── providers/      # Bitcoin, Ethereum, EVM providers
│   ├── analytics/      # Graph analysis, ML models
│   ├── scoring/        # Fusion engine
│   ├── cache/          # Redis + SimpleCache
│   └── requirements.txt
│
├── technical/          # Technical Analysis APIs (31 endpoints)
│   ├── api.py          # Main FastAPI server
│   ├── indicators.py   # 17+ technical indicators
│   ├── patterns.py     # 77 chart patterns
│   ├── trendlines.py   # Support/Resistance
│   ├── coingecko.py    # CoinGecko integration
│   ├── detectors/      # Pattern detection modules
│   └── requirements.txt
│
├── ml/                 # ML Pattern Recognition APIs (6 endpoints)
│   ├── supreme-api.py  # Supreme V7 API
│   └── elite-api.py    # Elite API
│
└── README.md           # This file
```

---

## 🚀 Quick Start

### 1. Blockchain API (Omnichain)

```bash
cd api-hub/blockchain
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Run server
python main.py --mode api --port 8000
```

**Access:** http://localhost:8000/docs

**Key Features:**
- 101+ blockchains supported
- Natural language queries
- Graph analysis (Nansen-style)
- Anomaly detection
- Multi-source score fusion

---

### 2. Technical Analysis API

```bash
cd api-hub/technical
pip install -r requirements.txt

# Run server
python api.py
```

**Access:** http://localhost:8001/docs

**Key Features:**
- 17+ technical indicators
- 77 chart patterns (12 categories)
- Live data from 13+ exchanges
- CoinGecko integration
- Pattern scanner

---

### 3. ML Pattern Recognition API

```bash
cd api-hub/ml

# Supreme V7 API
python supreme-api.py --port 8765

# Elite API
python elite-api.py --port 8766
```

**Key Features:**
- Supreme V7 model (highest accuracy)
- Elite 3-stage model
- Image-based pattern recognition
- Batch processing

---

## 📊 API Endpoints Summary

### Blockchain APIs (12)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | System information |
| GET | `/health` | Health check |
| GET | `/chains` | List 101+ supported chains |
| GET | `/agents` | List AI agents |
| POST | `/query` | Natural language query |
| POST | `/balance` | Get balance across chains |
| POST | `/analyze` | Deep address analysis |
| POST | `/compare` | Compare chains |
| GET | `/portfolio/{address}` | Complete portfolio |
| POST | `/analytics/graph` | Transaction graph analysis |
| POST | `/analytics/anomaly` | Anomaly detection |
| POST | `/score/fusion` | Multi-source fusion |

---

### Technical Analysis APIs (31)

**Core Analysis:**
- POST `/analyze` - Complete technical analysis
- POST `/indicators` - Calculate indicators
- POST `/patterns` - Detect patterns
- POST `/trendlines` - Analyze trendlines

**Live Data:**
- GET `/live/{exchange}/{symbol}/{timeframe}` - Live market data

**CoinGecko (11 endpoints):**
- GET `/coingecko/price/{coin_id}`
- GET `/coingecko/prices`
- GET `/coingecko/top`
- GET `/coingecko/trending`
- GET `/coingecko/global`
- GET `/coingecko/search`
- GET `/coingecko/coin/{coin_id}`
- GET `/coingecko/chart/{coin_id}`
- GET `/coingecko/ohlc/{coin_id}`
- GET `/coingecko/categories`
- GET `/coingecko/exchanges`

**Pattern Scanner (4 endpoints):**
- POST `/patterns/scan-all` - Scan all 77 patterns
- POST `/patterns/scan-category/{category}` - Scan specific category
- GET `/patterns/categories` - List categories
- POST `/patterns/scan-multiple` - Batch scan

---

### ML APIs (6)

**Supreme V7:**
- POST `/predict/image` - Predict from base64 image
- POST `/predict/batch` - Batch prediction
- GET `/model/info` - Model information

**Elite:**
- POST `/predict/image` - Predict pattern
- GET `/classes` - Available classes
- POST `/predict/batch` - Batch processing

---

## 🔧 Configuration

### Blockchain API (.env)
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ETHERSCAN_API_KEY=...
LOG_LEVEL=INFO
```

### Technical API (.env)
```env
COINGECKO_API_KEY=...
```

---

## 📚 Documentation

- **Complete API Reference:** See [../API_REFERENCE.md](../API_REFERENCE.md)
- **Blockchain Details:** See `blockchain/README.md`
- **Technical Analysis:** See `technical/README.md`

---

## 🎯 Usage Examples

### Example 1: Natural Language Query (Blockchain)

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum?"
  }'
```

### Example 2: Pattern Scanning (Technical)

```bash
curl -X POST http://localhost:8001/patterns/scan-all \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "timestamp": [...],
      "open": [...],
      "high": [...],
      "low": [...],
      "close": [...],
      "volume": [...]
    }
  }'
```

### Example 3: ML Prediction

```bash
curl -X POST http://localhost:8765/predict/image \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image_data"
  }'
```

---

## 🔗 Integration

### Python

```python
import aiohttp

async def query_blockchain(question):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            'http://localhost:8000/query',
            json={'query': question}
        ) as resp:
            return await resp.json()

# Usage
result = await query_blockchain("Show me Bitcoin price")
```

### JavaScript/TypeScript

```typescript
async function scanPatterns(ohlcvData) {
  const response = await fetch('http://localhost:8001/patterns/scan-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: ohlcvData })
  });
  return await response.json();
}
```

---

## 📦 Dependencies

### Blockchain
- fastapi >= 0.109.0
- anthropic >= 0.18.0
- openai >= 1.10.0
- networkx >= 3.0
- scikit-learn >= 1.3.0
- redis >= 5.0.0

### Technical Analysis
- fastapi >= 0.104.0
- pandas-ta >= 0.3.14
- ccxt >= 4.0.0
- pandas >= 2.0.0
- numpy >= 1.24.0

### ML
- torch >= 2.0.0
- torchvision >= 0.15.0
- timm >= 0.9.0
- PIL (Pillow)

---

## 🎨 Next.js Integration

All APIs can be accessed from Next.js routes in `src/app/api/`:

```typescript
// Example: src/app/api/blockchain/query/route.ts
export async function POST(request: Request) {
  const { query } = await request.json();
  
  const response = await fetch('http://localhost:8000/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  return Response.json(await response.json());
}
```

---

## 🚦 Status

| API | Status | Port | Docs |
|-----|--------|------|------|
| **Blockchain** | ✅ Ready | 8000 | /docs |
| **Technical** | ✅ Ready | 8001 | /docs |
| **ML Supreme** | ✅ Ready | 8765 | - |
| **ML Elite** | ✅ Ready | 8766 | - |

---

## 📞 Support

**Issues:** Create issue in repository  
**Documentation:** See individual README files in each subdirectory  
**Updates:** Check CHANGELOG for latest changes

---

**Last Updated:** December 26, 2025  
**Version:** 1.0.0  
**Total Endpoints:** 79
