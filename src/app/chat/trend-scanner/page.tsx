"use client";

/**
 * Trend Scanner Main Page - صفحة الماسح الضوئي الرئيسية
 * @last-reviewed 2025-12-20
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useFavoriteCoins } from "@/lib/hooks/useFavoriteCoins";
import { InlineFavoriteStar } from "@/components/market/FavoriteButton";
import { FavoritesLink } from "@/components/market/FavoritesLink";
import { 
  TrendGaugeCompact, 
  IndicatorSignalBadge,
  TrendSummaryCard 
} from "@/components/charts/TrendGauge";
import {
  calculateTrendStrength,
  type OHLCV,
  type Timeframe,
  timeframeLabels
} from "@/lib/indicators/technical";
// Advanced Analysis Engine (Internal)
import { analyzeTimeframe, type OHLCVData, type FullAnalysis } from "@/lib/analysis/engine";
// Elite Trend Imports - Commented out until module is created
// import { 
//   getEliteSignalSummary, 
//   getRegimeDisplayInfo,
//   type EliteTrendResult 
// } from "@/lib/indicators/elite-trend-algorithms";
import { 
  getConfidenceLevelDisplay,
  type ConfidenceBreakdown 
} from "@/lib/indicators/prediction-confidence";
import { getAccuracyStats } from "@/lib/analysis/accuracy-tracker";

// ============================================
// Types & Interfaces
// ============================================

interface CoinData {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  image?: string;
}

interface TrendData {
  symbol: string;
  coin: CoinData;
  timeframes: {
    [key in Timeframe]?: {
      bullishScore: number;
      bearishScore: number;
      overallTrend: string;
      indicators: {
        name: string;
        signal: "bullish" | "bearish" | "neutral";
        strength: number;
      }[];
    };
  };
  overallScore: number;
  dominantTrend: "bullish" | "bearish" | "neutral";
  loading: boolean;
}

// ============================================
// Constants
// ============================================

const EXCHANGES = [
  { id: "all", name: "جميع المنصات", icon: "🌐" },
  { id: "binance", name: "BINANCE", icon: "🟡" },
  { id: "bybit", name: "BYBIT", icon: "🟠" },
  { id: "okx", name: "OKX", icon: "⚫" },
  { id: "bitget", name: "Bitget", icon: "🟢" },
  { id: "bingx", name: "BingX", icon: "🔶" },
  { id: "gate", name: "GATE.IO", icon: "🔵" },
  { id: "mexc", name: "MEXC", icon: "🟣" },
  { id: "kucoin", name: "KuCoin", icon: "🟩" },
  { id: "htx", name: "HTX", icon: "🔴" },
  { id: "phemex", name: "Phemex", icon: "🟤" },
  { id: "cryptocom", name: "Crypto.com", icon: "🔷" },
  { id: "kraken", name: "Kraken", icon: "🟦" },
  { id: "coinbase", name: "Coinbase", icon: "💙" },
];

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d", "3d"];

const TOP_COINS = [
  // Top 10
  { symbol: "BTCUSDT", name: "Bitcoin", coingeckoId: "bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "BNBUSDT", name: "BNB", coingeckoId: "binancecoin" },
  { symbol: "SOLUSDT", name: "Solana", coingeckoId: "solana" },
  { symbol: "XRPUSDT", name: "XRP", coingeckoId: "ripple" },
  { symbol: "DOGEUSDT", name: "Dogecoin", coingeckoId: "dogecoin" },
  { symbol: "ADAUSDT", name: "Cardano", coingeckoId: "cardano" },
  { symbol: "TRXUSDT", name: "TRON", coingeckoId: "tron" },
  { symbol: "AVAXUSDT", name: "Avalanche", coingeckoId: "avalanche-2" },
  { symbol: "SHIBUSDT", name: "Shiba Inu", coingeckoId: "shiba-inu" },
  // Top 20
  { symbol: "LINKUSDT", name: "Chainlink", coingeckoId: "chainlink" },
  { symbol: "DOTUSDT", name: "Polkadot", coingeckoId: "polkadot" },
  { symbol: "BCHUSDT", name: "Bitcoin Cash", coingeckoId: "bitcoin-cash" },
  { symbol: "NEARUSDT", name: "NEAR Protocol", coingeckoId: "near" },
  { symbol: "LTCUSDT", name: "Litecoin", coingeckoId: "litecoin" },
  { symbol: "SUIUSDT", name: "Sui", coingeckoId: "sui" },
  { symbol: "PEPEUSDT", name: "Pepe", coingeckoId: "pepe" },
  { symbol: "UNIUSDT", name: "Uniswap", coingeckoId: "uniswap" },
  { symbol: "APTUSDT", name: "Aptos", coingeckoId: "aptos" },
  { symbol: "ICPUSDT", name: "Internet Computer", coingeckoId: "internet-computer" },
  // Top 30
  { symbol: "MATICUSDT", name: "Polygon", coingeckoId: "matic-network" },
  { symbol: "ETCUSDT", name: "Ethereum Classic", coingeckoId: "ethereum-classic" },
  { symbol: "RENDERUSDT", name: "Render", coingeckoId: "render-token" },
  { symbol: "HBARUSDT", name: "Hedera", coingeckoId: "hedera-hashgraph" },
  { symbol: "ATOMUSDT", name: "Cosmos", coingeckoId: "cosmos" },
  { symbol: "FILUSDT", name: "Filecoin", coingeckoId: "filecoin" },
  { symbol: "ARBUSDT", name: "Arbitrum", coingeckoId: "arbitrum" },
  { symbol: "OPUSDT", name: "Optimism", coingeckoId: "optimism" },
  { symbol: "INJUSDT", name: "Injective", coingeckoId: "injective-protocol" },
  { symbol: "FETUSDT", name: "Fetch.ai", coingeckoId: "fetch-ai" },
  // Top 40
  { symbol: "VETUSDT", name: "VeChain", coingeckoId: "vechain" },
  { symbol: "GRTUSDT", name: "The Graph", coingeckoId: "the-graph" },
  { symbol: "AAVEUSDT", name: "Aave", coingeckoId: "aave" },
  { symbol: "MKRUSDT", name: "Maker", coingeckoId: "maker" },
  { symbol: "THETAUSDT", name: "Theta Network", coingeckoId: "theta-token" },
  { symbol: "SANDUSDT", name: "The Sandbox", coingeckoId: "the-sandbox" },
  { symbol: "MANAUSDT", name: "Decentraland", coingeckoId: "decentraland" },
  { symbol: "AXSUSDT", name: "Axie Infinity", coingeckoId: "axie-infinity" },
  { symbol: "FTMUSDT", name: "Fantom", coingeckoId: "fantom" },
  { symbol: "ALGOUSDT", name: "Algorand", coingeckoId: "algorand" },
  // Top 50
  { symbol: "XTZUSDT", name: "Tezos", coingeckoId: "tezos" },
  { symbol: "EOSUSDT", name: "EOS", coingeckoId: "eos" },
  { symbol: "SNXUSDT", name: "Synthetix", coingeckoId: "havven" },
  { symbol: "CHZUSDT", name: "Chiliz", coingeckoId: "chiliz" },
  { symbol: "CRVUSDT", name: "Curve DAO", coingeckoId: "curve-dao-token" },
  { symbol: "LDOUSDT", name: "Lido DAO", coingeckoId: "lido-dao" },
  { symbol: "APEUSDT", name: "ApeCoin", coingeckoId: "apecoin" },
  { symbol: "1INCHUSDT", name: "1inch", coingeckoId: "1inch" },
  { symbol: "COMPUSDT", name: "Compound", coingeckoId: "compound-governance-token" },
  { symbol: "RUNEUSDT", name: "THORChain", coingeckoId: "thorchain" },
  // Top 60
  { symbol: "FLOWUSDT", name: "Flow", coingeckoId: "flow" },
  { symbol: "ZILUSDT", name: "Zilliqa", coingeckoId: "zilliqa" },
  { symbol: "ENJUSDT", name: "Enjin Coin", coingeckoId: "enjincoin" },
  { symbol: "GALAUSDT", name: "Gala", coingeckoId: "gala" },
  { symbol: "KAVAUSDT", name: "Kava", coingeckoId: "kava" },
  { symbol: "CAKEUSDT", name: "PancakeSwap", coingeckoId: "pancakeswap-token" },
  { symbol: "WOOUSDT", name: "WOO", coingeckoId: "woo-network" },
  { symbol: "MINAUSDT", name: "Mina Protocol", coingeckoId: "mina-protocol" },
  { symbol: "GMXUSDT", name: "GMX", coingeckoId: "gmx" },
  { symbol: "DYDXUSDT", name: "dYdX", coingeckoId: "dydx" },
  // Top 70
  { symbol: "IOTAUSDT", name: "IOTA", coingeckoId: "iota" },
  { symbol: "NEOUSDT", name: "Neo", coingeckoId: "neo" },
  { symbol: "KLAYUSDT", name: "Klaytn", coingeckoId: "klay-token" },
  { symbol: "EGLDUSDT", name: "MultiversX", coingeckoId: "elrond-erd-2" },
  { symbol: "XECUSDT", name: "eCash", coingeckoId: "ecash" },
  { symbol: "CFXUSDT", name: "Conflux", coingeckoId: "conflux-token" },
  { symbol: "ROSEUSDT", name: "Oasis Network", coingeckoId: "oasis-network" },
  { symbol: "QNTUSDT", name: "Quant", coingeckoId: "quant-network" },
  { symbol: "KSMUSDT", name: "Kusama", coingeckoId: "kusama" },
  { symbol: "ZECUSDT", name: "Zcash", coingeckoId: "zcash" },
  // Top 80
  { symbol: "DASHUSDT", name: "Dash", coingeckoId: "dash" },
  { symbol: "BATUSDT", name: "Basic Attention", coingeckoId: "basic-attention-token" },
  { symbol: "WAVESUSDT", name: "Waves", coingeckoId: "waves" },
  { symbol: "HOTUSDT", name: "Holo", coingeckoId: "holotoken" },
  { symbol: "ICXUSDT", name: "ICON", coingeckoId: "icon" },
  { symbol: "SXPUSDT", name: "Solar", coingeckoId: "swipe" },
  { symbol: "ZRXUSDT", name: "0x Protocol", coingeckoId: "0x" },
  { symbol: "ONTUSDT", name: "Ontology", coingeckoId: "ontology" },
  { symbol: "ANKRUSDT", name: "Ankr", coingeckoId: "ankr" },
  { symbol: "IOSTUSDT", name: "IOST", coingeckoId: "iostoken" },
  // Top 90
  { symbol: "RVNUSDT", name: "Ravencoin", coingeckoId: "ravencoin" },
  { symbol: "SKLUSDT", name: "SKALE", coingeckoId: "skale" },
  { symbol: "LRCUSDT", name: "Loopring", coingeckoId: "loopring" },
  { symbol: "CELRUSDT", name: "Celer Network", coingeckoId: "celer-network" },
  { symbol: "STXUSDT", name: "Stacks", coingeckoId: "blockstack" },
  { symbol: "CKBUSDT", name: "Nervos Network", coingeckoId: "nervos-network" },
  { symbol: "ONEUSDT", name: "Harmony", coingeckoId: "harmony" },
  { symbol: "AUDIOUSDT", name: "Audius", coingeckoId: "audius" },
  { symbol: "STORJUSDT", name: "Storj", coingeckoId: "storj" },
  { symbol: "CTSIUSDT", name: "Cartesi", coingeckoId: "cartesi" },
  // Top 100
  { symbol: "OGNUSDT", name: "Origin Protocol", coingeckoId: "origin-protocol" },
  { symbol: "NMRUSDT", name: "Numeraire", coingeckoId: "numeraire" },
  { symbol: "BANDUSDT", name: "Band Protocol", coingeckoId: "band-protocol" },
  { symbol: "OCEANUSDT", name: "Ocean Protocol", coingeckoId: "ocean-protocol" },
  { symbol: "RLCUSDT", name: "iExec RLC", coingeckoId: "iexec-rlc" },
  { symbol: "NKNUSDT", name: "NKN", coingeckoId: "nkn" },
  { symbol: "DGBUSDT", name: "DigiByte", coingeckoId: "digibyte" },
  { symbol: "SCUSDT", name: "Siacoin", coingeckoId: "siacoin" },
  { symbol: "BLZUSDT", name: "Bluzelle", coingeckoId: "bluzelle" },
  { symbol: "IOTXUSDT", name: "IoTeX", coingeckoId: "iotex" },
];

// ============================================
// Custom Hooks
// ============================================

function useOHLCV(symbol: string, interval: string, exchange: string = "binance") {
  const [data, setData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Use selected exchange or default to binance
        const exchangeParam = exchange === "all" ? "binance" : exchange;
        const response = await fetch(
          `/api/ohlcv?symbol=${symbol}&interval=${interval}&limit=500&exchange=${exchangeParam}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${symbol}`);
        }
        
        const result = await response.json();
        setData(result.data || []);
        setError(null);
      } catch (err) {
        setError(String(err));
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [symbol, interval, exchange]);

  return { data, loading, error };
}

// Hook to fetch OHLCV data for all timeframes with Advanced Analysis
function useMultiTimeframeOHLCV(symbol: string, exchange: string = "binance") {
  const [timeframeData, setTimeframeData] = useState<{
    [key in Timeframe]?: {
      data: OHLCV[];
      analysis: ReturnType<typeof calculateTrendStrength> | null;
      advancedAnalysis?: FullAnalysis | null;
    };
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState({ price: 0, change24h: 0 });

  useEffect(() => {
    const fetchAllTimeframes = async () => {
      try {
        setLoading(true);
        const exchangeParam = exchange === "all" ? "binance" : exchange;
        
        // Fetch all timeframes in parallel
        const results = await Promise.all(
          TIMEFRAMES.map(async (tf) => {
            try {
              const response = await fetch(
                `/api/ohlcv?symbol=${symbol}&interval=${tf}&limit=500&exchange=${exchangeParam}`
              );
              if (!response.ok) throw new Error(`Failed to fetch ${symbol} ${tf}`);
              const result = await response.json();
              const data = result.data || [];
              
              // Transform to advanced format
              const ohlcv: OHLCVData = {
                open: data.map((d: OHLCV) => d.open),
                high: data.map((d: OHLCV) => d.high),
                low: data.map((d: OHLCV) => d.low),
                close: data.map((d: OHLCV) => d.close),
                volume: data.map((d: OHLCV) => d.volume),
                timestamp: data.map((d: OHLCV) => d.timestamp || Date.now())
              };
              
              // Run advanced analysis (13 indicators + patterns)
              let advancedAnalysis: FullAnalysis | null = null;
              let analysis: ReturnType<typeof calculateTrendStrength> | null = null;
              
              if (data.length >= 50) {
                try {
                  advancedAnalysis = analyzeTimeframe(ohlcv, symbol, tf);
                  // Map advanced to simple format
                  analysis = {
                    bullishScore: advancedAnalysis.trendStrength.bullishScore,
                    bearishScore: advancedAnalysis.trendStrength.bearishScore,
                    overallTrend: advancedAnalysis.trendStrength.trend as "bullish" | "bearish" | "neutral",
                    indicators: [
                      ...advancedAnalysis.signals.buySignals.map(s => ({
                        name: s.indicator,
                        signal: "bullish" as const,
                        strength: s.strength
                      })),
                      ...advancedAnalysis.signals.sellSignals.map(s => ({
                        name: s.indicator,
                        signal: "bearish" as const,
                        strength: s.strength
                      }))
                    ]
                  };
                } catch {
                  analysis = calculateTrendStrength(data);
                }
              }
              
              return { tf, data, analysis, advancedAnalysis };
            } catch {
              return { tf, data: [], analysis: null, advancedAnalysis: null };
            }
          })
        );

        const newTimeframeData: typeof timeframeData = {};
        results.forEach(({ tf, data, analysis, advancedAnalysis }) => {
          newTimeframeData[tf] = { data, analysis, advancedAnalysis };
        });

        setTimeframeData(newTimeframeData);

        // Calculate price and 24h change from 1d data
        const dailyData = newTimeframeData["1d"]?.data || [];
        if (dailyData.length > 0) {
          const currentPrice = dailyData[dailyData.length - 1].close;
          const prevPrice = dailyData.length > 1 ? dailyData[dailyData.length - 2].close : currentPrice;
          const change = ((currentPrice - prevPrice) / prevPrice) * 100;
          setPriceInfo({ price: currentPrice, change24h: change });
        }

        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAllTimeframes();
    
    // Refresh every 60 seconds
    const intervalId = setInterval(fetchAllTimeframes, 60000);
    return () => clearInterval(intervalId);
  }, [symbol, exchange]);

  return { timeframeData, loading, error, priceInfo };
}

// ============================================
// Components
// ============================================

/**
 * Filter Bar Component - Exchange & Search Only
 */
function FilterBar({
  selectedExchanges,
  setSelectedExchanges,
  selectedPair,
  setSelectedPair,
  searchQuery,
  setSearchQuery,
}: {
  selectedExchanges: string[];
  setSelectedExchanges: (e: string[]) => void;
  selectedPair: "USDT" | "BTC";
  setSelectedPair: (p: "USDT" | "BTC") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const exchangeRef = React.useRef<HTMLDivElement>(null);
  const pairRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exchangeRef.current && !exchangeRef.current.contains(event.target as Node)) {
        setShowExchangeDropdown(false);
      }
      if (pairRef.current && !pairRef.current.contains(event.target as Node)) {
        setShowPairDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExchange = (exchangeId: string) => {
    if (exchangeId === "all") {
      setSelectedExchanges(["all"]);
    } else {
      const newExchanges = selectedExchanges.includes(exchangeId)
        ? selectedExchanges.filter(e => e !== exchangeId)
        : [...selectedExchanges.filter(e => e !== "all"), exchangeId];
      setSelectedExchanges(newExchanges.length === 0 ? ["all"] : newExchanges);
    }
  };

  return (
    <div className="backdrop-blur-xl border border-black/10 dark:border-black/30 rounded-2xl p-4 mb-6 relative z-50">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <input
            type="text"
            placeholder="🔍 بحث عن عملة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/5 dark:bg-black/30 border border-black/10 dark:border-black/40 rounded-xl px-4 py-2.5 text-foreground placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all text-sm"
          />
        </div>

        {/* Exchange & Pairs Dropdowns - Side by Side */}
        <div className="flex items-center gap-2">
          {/* Exchange Dropdown - Multi-select */}
          <div className="relative" ref={exchangeRef}>
            <button
              onClick={() => { setShowExchangeDropdown(!showExchangeDropdown); setShowPairDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0f3133] border border-[#1a4a4d] rounded-xl text-sm font-medium text-white hover:bg-[#1a4a4d] transition-all min-w-[120px]"
            >
              <span>Listed on</span>
              <svg className={`w-4 h-4 transition-transform ${showExchangeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showExchangeDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-[#0f3133] border border-[#1a4a4d] rounded-xl p-3 z-[9999] min-w-[200px] shadow-2xl max-h-[300px] overflow-y-auto">
                <div className="text-xs text-white/60 mb-2 px-1">Listed on</div>
                {EXCHANGES.filter(e => e.id !== "all").map((exchange) => (
                  <label
                    key={exchange.id}
                    className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExchanges.includes(exchange.id) || selectedExchanges.includes("all")}
                      onChange={() => toggleExchange(exchange.id)}
                      className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/30"
                    />
                    <span className="text-lg">{exchange.icon}</span>
                    <span className="text-sm text-white">{exchange.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Pairs Dropdown - USDT / BTC */}
          <div className="relative" ref={pairRef}>
            <button
              onClick={() => { setShowPairDropdown(!showPairDropdown); setShowExchangeDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0f3133] border border-[#1a4a4d] rounded-xl text-sm font-medium text-white hover:bg-[#1a4a4d] transition-all min-w-[90px]"
            >
              <span>{selectedPair}</span>
              <svg className={`w-4 h-4 transition-transform ${showPairDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showPairDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-[#0f3133] border border-[#1a4a4d] rounded-xl p-3 z-[9999] min-w-[120px] shadow-2xl">
                <div className="text-xs text-white/60 mb-2 px-1">Pairs</div>
                {["USDT", "BTC"].map((pair) => (
                  <label
                    key={pair}
                    className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="pair"
                      checked={selectedPair === pair}
                      onChange={() => { setSelectedPair(pair as "USDT" | "BTC"); setShowPairDropdown(false); }}
                      className="w-4 h-4 border-white/20 bg-transparent text-primary focus:ring-primary/30"
                    />
                    <span className="text-sm text-white">{pair}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Timeframe Signal Cell - Shows bullish/bearish progress bar with Elite indicators
 */
function TimeframeSignalCell({ 
  analysis,
  advancedAnalysis
}: { 
  analysis: ReturnType<typeof calculateTrendStrength> | null;
  advancedAnalysis?: FullAnalysis | null;
}) {
  if (!analysis) {
    return (
      <td className="py-3 px-1 text-center">
        <div className="w-16 h-5 bg-white/5 rounded mx-auto" />
      </td>
    );
  }

  const { bullishScore, bearishScore } = analysis;
  const total = bullishScore + bearishScore;
  const bullishPercent = total > 0 ? (bullishScore / total) * 100 : 50;
  const bearishPercent = total > 0 ? (bearishScore / total) * 100 : 50;
  
  // Elite indicators
  // Temporarily disabled until module is created
  // const eliteTrend = advancedAnalysis?.eliteTrend;
  const confidence = advancedAnalysis?.confidence;
  const isHighConfidence = confidence?.confidenceLevel === 'high';
  // Temporarily disabled until module is created
  // const regimeInfo = getRegimeDisplayInfo(eliteTrend?.regime);

  return (
    <td className="py-3 px-1 text-center">
      <div className="flex flex-col items-center gap-0.5">
        {/* Regime indicator (small) - Temporarily disabled */}
        {/* {regimeInfo && (
          <span className="text-[8px] opacity-60" title={regimeInfo.descriptionAr}>
            {regimeInfo.emoji}
          </span>
        )} */}
        {/* Progress bar */}
        <div className={`w-16 h-4 rounded-sm overflow-hidden flex bg-black/20 ${isHighConfidence ? 'ring-1 ring-yellow-400/50' : ''}`}>
          <div 
            className="h-full bg-gradient-to-r from-[#186d48] to-[#1a7d52] flex items-center justify-center"
            style={{ width: `${bullishPercent}%` }}
          >
            {bullishPercent > 30 && (
              <span className="text-[9px] font-bold text-white">{Math.round(bullishScore)}%</span>
            )}
          </div>
          <div 
            className="h-full bg-gradient-to-r from-[#a9203e] to-[#c02848] flex items-center justify-center"
            style={{ width: `${bearishPercent}%` }}
          >
            {bearishPercent > 30 && (
              <span className="text-[9px] font-bold text-white">{Math.round(bearishScore)}%</span>
            )}
          </div>
        </div>
        {/* High confidence indicator */}
        {isHighConfidence && (
          <span className="text-[8px] text-yellow-400">⭐</span>
        )}
      </div>
    </td>
  );
}

/**
 * Multi-Timeframe Trend Row - Shows all timeframes in one row
 */
function MultiTimeframeTrendRow({ 
  coin, 
  selectedExchange,
  onRowClick,
  isFavorite,
  onToggleFavorite,
}: { 
  coin: typeof TOP_COINS[0]; 
  selectedExchange: string;
  onRowClick: (symbol: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const { timeframeData, loading, error, priceInfo } = useMultiTimeframeOHLCV(coin.symbol, selectedExchange);

  if (loading) {
    return (
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-white/5 hover:bg-white/[0.02]"
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-1">
            <InlineFavoriteStar isFavorite={isFavorite} onToggle={onToggleFavorite} />
            <div className="text-foreground font-medium text-sm">{coin.symbol.replace("USDT", "")}</div>
            <span className="text-muted-foreground">/</span>
            <div className="text-xs px-1.5 py-0.5 bg-gray-700 dark:bg-gray-600 text-gray-200 dark:text-gray-300 rounded font-medium">USDT</div>
          </div>
        </td>
        {TIMEFRAMES.map((tf) => (
          <td key={tf} className="py-3 px-1 text-center">
            <div className="w-16 h-4 bg-white/5 rounded animate-pulse mx-auto" />
          </td>
        ))}
        <td className="py-3 px-4">
          <div className="w-20 h-4 bg-white/5 rounded animate-pulse" />
        </td>
        <td className="py-3 px-4">
          <div className="w-16 h-4 bg-white/5 rounded animate-pulse" />
        </td>
      </motion.tr>
    );
  }

  if (error) {
    return (
      <motion.tr className="border-b border-white/5">
        <td className="py-3 px-4">
          <div className="text-foreground font-medium text-sm">{coin.symbol.replace("USDT", "")}</div>
        </td>
        <td colSpan={7} className="py-3 px-4 text-center text-muted-foreground text-sm">
          ⚠️ فشل تحميل البيانات
        </td>
      </motion.tr>
    );
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      className="border-b border-white/5 cursor-pointer transition-colors"
      onClick={() => onRowClick(coin.symbol)}
    >
      {/* Coin */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <InlineFavoriteStar isFavorite={isFavorite} onToggle={onToggleFavorite} />
          <div className="text-foreground font-medium text-sm">{coin.symbol.replace("USDT", "")}</div>
          <span className="text-muted-foreground">/</span>
          <div className="text-[10px] px-1.5 py-0.5 bg-gray-700 dark:bg-gray-600 text-gray-200 dark:text-gray-300 rounded font-medium">USDT</div>
        </div>
      </td>

      {/* All Timeframes */}
      {TIMEFRAMES.map((tf) => (
        <TimeframeSignalCell 
          key={tf} 
          analysis={timeframeData[tf]?.analysis || null}
          advancedAnalysis={timeframeData[tf]?.advancedAnalysis || null}
        />
      ))}

      {/* Price */}
      <td className="py-3 px-4 text-right">
        <div className="text-foreground font-mono text-sm">
          $ {priceInfo.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: priceInfo.price < 1 ? 5 : 2 })}
        </div>
      </td>

      {/* 24h Change */}
      <td className="py-3 px-4 text-right">
        <span className={`font-mono text-sm ${priceInfo.change24h >= 0 ? "text-[#186d48]" : "text-[#a9203e]"}`}>
          {priceInfo.change24h >= 0 ? "+" : ""}{priceInfo.change24h.toFixed(2)} %
        </span>
      </td>
    </motion.tr>
  );
}

/**
 * Trend Scanner Table Row - Professional Theme
 */
function TrendRow({ 
  coin, 
  rank,
  selectedTimeframe,
  selectedExchange,
  onRowClick
}: { 
  coin: typeof TOP_COINS[0]; 
  rank: number;
  selectedTimeframe: Timeframe;
  selectedExchange: string;
  onRowClick: (symbol: string) => void;
}) {
  const { data, loading, error } = useOHLCV(coin.symbol, selectedTimeframe, selectedExchange);
  
  const trendAnalysis = useMemo(() => {
    if (!data || data.length < 50) return null;
    return calculateTrendStrength(data);
  }, [data]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const priceChange = data.length > 1 
    ? ((data[data.length - 1].close - data[data.length - 2].close) / data[data.length - 2].close) * 100 
    : 0;

  if (loading) {
    return (
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-black/10 dark:border-black/30"
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <span className="text-black/50 dark:text-white/50 font-mono">{rank}</span>
            <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-black/40 animate-pulse" />
            <div className="h-4 w-24 bg-black/10 dark:bg-black/40 rounded animate-pulse" />
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="h-4 w-20 bg-black/10 dark:bg-black/40 rounded animate-pulse" />
        </td>
        <td className="py-4 px-4">
          <div className="h-4 w-16 bg-black/10 dark:bg-black/40 rounded animate-pulse" />
        </td>
        <td className="py-4 px-4">
          <div className="h-4 w-32 bg-black/10 dark:bg-black/40 rounded animate-pulse" />
        </td>
      </motion.tr>
    );
  }

  if (error || !trendAnalysis) {
    return (
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-black/10 dark:border-black/30"
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <span className="text-black/50 dark:text-white/50 font-mono">{rank}</span>
            <span className="text-foreground font-medium">{coin.name}</span>
          </div>
        </td>
        <td colSpan={4} className="py-4 px-4 text-center text-black/50 dark:text-white/50">
          ⚠️ فشل تحميل البيانات
        </td>
      </motion.tr>
    );
  }

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "rgba(var(--primary-rgb), 0.05)" }}
      transition={{ duration: 0.2 }}
      className="border-b border-black/10 dark:border-black/30 cursor-pointer hover:bg-primary/5"
      onClick={() => onRowClick(coin.symbol)}
    >
      {/* Rank & Coin */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <span className="text-black/50 dark:text-white/50 font-mono w-6 text-sm">{rank}</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {coin.name.charAt(0)}
          </div>
          <div>
            <div className="text-foreground font-medium text-sm">{coin.name}</div>
            <div className="text-black/50 dark:text-white/50 text-xs">{coin.symbol.replace("USDT", "")}</div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="py-4 px-4">
        <div className="text-foreground font-mono text-sm">
          ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </td>

      {/* Price Change */}
      <td className="py-4 px-4">
        <span className={`font-mono text-sm ${priceChange >= 0 ? "text-[#186d48]" : "text-[#a9203e]"}`}>
          {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
        </span>
      </td>

      {/* Trend Gauge */}
      <td className="py-4 px-4">
        <TrendGaugeCompact
          bullishPercent={trendAnalysis.bullishScore}
          bearishPercent={trendAnalysis.bearishScore}
        />
      </td>
    </motion.tr>
  );
}

/**
 * Mobile Trend Card - For smaller screens
 */
function MobileTrendCard({ 
  coin, 
  rank,
  selectedTimeframe,
  selectedExchange,
  onCardClick
}: { 
  coin: typeof TOP_COINS[0]; 
  rank: number;
  selectedTimeframe: Timeframe;
  selectedExchange: string;
  onCardClick: (symbol: string) => void;
}) {
  const { data, loading, error } = useOHLCV(coin.symbol, selectedTimeframe, selectedExchange);
  
  const trendAnalysis = useMemo(() => {
    if (!data || data.length < 50) return null;
    return calculateTrendStrength(data);
  }, [data]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const priceChange = data.length > 1 
    ? ((data[data.length - 1].close - data[data.length - 2].close) / data[data.length - 2].close) * 100 
    : 0;

  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-black/40" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-black/10 dark:bg-black/40 rounded mb-1" />
            <div className="h-3 w-16 bg-black/10 dark:bg-black/40 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !trendAnalysis) {
    return (
      <div className="p-4 text-center text-black/50 dark:text-white/50 text-sm">
        ⚠️ {coin.name} - فشل تحميل البيانات
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 active:bg-primary/5 cursor-pointer"
      onClick={() => onCardClick(coin.symbol)}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-muted-foreground font-mono text-xs w-5">{rank}</span>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {coin.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="text-foreground font-medium text-sm">{coin.name}</div>
          <div className="text-muted-foreground text-xs">{coin.symbol.replace("USDT", "")}</div>
        </div>
        <div className="text-right">
          <div className="text-foreground font-mono text-sm">
            ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <span className={`font-mono text-xs ${priceChange >= 0 ? "text-[#186d48]" : "text-[#a9203e]"}`}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>
      
      <div className="flex items-center">
        <TrendGaugeCompact
          bullishPercent={trendAnalysis.bullishScore}
          bearishPercent={trendAnalysis.bearishScore}
        />
      </div>
    </motion.div>
  );
}

/**
 * Stats Summary Component - Professional & Responsive
 */
function StatsSummary({ 
  bullishCount, 
  bearishCount, 
  neutralCount 
}: { 
  bullishCount: number; 
  bearishCount: number; 
  neutralCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#186d48]/15 to-[#186d48]/5 border border-[#186d48]/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center"
      >
        <div className="text-2xl sm:text-3xl font-bold text-[#186d48]">{bullishCount}</div>
        <div className="text-xs sm:text-sm text-[#186d48]/80">صعودي 📈</div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-gray-300/50 to-gray-200/30 dark:from-white/[0.05] dark:to-white/[0.02] border border-gray-400/30 dark:border-white/[0.06] rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center"
      >
        <div className="text-2xl sm:text-3xl font-bold text-black/70 dark:text-muted-foreground">{neutralCount}</div>
        <div className="text-xs sm:text-sm text-black/50 dark:text-muted-foreground/70">محايد ⚖️</div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-[#a9203e]/15 to-[#a9203e]/5 border border-[#a9203e]/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center"
      >
        <div className="text-2xl sm:text-3xl font-bold text-[#a9203e]">{bearishCount}</div>
        <div className="text-xs sm:text-sm text-[#a9203e]/80">هبوطي 📉</div>
      </motion.div>
    </div>
  );
}

/**
 * Elite Algorithm Badge - Shows algorithm status
 */
function EliteAlgorithmBadge() {
  const [accuracyStats, setAccuracyStats] = useState<{
    overallAccuracy: number;
    validatedPredictions: number;
    highConfidenceAccuracy: number;
  } | null>(null);

  useEffect(() => {
    // Get accuracy stats from localStorage
    try {
      const stats = getAccuracyStats(30);
      if (stats.validatedPredictions > 0) {
        setAccuracyStats({
          overallAccuracy: stats.overallAccuracy,
          validatedPredictions: stats.validatedPredictions,
          highConfidenceAccuracy: stats.highConfidenceAccuracy
        });
      }
    } catch (e) {
      // No stats available yet
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl mb-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">🧠</span>
        <div>
          <div className="text-xs text-purple-300 font-medium">Elite Algorithm v2.0</div>
          <div className="text-[10px] text-purple-300/60">50+ Indicators • Multi-Confirmation</div>
        </div>
      </div>
      
      {accuracyStats && accuracyStats.validatedPredictions >= 10 && (
        <div className="flex items-center gap-3 mr-auto">
          <div className="text-center px-3 py-1 bg-black/20 rounded-lg">
            <div className="text-sm font-bold text-green-400">{accuracyStats.overallAccuracy}%</div>
            <div className="text-[9px] text-green-400/60">دقة عامة</div>
          </div>
          <div className="text-center px-3 py-1 bg-black/20 rounded-lg">
            <div className="text-sm font-bold text-yellow-400">{accuracyStats.highConfidenceAccuracy}%</div>
            <div className="text-[9px] text-yellow-400/60">ثقة عالية</div>
          </div>
          <div className="text-center px-3 py-1 bg-black/20 rounded-lg">
            <div className="text-sm font-bold text-blue-400">{accuracyStats.validatedPredictions}</div>
            <div className="text-[9px] text-blue-400/60">تنبؤات</div>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-1 text-[10px] text-white/40">
        <span>🔥 Trending</span>
        <span>•</span>
        <span>📊 Ranging</span>
        <span>•</span>
        <span>⚡ Volatile</span>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function TrendScannerPage() {
  const router = useRouter();
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(["all"]);
  const [selectedPair, setSelectedPair] = useState<"USDT" | "BTC">("USDT");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Favorites hook
  const { isFavorite, toggleFavorite, favoritesCount } = useFavoriteCoins();

  // Navigate to pair detail page
  const handleRowClick = useCallback((symbol: string) => {
    router.push(`/chat/trend-scanner/${symbol.toLowerCase()}`);
  }, [router]);

  // Filter coins based on search
  const filteredCoins = useMemo(() => {
    if (!searchQuery) return TOP_COINS;
    
    const query = searchQuery.toLowerCase();
    return TOP_COINS.filter(
      coin => 
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCoins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCoins = filteredCoins.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Auto-refresh timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get primary exchange for API calls
  const primaryExchange = selectedExchanges.includes("all") ? "binance" : selectedExchanges[0];

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 pb-24">
      <div className="glass-panel p-4 sm:p-6">
      {/* Header - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <motion.button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg bg-black/5 dark:bg-black/30 hover:bg-black/10 dark:hover:bg-black/40 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-xl">→</span>
          </motion.button>
          
          {/* Title - Centered */}
          <div className="text-center flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black dark:text-foreground flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl md:text-4xl">📊</span>
              ماسح الاتجاهات المتقدم
            </h1>
            <p className="text-black/60 dark:text-muted-foreground text-xs sm:text-sm mt-1 sm:mt-2">
              تحليل تقني متعدد الأطر الزمنية للعملات الرقمية
            </p>
          </div>
          
          {/* Live Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Live Status */}
            <div className="text-right">
              <div className="text-xs text-black/60 dark:text-muted-foreground">آخر تحديث</div>
              <div className="text-black dark:text-foreground font-mono text-sm">
                {lastUpdate.toLocaleTimeString("ar-SA")}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 bg-[#186d48] rounded-full"
                />
                <span className="text-[#186d48] text-xs">مباشر</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters & Favorites Link */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <FilterBar
            selectedExchanges={selectedExchanges}
            setSelectedExchanges={setSelectedExchanges}
            selectedPair={selectedPair}
            setSelectedPair={setSelectedPair}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
        <div className="flex items-start">
          <FavoritesLink count={favoritesCount} />
        </div>
      </div>

      {/* Elite Algorithm Badge */}
      <EliteAlgorithmBadge />

      {/* Main Table - Multi-Timeframe */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl border border-border/40 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm theme-card"
      >
        {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 dark:bg-white/[0.02] border-b border-border/30 dark:border-white/[0.06]">
                <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Coin</th>
                {TIMEFRAMES.map((tf) => (
                  <th key={tf} className="text-center py-3 px-2 text-muted-foreground font-medium text-sm">{tf}</th>
                ))}
                <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Price</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">24h %</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {paginatedCoins.map((coin) => (
                  <MultiTimeframeTrendRow
                    key={coin.symbol}
                    coin={coin}
                    selectedExchange={primaryExchange}
                    onRowClick={handleRowClick}
                    isFavorite={isFavorite(coin.symbol)}
                    onToggleFavorite={() => toggleFavorite(coin)}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredCoins.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/30 dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.01]">
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">عرض:</span>
              <div className="flex items-center gap-1">
                {[20, 50].map((num) => (
                  <button
                    key={num}
                    onClick={() => setItemsPerPage(num)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      itemsPerPage === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="text-muted-foreground text-sm">زوج</span>
            </div>

            {/* Page Info */}
            <div className="text-muted-foreground text-sm">
              عرض {startIndex + 1} - {Math.min(endIndex, filteredCoins.length)} من {filteredCoins.length} زوج
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === 1
                    ? "opacity-40 cursor-not-allowed"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="الصفحة الأولى"
              >
                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                </svg>
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === 1
                    ? "opacity-40 cursor-not-allowed"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="الصفحة السابقة"
              >
                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {(() => {
                  const pages: (number | string)[] = [];
                  const showPages = 5; // Number of pages to show
                  
                  if (totalPages <= showPages + 2) {
                    // Show all pages if total is small
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    // Always show first page
                    pages.push(1);
                    
                    // Calculate range around current page
                    let start = Math.max(2, currentPage - 1);
                    let end = Math.min(totalPages - 1, currentPage + 1);
                    
                    // Adjust range if at the edges
                    if (currentPage <= 3) {
                      end = Math.min(showPages, totalPages - 1);
                    } else if (currentPage >= totalPages - 2) {
                      start = Math.max(2, totalPages - showPages + 1);
                    }
                    
                    // Add ellipsis before range if needed
                    if (start > 2) pages.push("...");
                    
                    // Add range
                    for (let i = start; i <= end; i++) pages.push(i);
                    
                    // Add ellipsis after range if needed
                    if (end < totalPages - 1) pages.push("...");
                    
                    // Always show last page
                    pages.push(totalPages);
                  }
                  
                  return pages.map((page, idx) => (
                    typeof page === "number" ? (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-all ${
                          currentPage === page
                            ? "bg-primary text-primary-foreground"
                            : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                        {page}
                      </span>
                    )
                  ));
                })()}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === totalPages
                    ? "opacity-40 cursor-not-allowed"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="الصفحة التالية"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === totalPages
                    ? "opacity-40 cursor-not-allowed"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="الصفحة الأخيرة"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {filteredCoins.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <span className="text-4xl mb-4 block">🔍</span>
            لا توجد نتائج للبحث
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 glass-panel border border-white/[0.08] rounded-xl p-3 sm:p-4"
      >
        <h3 className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-3 font-medium">دليل الإشارات:</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-[#186d48]/20 text-[#186d48] rounded text-xs">75% ▲</div>
            <span className="text-foreground/80">إشارة صعودية</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-[#a9203e]/20 text-[#a9203e] rounded text-xs">65% ▼</div>
            <span className="text-foreground/80">إشارة هبوطية</span>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="mt-6 text-center text-muted-foreground/60 text-xs">
        البيانات من {primaryExchange.toUpperCase()} API • التحديث كل 60 ثانية • 
        <span className="text-primary"> NEXUS Trading Platform</span>
      </div>
      </div>
    </div>
  );
}
