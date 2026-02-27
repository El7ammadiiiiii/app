#!/usr/bin/env node
/**
 * CoinGecko OHLCV Crawler
 * 
 * Fetches 90-day OHLC data from CoinGecko for each coin.
 * Groups 4-hourly candles into daily OHLCV.
 * Output: public/data/coingecko-ohlcv.json (object keyed by coin ID)
 * 
 * Run: node scripts/crawl-ohlcv.js [--start N] [--limit N] [--force]
 * With demo key: CG_DEMO_KEY=CG-xxx node scripts/crawl-ohlcv.js
 */

const { DATA_DIR, MARKETS_FILE, cgFetch, CG_DELAY, CG_DEMO_KEY, sleep, parseArgs, progressBar } = require('./messari-config');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(DATA_DIR, 'coingecko-ohlcv.json');
const SAVE_EVERY = 10;

function groupByDay(rawOhlc) {
  // CoinGecko OHLC format: [[timestamp, open, high, low, close], ...]
  // Group by day and aggregate into daily candles
  const dayMap = new Map();
  for (const p of rawOhlc) {
    const date = new Date(p[0]).toISOString().split('T')[0];
    const existing = dayMap.get(date);
    if (!existing) {
      dayMap.set(date, {
        time: new Date(date).toISOString(),
        open: p[1], high: p[2], low: p[3], close: p[4], volume: 0,
      });
    } else {
      existing.high = Math.max(existing.high, p[2]);
      existing.low = Math.min(existing.low, p[3]);
      existing.close = p[4]; // last close of the day
    }
  }
  return Array.from(dayMap.values()).sort((a, b) =>
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

async function main() {
  const { start, limit, force } = parseArgs();

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  📈 CoinGecko OHLCV Crawler (90 days)   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`  🔑 API Key: ${CG_DEMO_KEY ? 'Demo key active (' + CG_DELAY + 'ms delay)' : 'Free tier (12s delay)'}`);

  // Load markets list
  const markets = JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf8'));
  const coins = markets.slice(start, start + limit);
  console.log(`  📊 Processing ${coins.length} coins (start=${start}, limit=${limit})\n`);

  // Load existing data
  let existing = {};
  if (!force && fs.existsSync(OUTPUT)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
      console.log(`  📂 Loaded ${Object.keys(existing).length} existing OHLCV entries\n`);
    } catch { existing = {}; }
  }

  const results = { ...existing };
  let processed = 0, succeeded = 0, failed = 0, skipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];

    // Skip if already have OHLCV data (unless --force)
    if (!force && existing[coin.id] && existing[coin.id].length > 0) {
      skipped++;
      processed++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(`\r  ${progressBar(processed, coins.length, `${processed}/${coins.length} | ✅ ${succeeded} | ❌ ${failed} | ⏭ ${skipped} | ⏱ ${elapsed}s`)}`);
      continue;
    }

    try {
      const data = await cgFetch(`/coins/${coin.id}/ohlc?vs_currency=usd&days=90`);
      if (Array.isArray(data) && data.length > 0) {
        results[coin.id] = groupByDay(data);
        succeeded++;
      } else {
        results[coin.id] = [];
        failed++;
      }
    } catch (e) {
      results[coin.id] = [];
      failed++;
    }

    processed++;

    // Progress
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const eta = processed > skipped
      ? (((Date.now() - startTime) / (processed - skipped) * (coins.length - processed)) / 1000 / 60).toFixed(0)
      : '?';
    process.stdout.write(`\r  ${progressBar(processed, coins.length, `${processed}/${coins.length} | ✅ ${succeeded} | ❌ ${failed} | ⏭ ${skipped} | ~${eta}m left`)}`);

    // Save periodically
    if (processed % SAVE_EVERY === 0) {
      fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
    }

    // Rate limit delay
    if (i < coins.length - 1) {
      await sleep(CG_DELAY);
    }
  }

  // Final save
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const withData = Object.values(results).filter(v => v && v.length > 0).length;

  console.log('\n\n  ════════════════════════════════════');
  console.log(`  📈 OHLCV Crawler Complete!`);
  console.log(`  ⏱  Total time: ${totalTime} min`);
  console.log(`  ✅ Succeeded: ${succeeded}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭  Skipped: ${skipped}`);
  console.log(`  📈 Total with data: ${withData}`);
  console.log(`  💾 Saved to: ${OUTPUT}`);
  console.log('  ════════════════════════════════════\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
