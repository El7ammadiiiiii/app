/**
 * Clean up the About content to remove price-specific FAQ sections
 * These sections have live price data that will get stale
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'public', 'data', 'coingecko-about.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Sections to remove (they contain specific price/market data that goes stale)
const REMOVE_HEADINGS = [
  'what is the daily trading volume',
  'what is the highest and lowest price',
  'what is the market cap',
  'what is the fully diluted valuation',
  'how does the price performance',
  'where can you buy',
];

let changes = 0;

for (const [coinId, coinData] of Object.entries(data)) {
  let html = coinData.html;
  
  for (const heading of REMOVE_HEADINGS) {
    // Match h3 with this heading and its following content until next h3/h2
    const regex = new RegExp(
      `<h3[^>]*>[^<]*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</h3>[\\s\\S]*?(?=<h[23]|$)`,
      'gi'
    );
    const before = html.length;
    html = html.replace(regex, '');
    if (html.length !== before) changes++;
  }
  
  // Also remove any remaining CoinGecko references in text
  html = html
    .replace(/CoinGecko/gi, '')
    .replace(/Messari/gi, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\s{3,}/g, ' ')
    .trim();
  
  coinData.html = html;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ Cleaned ${changes} stale FAQ sections`);
for (const [id, d] of Object.entries(data)) {
  console.log(`  ${id}: ${d.html.length} chars`);
}
