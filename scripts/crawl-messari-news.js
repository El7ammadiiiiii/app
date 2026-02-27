#!/usr/bin/env node
/**
 * Messari News Crawler v3
 * 
 * Specialized crawler for news articles.
 * Uses in-browser fetch + RSC parsing for maximum speed.
 * Output: public/data/messari-news.json
 */

const {
  DATA_DIR, CONCURRENCY, DELAY_BETWEEN_BATCHES, SAVE_EVERY,
  toMessariSlug, loadMarkets,
  parseRSCChunks, extractNews,
  createSession, fetchBatch,
  parseArgs, sleep, progressBar,
} = require('./messari-config');

const fs = require('fs');
const path = require('path');

async function main() {
  const { start, limit, force, output } = parseArgs();
  const OUTPUT = path.join(DATA_DIR, output ? `messari-news-${output}.json` : 'messari-news.json');
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     📰 Messari News Crawler v3          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Load markets
  const markets = loadMarkets(start + limit).slice(start);
  console.log(`  📊 Processing ${markets.length} coins (start=${start})\n`);

  // Load existing data
  let existing = {};
  if (!force && fs.existsSync(OUTPUT)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
      console.log(`  📂 Loaded ${Object.keys(existing).length} existing entries\n`);
    } catch { existing = {}; }
  }

  // Create browser session
  const { browser, page } = await createSession();

  const results = { ...existing };
  let processed = 0, succeeded = 0, failed = 0, skipped = 0;
  const startTime = Date.now();

  try {
    // Process in batches of CONCURRENCY
    for (let i = 0; i < markets.length; i += CONCURRENCY) {
      const batch = markets.slice(i, i + CONCURRENCY);
      
      // Skip coins that already have news data (unless --force)
      const toFetch = [];
      for (const coin of batch) {
        const slug = toMessariSlug(coin);
        if (!force && existing[coin.id] && existing[coin.id].news && existing[coin.id].news.length > 0) {
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

      // Build fetch paths
      const fetchPaths = toFetch.map(c => ({
        slug: c.slug,
        path: `/project/${c.slug}/news`,
      }));

      try {
        const responses = await fetchBatch(page, fetchPaths);
        
        for (let j = 0; j < responses.length; j++) {
          const resp = responses[j];
          const coin = toFetch[j];
          processed++;

          if (resp.status === 200 && resp.html) {
            const chunks = parseRSCChunks(resp.html);
            const news = extractNews(chunks);
            
            results[coin.coinId] = {
              slug: coin.slug,
              symbol: coin.symbol,
              news,
              crawledAt: new Date().toISOString(),
            };
            
            if (news.length > 0) succeeded++;
            else failed++;
          } else {
            // Try alternative slug (just the coin id)
            if (resp.status === 404 || resp.status === 0) {
              results[coin.coinId] = {
                slug: coin.slug,
                symbol: coin.symbol,
                news: [],
                crawledAt: new Date().toISOString(),
                error: `HTTP ${resp.status}`,
              };
            }
            failed++;
          }
        }
      } catch (err) {
        console.error(`\n  ❌ Batch error: ${err.message}`);
        for (const coin of toFetch) {
          results[coin.coinId] = {
            slug: coin.slug,
            symbol: coin.symbol,
            news: [],
            crawledAt: new Date().toISOString(),
            error: err.message,
          };
          failed++;
          processed++;
        }
      }

      // Progress
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = processed > 0 ? (processed / ((Date.now() - startTime) / 1000)).toFixed(1) : '0';
      process.stdout.write(`\r  ${progressBar(processed, markets.length, `${processed}/${markets.length} | ✅ ${succeeded} | ❌ ${failed} | ⏭ ${skipped} | ${rate}/s | ⏱ ${elapsed}s`)}`);

      // Save periodically
      if (processed % SAVE_EVERY === 0 || i + CONCURRENCY >= markets.length) {
        fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
      }

      // Delay between batches
      if (i + CONCURRENCY < markets.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Final save
    fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalNews = Object.values(results).reduce((sum, r) => sum + (r.news?.length || 0), 0);
    
    console.log('\n\n  ════════════════════════════════════');
    console.log(`  📰 News Crawler Complete!`);
    console.log(`  ⏱  Total time: ${totalTime}s`);
    console.log(`  ✅ Succeeded: ${succeeded}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏭  Skipped: ${skipped}`);
    console.log(`  📰 Total news articles: ${totalNews}`);
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
