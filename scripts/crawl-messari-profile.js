#!/usr/bin/env node
/**
 * Messari Profile + OHLCV Crawler v3
 * 
 * Specialized crawler for project profiles, FAQs, contracts, and OHLCV data.
 * Uses in-browser fetch + RSC parsing for maximum speed.
 * Output: public/data/messari-profile.json
 */

const {
  DATA_DIR, CONCURRENCY, DELAY_BETWEEN_BATCHES, SAVE_EVERY,
  toMessariSlug, loadMarkets,
  parseRSCChunks, extractProfile, extractOHLCV, extractJSONArray, extractJSONObject,
  createSession, fetchBatch, fetchPage,
  parseArgs, sleep, progressBar,
} = require('./messari-config');

const fs = require('fs');
const path = require('path');

// Extract contract addresses from RSC chunks
function extractContracts(chunks) {
  const allText = chunks.join('\n');
  const contracts = extractJSONArray(allText, 'contract_addresses') 
    || extractJSONArray(allText, 'contractAddresses')
    || extractJSONArray(allText, 'contracts');
  
  if (contracts.length > 0) {
    return contracts
      .filter(c => c && (c.address || c.contract_address))
      .map(c => ({
        address: c.address || c.contract_address || '',
        network: c.network || c.platform || c.chain || '',
        decimals: c.decimals || null,
      }));
  }
  return [];
}

// Extract sidebar/overview data from the main project page
function extractSidebarData(chunks) {
  const allText = chunks.join('\n');
  const result = {};
  
  // Extract rank
  const rankMatch = allText.match(/"rank":\s*(\d+)/);
  if (rankMatch) result.rank = parseInt(rankMatch[1]);
  
  // Extract market cap
  const mcapMatch = allText.match(/"marketCap":\s*([\d.]+)/i) || allText.match(/"market_cap":\s*([\d.]+)/i);
  if (mcapMatch) result.marketCap = parseFloat(mcapMatch[1]);
  
  // Extract category/sector
  const sectorMatch = allText.match(/"sector":\s*"([^"]+)"/);
  if (sectorMatch) result.sector = sectorMatch[1];
  
  const subSectorMatch = allText.match(/"subSector":\s*"([^"]+)"/) || allText.match(/"sub_sector":\s*"([^"]+)"/);
  if (subSectorMatch) result.subSector = subSectorMatch[1];
  
  // Extract resources/links
  const links = extractJSONArray(allText, 'links') || extractJSONArray(allText, 'resources');
  if (links.length > 0) {
    result.links = links.filter(l => l && (l.url || l.link)).map(l => ({
      name: l.name || l.label || '', url: l.url || l.link || '', type: l.type || 'Other',
    }));
  }
  
  // Extract governance info
  const governance = extractJSONObject(allText, 'governance');
  if (governance) result.governance = governance;
  
  return result;
}

async function main() {
  const { start, limit, force, output } = parseArgs();
  const OUTPUT = path.join(DATA_DIR, output ? `messari-profile-${output}.json` : 'messari-profile.json');
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     📋 Messari Profile Crawler v3       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const markets = loadMarkets(start + limit).slice(start);
  console.log(`  📊 Processing ${markets.length} coins (start=${start})\n`);

  let existing = {};
  if (!force && fs.existsSync(OUTPUT)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
      console.log(`  📂 Loaded ${Object.keys(existing).length} existing entries\n`);
    } catch { existing = {}; }
  }

  const { browser, page } = await createSession();

  const results = { ...existing };
  let processed = 0, succeeded = 0, failed = 0, skipped = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < markets.length; i += CONCURRENCY) {
      const batch = markets.slice(i, i + CONCURRENCY);
      
      const toFetch = [];
      for (const coin of batch) {
        const slug = toMessariSlug(coin);
        if (!force && existing[coin.id] && existing[coin.id].profile && existing[coin.id].profile.name) {
          skipped++;
          processed++;
          continue;
        }
        toFetch.push({ slug, coinId: coin.id, symbol: coin.symbol?.toUpperCase() });
      }

      if (toFetch.length === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stdout.write(`\r  ${progressBar(processed, markets.length, `${processed}/${markets.length} | ⏭ ${skipped} skipped | ⏱ ${elapsed}s`)}`);
        continue;
      }

      // Fetch main project pages for profile data
      const profilePaths = toFetch.map(c => ({
        slug: c.slug,
        path: `/project/${c.slug}`,
      }));

      try {
        // Fetch profiles
        const profileResponses = await fetchBatch(page, profilePaths);
        
        for (let j = 0; j < profileResponses.length; j++) {
          const resp = profileResponses[j];
          const coin = toFetch[j];
          processed++;

          if (resp.status === 200 && resp.html) {
            const chunks = parseRSCChunks(resp.html);
            const profile = extractProfile(chunks);
            const contracts = extractContracts(chunks);
            const sidebar = extractSidebarData(chunks);
            const ohlcv = extractOHLCV(chunks);
            
            results[coin.coinId] = {
              slug: coin.slug,
              symbol: coin.symbol,
              profile: profile || { name: coin.symbol, slug: coin.slug },
              contracts,
              sidebar,
              ohlcv,
              crawledAt: new Date().toISOString(),
            };
            
            if (profile && profile.name) succeeded++;
            else failed++;
          } else {
            results[coin.coinId] = {
              slug: coin.slug,
              symbol: coin.symbol,
              profile: null,
              contracts: [],
              sidebar: {},
              ohlcv: [],
              crawledAt: new Date().toISOString(),
              error: `HTTP ${resp.status}`,
            };
            failed++;
          }
        }
      } catch (err) {
        console.error(`\n  ❌ Batch error: ${err.message}`);
        for (const coin of toFetch) {
          results[coin.coinId] = {
            slug: coin.slug,
            symbol: coin.symbol,
            profile: null,
            contracts: [],
            sidebar: {},
            ohlcv: [],
            crawledAt: new Date().toISOString(),
            error: err.message,
          };
          failed++;
          processed++;
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = processed > 0 ? (processed / ((Date.now() - startTime) / 1000)).toFixed(1) : '0';
      process.stdout.write(`\r  ${progressBar(processed, markets.length, `${processed}/${markets.length} | ✅ ${succeeded} | ❌ ${failed} | ⏭ ${skipped} | ${rate}/s | ⏱ ${elapsed}s`)}`);

      if (processed % SAVE_EVERY === 0 || i + CONCURRENCY >= markets.length) {
        fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
      }

      if (i + CONCURRENCY < markets.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const withProfile = Object.values(results).filter(r => r.profile?.name).length;
    const withContracts = Object.values(results).filter(r => r.contracts?.length > 0).length;
    const withOHLCV = Object.values(results).filter(r => r.ohlcv?.length > 0).length;
    
    console.log('\n\n  ════════════════════════════════════');
    console.log(`  📋 Profile Crawler Complete!`);
    console.log(`  ⏱  Total time: ${totalTime}s`);
    console.log(`  ✅ Succeeded: ${succeeded}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏭  Skipped: ${skipped}`);
    console.log(`  📋 With profile: ${withProfile}`);
    console.log(`  📜 With contracts: ${withContracts}`);
    console.log(`  📈 With OHLCV: ${withOHLCV}`);
    console.log(`  💾 Saved to: ${OUTPUT}`);
    console.log('  ════════════════════════════════════\n');

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('\n  💥 Fatal error:', err.message);
  process.exit(1);
});
