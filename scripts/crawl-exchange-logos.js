#!/usr/bin/env node
/**
 * CoinGecko Exchange Logos Crawler
 * 
 * Fetches all exchange logos from /exchanges/list endpoint.
 * Output: public/data/exchange-logos.json (keyed by exchange name → logo URL)
 * 
 * Run: node scripts/crawl-exchange-logos.js
 * With demo key: CG_DEMO_KEY=CG-xxx node scripts/crawl-exchange-logos.js
 */

const { DATA_DIR, cgFetch, CG_DELAY, CG_DEMO_KEY, sleep } = require('./messari-config');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(DATA_DIR, 'exchange-logos.json');

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🏦 Exchange Logos Crawler               ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`  🔑 API Key: ${CG_DEMO_KEY ? 'Demo key active' : 'Free tier'}`);

  const logoMap = {};
  const perPage = 250;
  let page = 1;
  let totalFetched = 0;

  // CoinGecko /exchanges endpoint returns paginated list with images
  while (true) {
    console.log(`  📄 Fetching page ${page}...`);
    try {
      const data = await cgFetch(`/exchanges?per_page=${perPage}&page=${page}`);
      if (!Array.isArray(data) || data.length === 0) break;

      for (const ex of data) {
        if (ex.name && ex.image) {
          logoMap[ex.name] = ex.image;
          // Also store by id for fallback
          if (ex.id) logoMap[`__id__${ex.id}`] = ex.image;
        }
      }
      totalFetched += data.length;
      console.log(`    ✅ Got ${data.length} exchanges (total: ${totalFetched})`);

      if (data.length < perPage) break; // Last page
      page++;
      await sleep(CG_DELAY);
    } catch (e) {
      console.log(`    ❌ Page ${page} failed: ${e.message}`);
      break;
    }
  }

  // Save
  fs.writeFileSync(OUTPUT, JSON.stringify(logoMap, null, 2));
  console.log(`\n  ✅ Saved ${Object.keys(logoMap).length} exchange logos to ${OUTPUT}`);
  console.log(`  🏦 Total exchanges with logos: ${totalFetched}\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
