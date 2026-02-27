/**
 * Fetch CoinGecko details for ALL coins
 * Run: cd ccways && node scripts/crawl-all-details.js [--start N] [--limit N]
 * With demo key: CG_DEMO_KEY=CG-xxx node scripts/crawl-all-details.js
 * 
 * - Reads coin IDs from coingecko-markets.json
 * - Loads existing coingecko-details.json, skips already-fetched coins
 * - Fetches remaining coins with rate limiting
 * - Saves progress every 10 coins
 * - Applies exchange logos from exchange-logos.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');
const MARKETS_PATH = path.join(DATA_DIR, 'coingecko-markets.json');
const DETAILS_PATH = path.join(DATA_DIR, 'coingecko-details.json');
const LOGOS_PATH = path.join(DATA_DIR, 'exchange-logos.json');
const OHLCV_PATH = path.join(DATA_DIR, 'coingecko-ohlcv.json');

// CoinGecko Demo API Key support
const CG_DEMO_KEY = process.env.CG_DEMO_KEY || '';
const CG_BASE_URL = 'https://api.coingecko.com/api/v3';
const CG_DELAY = CG_DEMO_KEY ? 2200 : 12000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Load exchange logos map
let exchangeLogos = {};
try {
  if (fs.existsSync(LOGOS_PATH)) {
    exchangeLogos = JSON.parse(fs.readFileSync(LOGOS_PATH, 'utf8'));
    console.log(`🏦 Loaded ${Object.keys(exchangeLogos).length} exchange logos`);
  }
} catch { }

// Hardcoded fallback
const EXCHANGE_LOGOS_FALLBACK = {
  'Binance': 'https://assets.coingecko.com/markets/images/52/small/binance.jpg',
  'Coinbase Exchange': 'https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png',
  'OKX': 'https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png',
  'Bybit': 'https://assets.coingecko.com/markets/images/698/small/bybit_spot.png',
  'Gate.io': 'https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg',
  'KuCoin': 'https://assets.coingecko.com/markets/images/61/small/kucoin.png',
  'Kraken': 'https://assets.coingecko.com/markets/images/29/small/kraken.jpg',
  'Bitget': 'https://assets.coingecko.com/markets/images/540/small/Bitget.jpeg',
  'MEXC': 'https://assets.coingecko.com/markets/images/409/small/MEXC_logo_square.jpeg',
  'HTX': 'https://assets.coingecko.com/markets/images/25/small/logo_V_colour_black.png',
};
const allLogos = { ...EXCHANGE_LOGOS_FALLBACK, ...exchangeLogos };

// Parse CLI args
function parseCliArgs() {
  const args = process.argv.slice(2);
  let start = 0, limit = 0, force = false, withOhlcv = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1]);
    if (args[i] === '--force') force = true;
    if (args[i] === '--with-ohlcv') withOhlcv = true;
  }
  return { start, limit, force, withOhlcv };
}

async function fetchJSON(url, retries = 5) {
  const headers = { 'Accept': 'application/json' };
  if (CG_DEMO_KEY) headers['x-cg-demo-api-key'] = CG_DEMO_KEY;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 429) {
        const wait = 60 + attempt * 30; // 90s, 120s, 150s...
        console.log(`  \u23f3 Rate limited, waiting ${wait}s (attempt ${attempt})...`);
        await sleep(wait * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log(`  ⏰ Timeout (attempt ${attempt}/${retries})`);
      } else {
        console.log(`  ⚠ Retry ${attempt}/${retries}: ${e.message}`);
      }
      if (attempt === retries) throw e;
      await sleep(10000 * attempt); // exponential backoff
    }
  }
}

function mapDetail(detail) {
  return {
    id: detail.id,
    name: detail.name,
    symbol: detail.symbol?.toUpperCase(),
    image: detail.image,
    description: detail.description?.en || '',
    categories: detail.categories || [],
    links: {
      homepage: detail.links?.homepage?.filter(Boolean) || [],
      whitepaper: detail.links?.whitepaper || '',
      blockchain_site: detail.links?.blockchain_site?.filter(Boolean) || [],
      repos_url: detail.links?.repos_url || {},
      twitter: detail.links?.twitter_screen_name || '',
      telegram: detail.links?.telegram_channel_identifier || '',
      reddit: detail.links?.subreddit_url || '',
      github: detail.links?.repos_url?.github?.filter(Boolean) || [],
    },
    genesis_date: detail.genesis_date || '',
    hashing_algorithm: detail.hashing_algorithm || '',
    market_data: {
      price: detail.market_data?.current_price?.usd || 0,
      market_cap: detail.market_data?.market_cap?.usd || 0,
      market_cap_rank: detail.market_data?.market_cap_rank || 0,
      fdv: detail.market_data?.fully_diluted_valuation?.usd || 0,
      total_volume: detail.market_data?.total_volume?.usd || 0,
      high_24h: detail.market_data?.high_24h?.usd || 0,
      low_24h: detail.market_data?.low_24h?.usd || 0,
      circulating_supply: detail.market_data?.circulating_supply || 0,
      total_supply: detail.market_data?.total_supply || 0,
      max_supply: detail.market_data?.max_supply || null,
      ath: detail.market_data?.ath?.usd || 0,
      ath_date: detail.market_data?.ath_date?.usd || '',
      ath_change: detail.market_data?.ath_change_percentage?.usd || 0,
      atl: detail.market_data?.atl?.usd || 0,
      atl_date: detail.market_data?.atl_date?.usd || '',
      atl_change: detail.market_data?.atl_change_percentage?.usd || 0,
      price_change_1h: detail.market_data?.price_change_percentage_1h_in_currency?.usd || 0,
      price_change_24h: detail.market_data?.price_change_percentage_24h || 0,
      price_change_7d: detail.market_data?.price_change_percentage_7d || 0,
      price_change_14d: detail.market_data?.price_change_percentage_14d || 0,
      price_change_30d: detail.market_data?.price_change_percentage_30d || 0,
      price_change_60d: detail.market_data?.price_change_percentage_60d || 0,
      price_change_200d: detail.market_data?.price_change_percentage_200d || 0,
      price_change_1y: detail.market_data?.price_change_percentage_1y || 0,
      mcap_fdv_ratio: detail.market_data?.market_cap_fdv_ratio || 0,
    },
    tickers: (detail.tickers || []).slice(0, 30).map(t => {
      const name = t.market?.name || '';
      return {
        base: t.base,
        target: t.target,
        exchange: name,
        exchange_logo: t.market?.logo || allLogos[name] || '',
        last_price: t.last || 0,
        volume: t.converted_volume?.usd || t.volume || 0,
        trade_url: t.trade_url || '',
        trust_score: t.trust_score || '',
      };
    }),
    community: {
      twitter_followers: detail.community_data?.twitter_followers || 0,
      reddit_subscribers: detail.community_data?.reddit_subscribers || 0,
      telegram_members: detail.community_data?.telegram_channel_user_count || 0,
    },
    developer: {
      forks: detail.developer_data?.forks || 0,
      stars: detail.developer_data?.stars || 0,
      subscribers: detail.developer_data?.subscribers || 0,
      total_issues: detail.developer_data?.total_issues || 0,
      closed_issues: detail.developer_data?.closed_issues || 0,
      pull_requests_merged: detail.developer_data?.pull_requests_merged || 0,
      commit_count_4_weeks: detail.developer_data?.commit_count_4_weeks || 0,
    },
    contract_address: detail.contract_address || '',
    platforms: detail.platforms || {},
    chart_365d: null,
    last_updated: detail.last_updated,
  };
}

async function main() {
  const { start, limit, force, withOhlcv } = parseCliArgs();

  // Load market coins list
  const markets = JSON.parse(fs.readFileSync(MARKETS_PATH, 'utf8'));
  const allCoins = limit > 0 ? markets.slice(start, start + limit).map(m => m.id) : markets.map(m => m.id);
  console.log(`📊 Processing ${allCoins.length} coins (start=${start}${limit ? ', limit=' + limit : ''})`);
  console.log(`🔑 API Key: ${CG_DEMO_KEY ? 'Demo key active (' + CG_DELAY + 'ms delay)' : 'Free tier (12s delay)'}`);
  if (withOhlcv) console.log('📈 OHLCV fetching enabled');

  // Load existing details
  let existingDetails = [];
  try { existingDetails = JSON.parse(fs.readFileSync(DETAILS_PATH, 'utf8')); } catch(e) {}
  const existingIds = new Set(existingDetails.map(d => d.id));
  console.log(`📋 Existing details: ${existingDetails.length} coins`);

  // Load existing OHLCV
  let ohlcvData = {};
  if (withOhlcv) {
    try {
      if (fs.existsSync(OHLCV_PATH)) ohlcvData = JSON.parse(fs.readFileSync(OHLCV_PATH, 'utf8'));
      console.log(`📈 Existing OHLCV: ${Object.keys(ohlcvData).length} coins`);
    } catch { }
  }

  // Find coins that need fetching
  const toFetch = force ? allCoins : allCoins.filter(id => !existingIds.has(id));
  console.log(`🎯 Need to fetch: ${toFetch.length} coins (${allCoins.length - toFetch.length} already done)\n`);

  if (toFetch.length === 0) {
    console.log('✅ All coins already have details! Nothing to do.');
    return;
  }

  const allDetails = [...existingDetails];
  let fetched = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < toFetch.length; i++) {
    const coinId = toFetch[i];
    const rank = allCoins.indexOf(coinId) + 1;
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const eta = fetched > 0 ? (((Date.now() - startTime) / fetched * (toFetch.length - i)) / 1000 / 60).toFixed(0) : '?';

    console.log(`  [${i + 1}/${toFetch.length}] #${rank} ${coinId} (${elapsed}m elapsed, ~${eta}m remaining)...`);

    try {
      const url = `${CG_BASE_URL}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`;
      const detail = await fetchJSON(url);
      
      // Remove existing entry if force re-crawling
      const existIdx = allDetails.findIndex(d => d.id === coinId);
      if (existIdx >= 0) allDetails.splice(existIdx, 1);
      
      allDetails.push(mapDetail(detail));
      fetched++;
      console.log(`    ✅ OK (${detail.categories?.length || 0} cats, ${Object.keys(detail.platforms || {}).length} chains)`);

      // Fetch OHLCV if enabled and not already have it
      if (withOhlcv && (!ohlcvData[coinId] || ohlcvData[coinId].length === 0 || force)) {
        await sleep(CG_DELAY);
        try {
          const ohlc = await fetchJSON(`${CG_BASE_URL}/coins/${coinId}/ohlc?vs_currency=usd&days=90`);
          if (Array.isArray(ohlc) && ohlc.length > 0) {
            // Group by day
            const dayMap = new Map();
            for (const p of ohlc) {
              const date = new Date(p[0]).toISOString().split('T')[0];
              const ex = dayMap.get(date);
              if (!ex) {
                dayMap.set(date, { time: new Date(date).toISOString(), open: p[1], high: p[2], low: p[3], close: p[4], volume: 0 });
              } else {
                ex.high = Math.max(ex.high, p[2]);
                ex.low = Math.min(ex.low, p[3]);
                ex.close = p[4];
              }
            }
            ohlcvData[coinId] = Array.from(dayMap.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
            console.log(`    📈 OHLCV: ${ohlcvData[coinId].length} days`);
          }
        } catch (e) {
          console.log(`    ⚠️ OHLCV failed: ${e.message}`);
        }
      }
    } catch (e) {
      failed++;
      console.log(`    ❌ Failed: ${e.message}`);
    }

    // Save progress every 10 successful fetches
    if (fetched % 10 === 0 && fetched > 0) {
      fs.writeFileSync(DETAILS_PATH, JSON.stringify(allDetails, null, 2));
      if (withOhlcv) fs.writeFileSync(OHLCV_PATH, JSON.stringify(ohlcvData, null, 2));
      console.log(`    💾 Progress saved: ${allDetails.length} details, ${Object.keys(ohlcvData).length} OHLCV`);
    }

    // Delay between requests
    if (i < toFetch.length - 1) {
      await sleep(CG_DELAY);
    }
  }

  // Final save
  fs.writeFileSync(DETAILS_PATH, JSON.stringify(allDetails, null, 2));
  if (withOhlcv) fs.writeFileSync(OHLCV_PATH, JSON.stringify(ohlcvData, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n════════════════════════════════════════');
  console.log(`✅ Crawl complete in ${totalTime} minutes`);
  console.log(`   📋 Total details: ${allDetails.length} coins`);
  console.log(`   ✅ Fetched: ${fetched}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏭️  Skipped (already had): ${allCoins.length - toFetch.length}`);
  console.log('════════════════════════════════════════');
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
