/**
 * Legacy entrypoint (cleaned): delegates to canonical crawlers only.
 * Run: node scripts/crawl-coingecko.js
 *
 * Canonical data flow:
 *  1) scripts/crawl-500-markets.js   -> coingecko-markets.json
 *  2) scripts/crawl-all-details.js   -> coingecko-details.json
 *
 * This file intentionally contains NO direct CoinGecko fetching logic,
 * so we avoid duplicated data-source implementations.
 */
const path = require('path');
const { spawnSync } = require('child_process');

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  console.log(`\n▶ Running ${scriptName} ...`);
  const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${scriptName} failed with exit code ${result.status}`);
  }
}

function main() {
  console.log('🚦 Unified CoinGecko pipeline (legacy wrapper)');
  runScript('crawl-500-markets.js');
  runScript('crawl-all-details.js');
  console.log('\n✅ Done. Markets + details refreshed via canonical scripts.');
}

try {
  main();
} catch (e) {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
}
