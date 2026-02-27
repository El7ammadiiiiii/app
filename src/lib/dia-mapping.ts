/**
 * DIA (diadata.org) blockchain mapping
 *
 * Maps CoinGecko coin-id / platform names to the blockchain+address pairs
 * expected by the DIA REST API  (`/v1/assetInfo/{blockchain}/{address}`).
 *
 * Native coins use the zero-address convention.
 */

const ZERO = '0x0000000000000000000000000000000000000000';

/* ─── Native coin mapping (CoinGecko id → DIA) ─── */
const NATIVE_COINS: Record<string, { blockchain: string; address: string }> = {
  bitcoin:       { blockchain: 'Bitcoin',            address: ZERO },
  ethereum:      { blockchain: 'Ethereum',           address: ZERO },
  solana:        { blockchain: 'Solana',             address: ZERO },
  cardano:       { blockchain: 'Cardano',            address: ZERO },
  avalanche:     { blockchain: 'Avalanche',          address: ZERO },
  'avalanche-2': { blockchain: 'Avalanche',          address: ZERO },
  polkadot:      { blockchain: 'Polkadot',           address: ZERO },
  tron:          { blockchain: 'Tron',               address: ZERO },
  cosmos:        { blockchain: 'Cosmos',             address: ZERO },
  near:          { blockchain: 'NEAR',               address: ZERO },
  litecoin:      { blockchain: 'Litecoin',           address: ZERO },
  'bitcoin-cash':{ blockchain: 'BitcoinCash',        address: ZERO },
  filecoin:      { blockchain: 'Filecoin',           address: ZERO },
  stellar:       { blockchain: 'Stellar',            address: ZERO },
  algorand:      { blockchain: 'Algorand',           address: ZERO },
  fantom:        { blockchain: 'Fantom',             address: ZERO },
  ripple:        { blockchain: 'XRPL',               address: ZERO },
  xrp:           { blockchain: 'XRPL',               address: ZERO },
  toncoin:       { blockchain: 'TON',                address: ZERO },
  sui:           { blockchain: 'Sui',                address: ZERO },
  aptos:         { blockchain: 'Aptos',              address: ZERO },
  hedera:        { blockchain: 'Hedera',             address: ZERO },
  'hedera-hashgraph': { blockchain: 'Hedera',        address: ZERO },
  binancecoin:   { blockchain: 'BinanceSmartChain',  address: ZERO },
  'bnb':         { blockchain: 'BinanceSmartChain',  address: ZERO },
  dogecoin:      { blockchain: 'Dogechain',          address: ZERO },
  monero:        { blockchain: 'Monero',             address: ZERO },
};

/* ─── CoinGecko platform-id → DIA blockchain name ─── */
const PLATFORM_MAP: Record<string, string> = {
  ethereum:                    'Ethereum',
  'binance-smart-chain':       'BinanceSmartChain',
  'polygon-pos':               'Polygon',
  'arbitrum-one':              'Arbitrum',
  'optimistic-ethereum':       'Optimism',
  avalanche:                   'Avalanche',
  fantom:                      'Fantom',
  base:                        'Base',
  solana:                      'Solana',
  tron:                        'Tron',
  near:                        'NEAR',
  'harmony-shard-0':           'Harmony',
  gnosis:                      'Gnosis',
  celo:                        'Celo',
  moonbeam:                    'Moonbeam',
  cronos:                      'Cronos',
  sui:                         'Sui',
  aptos:                       'Aptos',
  'zksync':                    'zkSync',
  linea:                       'Linea',
  scroll:                      'Scroll',
  mantle:                      'Mantle',
  'the-open-network':          'TON',
};

/* ─── DIA exchange name → CoinGecko-style logo URL ─── */
export const DIA_EXCHANGE_LOGOS: Record<string, string> = {
  Binance:        'https://assets.coingecko.com/markets/images/52/small/binance.jpg',
  'Crypto.com':   'https://assets.coingecko.com/markets/images/589/small/Crypto.jpg',
  Kraken:         'https://assets.coingecko.com/markets/images/29/small/kraken.jpg',
  Coinbase:       'https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png',
  OKX:            'https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png',
  Bybit:          'https://assets.coingecko.com/markets/images/698/small/bybit_spot.png',
  GateIO:         'https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg',
  KuCoin:         'https://assets.coingecko.com/markets/images/61/small/kucoin.png',
  Bitget:         'https://assets.coingecko.com/markets/images/540/small/Bitget.jpeg',
  MEXC:           'https://assets.coingecko.com/markets/images/409/small/MEXC_logo_square.jpeg',
  HTX:            'https://assets.coingecko.com/markets/images/25/small/logo_V_colour_black.png',
  Bitfinex:       'https://assets.coingecko.com/markets/images/4/small/BItfinex.png',
  BingX:          'https://assets.coingecko.com/markets/images/812/small/BingX_brand_logo.png',
  BitMart:        'https://assets.coingecko.com/markets/images/239/small/MjAxNy0wNi0yNSAxNjo1NzozMiAzMzQzOTQ.jpg',
  Bitstamp:       'https://assets.coingecko.com/markets/images/9/small/bitstamp.jpg',
  Gemini:         'https://assets.coingecko.com/markets/images/50/small/gemini.png',
  Upbit:          'https://assets.coingecko.com/markets/images/117/small/logo-square.jpeg',
  LBank:          'https://assets.coingecko.com/markets/images/438/small/LBank_logo.png',
  Bitmax:         'https://assets.coingecko.com/markets/images/239/small/MjAxNy0wNi0yNSAxNjo1NzozMiAzMzQzOTQ.jpg',
  Phemex:         'https://assets.coingecko.com/markets/images/508/small/phemex.png',
  WhiteBIT:       'https://assets.coingecko.com/markets/images/418/small/whitebit.png',
  DigiFinex:      'https://assets.coingecko.com/markets/images/225/small/Digifinex.png',
  Bittrex:        'https://assets.coingecko.com/markets/images/10/small/bittrex.jpg',
  CoinEx:         'https://assets.coingecko.com/markets/images/135/small/CoinEx.jpg',
  Bullish:        'https://assets.coingecko.com/markets/images/868/small/Bullish_Logo_Mark.png',
  'Binance US':   'https://assets.coingecko.com/markets/images/419/small/Binance_US.png',
};

/**
 * Resolve DIA blockchain + address from CoinGecko coin data.
 *
 * @param coinId  - CoinGecko coin id (e.g. "bitcoin", "ethereum")
 * @param platforms - CoinGecko `platforms` object (e.g. { ethereum: "0xabc…" })
 * @param contractAddress - optional: primary contract address from CoinGecko
 * @returns  { blockchain, address } or null if not mappable
 */
export function getDiaParams(
  coinId: string,
  platforms?: Record<string, string>,
  contractAddress?: string,
): { blockchain: string; address: string } | null {
  // 1. Check native coin mapping first
  const native = NATIVE_COINS[coinId];
  if (native) return native;

  // 2. Try platforms map — prefer Ethereum, then other known chains
  if (platforms && Object.keys(platforms).length > 0) {
    // Prefer Ethereum (most coverage in DIA)
    if (platforms.ethereum) {
      return { blockchain: 'Ethereum', address: platforms.ethereum };
    }
    // Try other known platforms
    for (const [cgPlatform, addr] of Object.entries(platforms)) {
      if (!addr) continue;
      const diaChain = PLATFORM_MAP[cgPlatform];
      if (diaChain) return { blockchain: diaChain, address: addr };
    }
  }

  // 3. Fallback: if we have a contract address but no platform, assume Ethereum
  if (contractAddress) {
    return { blockchain: 'Ethereum', address: contractAddress };
  }

  return null;
}
