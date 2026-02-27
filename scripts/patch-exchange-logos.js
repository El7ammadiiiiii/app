#!/usr/bin/env node
/**
 * Exchange Logo Patcher
 * 
 * Patches empty exchange_logo fields in coingecko-details.json
 * using the exchange-logos.json map. No API calls needed.
 * 
 * Run: node scripts/patch-exchange-logos.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');
const DETAILS_PATH = path.join(DATA_DIR, 'coingecko-details.json');
const LOGOS_PATH = path.join(DATA_DIR, 'exchange-logos.json');

// Hardcoded fallback for common exchanges (same as CryptoDetail.tsx)
const EXCHANGE_LOGOS_FALLBACK = {
  'Binance': 'https://assets.coingecko.com/markets/images/52/small/binance.jpg',
  'Coinbase Exchange': 'https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png',
  'OKX': 'https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png',
  'Bybit': 'https://assets.coingecko.com/markets/images/698/small/bybit_spot.png',
  'Gate.io': 'https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg',
  'Gate': 'https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg',
  'KuCoin': 'https://assets.coingecko.com/markets/images/61/small/kucoin.png',
  'Kraken': 'https://assets.coingecko.com/markets/images/29/small/kraken.jpg',
  'Bitget': 'https://assets.coingecko.com/markets/images/540/small/Bitget.jpeg',
  'MEXC': 'https://assets.coingecko.com/markets/images/409/small/MEXC_logo_square.jpeg',
  'HTX': 'https://assets.coingecko.com/markets/images/25/small/logo_V_colour_black.png',
  'Bitfinex': 'https://assets.coingecko.com/markets/images/4/small/BItfinex.png',
  'Crypto.com Exchange': 'https://assets.coingecko.com/markets/images/589/small/Crypto.jpg',
  'BingX': 'https://assets.coingecko.com/markets/images/812/small/BingX_brand_logo.png',
  'Bitstamp': 'https://assets.coingecko.com/markets/images/9/small/bitstamp.jpg',
  'Gemini': 'https://assets.coingecko.com/markets/images/50/small/gemini.png',
  'Upbit': 'https://assets.coingecko.com/markets/images/117/small/logo-square.jpeg',
};

function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🔧 Exchange Logo Patcher               ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Load exchange logos map
  let logoMap = {};
  if (fs.existsSync(LOGOS_PATH)) {
    logoMap = JSON.parse(fs.readFileSync(LOGOS_PATH, 'utf8'));
    console.log(`  🏦 Loaded ${Object.keys(logoMap).length} exchange logos from map`);
  } else {
    console.log('  ⚠️  No exchange-logos.json found, using hardcoded fallback only');
  }

  // Merge: API logos take priority, fallback for common exchanges
  const allLogos = { ...EXCHANGE_LOGOS_FALLBACK, ...logoMap };

  // Load details
  if (!fs.existsSync(DETAILS_PATH)) {
    console.log('  ❌ coingecko-details.json not found!');
    process.exit(1);
  }

  const details = JSON.parse(fs.readFileSync(DETAILS_PATH, 'utf8'));
  console.log(`  📋 Loaded ${details.length} coin details`);

  let patched = 0, alreadyHad = 0, noMatch = 0;

  for (const coin of details) {
    if (!coin.tickers) continue;
    for (const ticker of coin.tickers) {
      if (ticker.exchange_logo && ticker.exchange_logo !== '') {
        alreadyHad++;
        continue;
      }
      const logo = allLogos[ticker.exchange] || '';
      if (logo) {
        ticker.exchange_logo = logo;
        patched++;
      } else {
        noMatch++;
      }
    }
  }

  // Save
  fs.writeFileSync(DETAILS_PATH, JSON.stringify(details, null, 2));

  console.log(`\n  ✅ Patched: ${patched} tickers with logos`);
  console.log(`  ⏭  Already had logo: ${alreadyHad}`);
  console.log(`  ❓ No logo found: ${noMatch}`);
  console.log(`  💾 Saved to ${DETAILS_PATH}\n`);
}

main();
