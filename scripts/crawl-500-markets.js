/**
 * Fetch CoinGecko market data for top 5000 coins
 * Run: node scripts/crawl-500-markets.js
 * 
 * CoinGecko free API: fetches 50 pages x 100 coins each.
 * Note: coin details are fetched separately via scripts/crawl-all-details.js
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://api.coingecko.com/api/v3';
const OUT_DIR = path.join(__dirname, '../public/data');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 429) {
        const wait = 60 + attempt * 30;
        console.log(`  ⏳ Rate limited, waiting ${wait}s (attempt ${attempt})...`);
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
      await sleep(10000 * attempt);
    }
  }
}

function mapCoin(c, i) {
  return {
    id: c.id,
    name: c.name,
    symbol: c.symbol?.toUpperCase(),
    image: c.image,
    rank: c.market_cap_rank || i + 1,
    price: c.current_price || 0,
    high_24h: c.high_24h || 0,
    low_24h: c.low_24h || 0,
    market_cap: c.market_cap || 0,
    fdv: c.fully_diluted_valuation || 0,
    total_volume: c.total_volume || 0,
    volume_7d: c.total_volume ? c.total_volume * 7 : 0,
    volume_30d: c.total_volume ? c.total_volume * 30 : 0,
    volume_mcap_ratio: c.market_cap ? (c.total_volume / c.market_cap) * 100 : 0,
    circulating_supply: c.circulating_supply || 0,
    total_supply: c.total_supply || 0,
    max_supply: c.max_supply || null,
    price_change_1h: c.price_change_percentage_1h_in_currency || 0,
    price_change_24h: c.price_change_percentage_24h || 0,
    price_change_7d: c.price_change_percentage_7d_in_currency || 0,
    price_change_14d: c.price_change_percentage_14d_in_currency || 0,
    price_change_30d: c.price_change_percentage_30d_in_currency || 0,
    price_change_60d: c.price_change_percentage_60d_in_currency || 0,
    price_change_90d: c.price_change_percentage_90d_in_currency || 0,
    price_change_ytd: c.price_change_percentage_ytd_in_currency || 0,
    price_change_200d: c.price_change_percentage_200d_in_currency || 0,
    price_change_1y: c.price_change_percentage_1y_in_currency || 0,
    ath: c.ath || 0,
    ath_change_percentage: c.ath_change_percentage || 0,
    ath_date: c.ath_date || '',
    atl: c.atl || 0,
    atl_change_percentage: c.atl_change_percentage || 0,
    atl_date: c.atl_date || '',
    sparkline_7d: c.sparkline_in_7d?.price || [],
    last_updated: c.last_updated,
  };
}

async function main() {
  const PAGES = 50;
  const MARKET_PATH = path.join(OUT_DIR, 'coingecko-markets.json');

  // Load existing data to enable resume
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(MARKET_PATH, 'utf8')); } catch(e) {}
  const startPage = Math.floor(existing.length / 100) + 1;

  if (startPage > 1) {
    console.log(`📊 Resuming from page ${startPage} (${existing.length} coins already saved)\n`);
  } else {
    console.log('📊 Fetching top 5000 coins by market cap...\n');
  }

  const allCoins = [...existing];

  for (let page = startPage; page <= PAGES; page++) {
    console.log(`  Page ${page}/${PAGES}...`);
    const url = `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d,14d,30d,60d,90d,200d,1y,ytd`;
    try {
      const data = await fetchJSON(url);
      const mapped = data.map((c, i) => mapCoin(c, (page - 1) * 100 + i));
      allCoins.push(...mapped);
      console.log(`    ✅ Got ${data.length} coins (total: ${allCoins.length})`);

      // Save after each page for crash resilience
      fs.writeFileSync(MARKET_PATH, JSON.stringify(allCoins, null, 2));
      console.log(`    💾 Saved (${allCoins.length} coins)`);
    } catch (e) {
      console.log(`    ❌ Page ${page} failed: ${e.message}`);
    }
    if (page < PAGES) await sleep(12000);
  }

  console.log('\n✅ Expansion complete!');
  console.log(`   📊 Markets: ${allCoins.length} coins`);
  console.log('   ℹ Details are maintained by scripts/crawl-all-details.js');
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
