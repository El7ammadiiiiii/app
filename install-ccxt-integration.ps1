# 🚀 CCXT Integration System - Installation Script (PowerShell)
# Install required dependencies for the exchange integration system

Write-Host "🌐 Installing CCXT Exchange Integration System..." -ForegroundColor Cyan
Write-Host ""

# Install CCXT library
Write-Host "📦 Installing CCXT library..." -ForegroundColor Yellow
npm install ccxt

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 System Structure:" -ForegroundColor Cyan
Write-Host "  ✅ Core Files (6)" -ForegroundColor Green
Write-Host "     - types.ts"
Write-Host "     - config.ts"
Write-Host "     - cache.ts"
Write-Host "     - rate-limiter.ts"
Write-Host "     - ccxt-manager.ts"
Write-Host "     - aggregator.ts"
Write-Host ""
Write-Host "  ✅ Exchange Integrations (10)" -ForegroundColor Green
Write-Host "     - Binance (Spot + USDⓈ-M Futures)"
Write-Host "     - Bybit (Spot + Linear Futures)"
Write-Host "     - OKX (Spot + Swap)"
Write-Host "     - Bitget (Spot + Futures)"
Write-Host "     - KuCoin (Spot + Futures)"
Write-Host ""
Write-Host "  ✅ API Routes (6)" -ForegroundColor Green
Write-Host "     - /api/exchanges/ticker"
Write-Host "     - /api/exchanges/orderbook"
Write-Host "     - /api/exchanges/ohlcv"
Write-Host "     - /api/exchanges/trades"
Write-Host "     - /api/exchanges/markets"
Write-Host "     - /api/exchanges/aggregated"
Write-Host ""
Write-Host "  ✅ React Integration (2)" -ForegroundColor Green
Write-Host "     - hooks/useExchangeData.ts"
Write-Host "     - stores/exchangeStore.ts"
Write-Host ""
Write-Host "  ✅ Example Components (2)" -ForegroundColor Green
Write-Host "     - components/TradingDashboard.tsx"
Write-Host "     - components/MultiExchangeComparison.tsx"
Write-Host ""
Write-Host "📖 Read CCXT_INTEGRATION_README.md for usage examples" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Quick Start:" -ForegroundColor Yellow
Write-Host "  1. Import hooks:"
Write-Host "     import { useTicker, useOrderBook } from '@/hooks/useExchangeData';"
Write-Host ""
Write-Host "  2. Use in component:"
Write-Host "     const { data, loading, error } = useTicker({ exchange: 'binance', symbol: 'BTC/USDT' });"
Write-Host ""
Write-Host "  3. Access API routes:"
Write-Host "     fetch('/api/exchanges/ticker?exchange=binance&symbol=BTC/USDT')"
Write-Host ""
Write-Host "🔥 Happy Trading!" -ForegroundColor Magenta
