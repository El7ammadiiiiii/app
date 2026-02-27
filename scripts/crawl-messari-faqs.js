#!/usr/bin/env node
/**
 * Messari FAQ Crawler v1
 * 
 * Dedicated crawler for extracting FAQs from Messari project pages.
 * Uses Puppeteer + in-browser fetch + RSC parsing.
 * Maps CoinGecko IDs → Messari slugs for correct coin binding.
 * 
 * Usage:
 *   node crawl-messari-faqs.js --limit 1000                    # First 1000
 *   node crawl-messari-faqs.js --start 1000 --limit 1000 --output r2  # 1001-2000
 *   node crawl-messari-faqs.js --start 2000 --limit 1000 --output r3  # 2001-3000
 *   node crawl-messari-faqs.js --force                          # Re-fetch all
 * 
 * Output: public/data/messari-faqs[-{output}].json
 */

const {
  DATA_DIR, CONCURRENCY, DELAY_BETWEEN_BATCHES, SAVE_EVERY,
  toMessariSlug, loadMarkets,
  parseRSCChunks, extractFAQs,
  createSession, fetchBatch,
  parseArgs, sleep, progressBar,
} = require('./messari-config');

const fs = require('fs');
const path = require('path');

async function main() {
  const { start, limit, force, output } = parseArgs();
  const OUTPUT = path.join(DATA_DIR, output ? `messari-faqs-${output}.json` : 'messari-faqs.json');

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     ❓ Messari FAQ Crawler v1            ║');
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
  let totalFaqItems = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < markets.length; i += CONCURRENCY) {
      const batch = markets.slice(i, i + CONCURRENCY);

      const toFetch = [];
      for (const coin of batch) {
        const slug = toMessariSlug(coin);
        // Skip if we already have FAQs for this coin (unless --force)
        if (!force && existing[coin.id] && existing[coin.id].faqs !== undefined) {
          skipped++;
          processed++;
          continue;
        }
        toFetch.push({ slug, coinId: coin.id, coinName: coin.name, symbol: coin.symbol?.toUpperCase() });
      }

      if (toFetch.length === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stdout.write(`\r  ${progressBar(processed, markets.length, `${processed}/${markets.length} | ⏭ ${skipped} | ⏱ ${elapsed}s`)}`);
        continue;
      }

      // Fetch project pages
      const pagePaths = toFetch.map(c => ({
        slug: c.slug,
        path: `/project/${c.slug}`,
      }));

      try {
        const responses = await fetchBatch(page, pagePaths);

        for (let j = 0; j < responses.length; j++) {
          const resp = responses[j];
          const coin = toFetch[j];
          processed++;

          if (resp.status === 200 && resp.html) {
            const chunks = parseRSCChunks(resp.html);
            const faqs = extractFAQs(chunks);

            results[coin.coinId] = {
              slug: coin.slug,
              name: coin.coinName,
              symbol: coin.symbol,
              faqs,
              crawledAt: new Date().toISOString(),
            };

            if (faqs.length > 0) {
              succeeded++;
              totalFaqItems += faqs.length;
            } else {
              failed++; // No FAQs found (not an error, just no data)
            }
          } else {
            results[coin.coinId] = {
              slug: coin.slug,
              name: coin.coinName,
              symbol: coin.symbol,
              faqs: [],
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
            name: coin.coinName,
            symbol: coin.symbol,
            faqs: [],
            crawledAt: new Date().toISOString(),
            error: err.message,
          };
          failed++;
          processed++;
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = processed > 0 ? (processed / ((Date.now() - startTime) / 1000)).toFixed(1) : '0';
      process.stdout.write(`\r  ${progressBar(processed, markets.length, `${processed}/${markets.length} | ✅ ${succeeded} | ❌ ${failed} | ⏭ ${skipped} | ❓ ${totalFaqItems} | ${rate}/s | ⏱ ${elapsed}s`)}`);

      if (processed % SAVE_EVERY === 0 || i + CONCURRENCY >= markets.length) {
        fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
      }

      if (i + CONCURRENCY < markets.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const withFaqs = Object.values(results).filter(r => r.faqs?.length > 0).length;

    console.log('\n\n  ════════════════════════════════════');
    console.log('  ❓ FAQ Crawler Complete!');
    console.log(`  ⏱  Total time: ${totalTime}s`);
    console.log(`  ✅ With FAQs: ${withFaqs}`);
    console.log(`  ❌ No FAQs: ${Object.keys(results).length - withFaqs}`);
    console.log(`  ⏭  Skipped: ${skipped}`);
    console.log(`  ❓ Total FAQ items: ${totalFaqItems}`);
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
