import { ExchangeId } from "@/types/exchanges";

export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  icon?: string;
  color?: string;
  website?: string;
}

export const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  binance: { id: "binance", name: "Binance", icon: "🟡", color: "#F0B90B" },
  bybit: { id: "bybit", name: "Bybit", icon: "🟠", color: "#FFB11A" },
  okx: { id: "okx", name: "OKX", icon: "⚫", color: "#000000" },
  coinbase: { id: "coinbase", name: "Coinbase", icon: "🔵", color: "#0052FF" },
  kraken: { id: "kraken", name: "Kraken", icon: "🦑", color: "#5841D8" },
  kucoin: { id: "kucoin", name: "KuCoin", icon: "🟢", color: "#24AE8F" },
  mexc: { id: "mexc", name: "MEXC", icon: "🔵", color: "#00A4D8" },
  gateio: { id: "gateio", name: "Gate.io", icon: "🔴", color: "#E15143" },
  bitget: { id: "bitget", name: "Bitget", icon: "🔵", color: "#00F0FF" },
  htx: { id: "htx", name: "HTX", icon: "🔵", color: "#0052FF" },
  cryptocom: { id: "cryptocom", name: "Crypto.com", icon: "🔵", color: "#103F68" },
  bingx: { id: "bingx", name: "BingX", icon: "🔵", color: "#0052FF" },
  phemex: { id: "phemex", name: "Phemex", icon: "⚫", color: "#000000" },
  pionex: { id: "pionex", name: "Pionex", icon: "🟠", color: "#FF6600" },
  bitmart: { id: "bitmart", name: "BitMart", icon: "🔵", color: "#0052FF" },
  coinex: { id: "coinex", name: "CoinEx", icon: "🔵", color: "#0052FF" },
  digifinex: { id: "digifinex", name: "DigiFinex", icon: "🔵", color: "#0052FF" },
  gemini: { id: "gemini", name: "Gemini", icon: "🔵", color: "#00CFD5" },
  bitstamp: { id: "bitstamp", name: "Bitstamp", icon: "🟢", color: "#4FB848" },
  bitfinex: { id: "bitfinex", name: "Bitfinex", icon: "🟢", color: "#000000" },
  tapbit: { id: "tapbit", name: "Tapbit", icon: "🔵", color: "#0052FF" },
};

export const getAllExchanges = () => Object.values(EXCHANGE_CONFIGS);
