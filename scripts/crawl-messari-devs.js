#!/usr/bin/env node
/**
 * Messari Key Developments Crawler v3
 * 
 * Fetches key developments directly from Algolia API.
 * No browser needed — pure HTTP requests, extremely fast.
 * Output: public/data/messari-devs.json
 */

const {
  DATA_DIR, SAVE_EVERY,
  toMessariSlug, loadMarkets,
  parseArgs, sleep, progressBar, normalizeRSCDate,
} = require('./messari-config');

const fs = require('fs');
const path = require('path');

// Algolia config (public search-only key from Messari's frontend)
const ALGOLIA_APP_ID = '3B439ZGYM3';
const ALGOLIA_API_KEY = '8cfb21fec78481dac7032e199526d5df';
const ALGOLIA_INDEX = 'intel_notable_event_v2';
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

const BATCH_SIZE = 20; // Number of concurrent Algolia requests
const HITS_PER_PAGE = 150; // Max events per coin

async function fetchDevelopments(slug) {
  const body = JSON.stringify({
    query: '',
    page: 0,
    hitsPerPage: HITS_PER_PAGE,
    filters: `(assets:${slug} OR global_event:true)`,
    facetFilters: [['global_event:false']],
  });

  const resp = await fetch(ALGOLIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': ALGOLIA_API_KEY,
    },
    body,
  });

  if (!resp.ok) {
    throw new Error(`Algolia HTTP ${resp.status}`);
  }

  const json = await resp.json();
  const hits = json.hits || [];

  return hits.map(hit => {
    let eventDate = hit.event_date_timestamp || hit.event_date;
    if (typeof eventDate === 'number' && eventDate > 1000000000 && eventDate < 2000000000) {
      eventDate = new Date(eventDate * 1000).toISOString();
    } else {
      eventDate = normalizeRSCDate(eventDate);
    }

    return {
      headline: hit.title || hit.headline || hit.category || '',
      date: normalizeRSCDate(hit.created_at || hit.timestamp) || eventDate,
      eventDate,
      lastUpdated: normalizeRSCDate(hit.updated_at || hit.modified_at),
      category: hit.category || '',
      subCategory: hit.subcategory || hit.sub_category || '',
      status: hit.event_status || hit.status || '',
      urgency: hit.urgency || '',
      impact: hit.impact || '',
      importance: hit.importance || hit.urgency || '',
      priority: hit.priority || 0,
      details: hit.details || hit.description || '',
      url: hit.url || '',
      globalEvent: !!hit.global_event,
      primaryAssets: (hit.primary_assets || hit.assets_data || []).map(a => ({
        id: a.id, name: a.name, slug: a.slug, symbol: a.symbol,
      })),
      tags: hit.tags || [],
    };
  });
}

async function main() {
  const { start, limit, force, output } = parseArgs();
  const OUTPUT = path.join(DATA_DIR, output ? `messari-devs-${output}.json` : 'messari-devs.json');
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🔔 Messari Developments Crawler v3     ║');
  console.log('║     (Algolia API - No Browser Needed)   ║');
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

  const results = { ...existing };
  let processed = 0, succeeded = 0, failed = 0, skipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < markets.length; i += BATCH_SIZE) {
    const batch = markets.slice(i, i + BATCH_SIZE);
    
    const toFetch = [];
    for (const coin of batch) {
      const slug = toMessariSlug(coin);
      if (!force && existing[coin.id] && existing[coin.id].developments && existing[coin.id].developments.length > 0) {
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

    // Fetch all in parallel
    const promises = toFetch.map(async (coin) => {
      try {
        const developments = await fetchDevelopments(coin.slug);
        return { coin, developments, error: null };
      } catch (err) {
        return { coin, developments: [], error: err.message };
      }
    });

    const batchResults = await Promise.all(promises);
    
    for (const { coin, developments, error } of batchResults) {
      processed++;
      results[coin.coinId] = {
        slug: coin.slug,
        symbol: coin.symbol,
        developments,
        crawledAt: new Date().toISOString(),
        ...(error ? { error } : {}),
      };
      
      if (developments.length > 0) succeeded++;
      else failed++;
    }

    // Progress
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = processed > 0 ? (processed / ((Date.now() - startTime) / 1000)).toFixed(1) : '0';
    process.stdout.write(`\r  ${progressBar(processed, markets.length, `${processed}/${markets.length} | ✅ ${succeeded} | ❌ ${failed} | ⏭ ${skipped} | ${rate}/s | ⏱ ${elapsed}s`)}`);

    // Save periodically
    if (processed % SAVE_EVERY === 0 || i + BATCH_SIZE >= markets.length) {
      fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
    }

    // Small delay to not overwhelm Algolia
    if (i + BATCH_SIZE < markets.length) {
      await sleep(200);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalDevs = Object.values(results).reduce((sum, r) => sum + (r.developments?.length || 0), 0);
  
  console.log('\n\n  ════════════════════════════════════');
  console.log(`  🔔 Developments Crawler Complete!`);
  console.log(`  ⏱  Total time: ${totalTime}s`);
  console.log(`  ✅ Succeeded: ${succeeded}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭  Skipped: ${skipped}`);
  console.log(`  🔔 Total developments: ${totalDevs}`);
  console.log(`  💾 Saved to: ${OUTPUT}`);
  console.log('  ════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n  💥 Fatal error:', err.message);
  process.exit(1);
});
