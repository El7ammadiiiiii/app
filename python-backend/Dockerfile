# ═══════════════════════════════════════════════
# 🐳 Dockerfile — CCWays Python Backend + Crawlers
# Includes: exchange scanners, pattern detection,
# chain/staking/holders/news crawlers
# Deploy to: Google Cloud Run (us-central1)
# ═══════════════════════════════════════════════

FROM python:3.12-slim

# System deps for lxml, aiohttp, beautifulsoup4
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first (Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install exchange SDKs with websockets conflicts separately (--no-deps)
# cryptofeed pulls websockets>=14.1; coinbase wants <14; bitfinex wants ~=12
RUN pip install --no-cache-dir --no-deps coinbase-advanced-py==1.8.1 \
    && pip install --no-cache-dir --no-deps bitfinex-api-py==3.0.4 \
    && pip install --no-cache-dir pyee~=11.1.0 PyJWT>=2.8.0 cryptography>=42.0.4 backoff>=2.2.1

# Copy application code
COPY . .

# Create data directory for SQLite (news persistence)
RUN mkdir -p /app/data

# Cloud Run uses PORT env var (default 8080)
ENV FASTAPI_HOST=0.0.0.0
ENV FASTAPI_PORT=8080
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
