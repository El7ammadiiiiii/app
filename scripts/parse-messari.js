/**
 * Parse Messari.io crawled data and save structured JSON for the app.
 * Run: node scripts/parse-messari.js
 */
const fs = require('fs');
const path = require('path');

const CRAWL_DIR = path.join(__dirname, '../../messari.io/messari.io');
const OUT_DIR = path.join(__dirname, '../public/data');

// Ensure output dir
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function readJsonFromHtml(filePath) {
  try {
    let raw = fs.readFileSync(filePath, 'utf8');
    // Remove control characters that break JSON parsing (tabs, newlines, etc inside strings)
    // Replace all control chars (0x00-0x1F) except valid JSON whitespace outside strings
    // Strategy: replace all control chars with spaces, JSON.parse handles \n \t in structure
    raw = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' '); // keep \t(09), \n(0A), \r(0D)
    // Now handle unescaped newlines/tabs inside JSON strings by doing a lenient parse
    // Replace literal newlines and tabs inside strings
    raw = raw.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to parse: ${filePath}`, e.message);
    return null;
  }
}

// 1. Parse Project Coverage (10 rich profiles)
function parseProjectCoverage() {
  const file = path.join(CRAWL_DIR, 'api.messari.io/screener/v2/project_coverage/results.html');
  const data = readJsonFromHtml(file);
  if (!data || !data.rows) return [];

  return data.rows.map(row => {
    const e = row.ENTITY || {};
    const pa = row.primaryAsset || {};
    return {
      id: e.slug || e.id,
      entityId: e.id,
      name: e.name,
      slug: e.slug,
      type: e.type,
      overview: e.overview || '',
      background: e.background || '',
      category: e.category || '',
      sector: e.sector || '',
      sectors_v2: e.sectors_v2 || [],
      sub_sectors_v2: e.sub_sectors_v2 || [],
      logo_id: e.logo_id || '',
      faqs: (e.faqs || []).map(f => ({ question: f.question, answer: f.answer })),
      links: (e.links || []).map(l => ({ name: l.name, url: l.link, type: l.type })),
      pageViews: row.pageViews || 0,
      // Primary asset info
      asset: {
        id: pa.id || '',
        name: pa.name || '',
        slug: pa.slug || '',
        symbol: pa.symbol || '',
        sector: pa.sector || '',
        sectors_v2: pa.sectors_v2 || [],
        sub_sectors_v2: pa.sub_sectors_v2 || [],
        contract_addresses: (pa.contract_addresses || []).map(c => ({
          address: c.contract_address,
          network: c.network_name,
          networkSlug: c.network_slug,
        })),
      },
    };
  });
}

// 2. Parse Asset Screener (price data for 7 assets)
function parseAssetScreener() {
  const dir = path.join(CRAWL_DIR, 'api.messari.io/screener/v2/asset');
  const assets = {};
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f.startsWith('results'));
  for (const file of files) {
    const data = readJsonFromHtml(path.join(dir, file));
    if (!data || !data.rows) continue;
    for (const row of data.rows) {
      const e = row.ENTITY || {};
      const slug = e.slug || e.primary_project_slug;
      if (!slug) continue;
      if (!assets[slug]) assets[slug] = {};
      assets[slug] = {
        ...assets[slug],
        id: e.id,
        name: e.name,
        slug: e.slug,
        symbol: e.symbol,
        serialId: e.serial_id,
        projectSlug: e.primary_project_slug,
        projectId: e.primary_project_id,
      };
      if (row.price !== undefined) assets[slug].price = row.price;
      if (row.latestPrice !== undefined) assets[slug].latestPrice = row.latestPrice;
      if (row.priceChange !== undefined) assets[slug].priceChange = row.priceChange;
      if (row.rank !== undefined) assets[slug].rank = row.rank;
    }
  }
  return assets;
}

// 3. Parse Market Pairs
function parseMarketPairs() {
  const file = path.join(CRAWL_DIR, 'api.messari.io/screener/v2/bqen/results.html');
  const data = readJsonFromHtml(file);
  if (!data || !data.rows) return [];

  return data.rows.map(row => ({
    id: row.ENTITY?.id,
    baseAsset: row.baseAsset?.symbol || row.ENTITY?.base_asset_name,
    quoteAsset: row.quoteAsset?.symbol || row.ENTITY?.quote_asset_name,
    exchange: row.exchange?.name || row.ENTITY?.exchange_name,
    exchangeLogo: row.exchange?.logo_url || '',
    liveness: row.liveness,
    price: row.price,
    volume: row.volume,
    shareOfVolume: row.shareOfVolume,
  }));
}

// 4. Parse Timeseries OHLCV
function parseTimeseries() {
  const dir = path.join(CRAWL_DIR, 'api.messari.io/timeseries/v1/asset-price');
  const result = {};

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  for (const file of files) {
    const raw = readJsonFromHtml(path.join(dir, file));
    const data = raw?.data || raw;
    if (!data || !data.series) continue;
    for (const s of data.series) {
      const slug = s.entity?.primary_project_slug || s.entity?.slug;
      if (!slug) continue;
      const existing = result[slug] || [];
      const points = (s.points || []).map(p => ({
        time: p[0], open: p[1], close: p[2], high: p[3], low: p[4], volume: p[5],
      }));
      result[slug] = [...existing, ...points];
    }
  }
  
  // Deduplicate by timestamp and sort
  for (const slug of Object.keys(result)) {
    const seen = new Set();
    result[slug] = result[slug]
      .filter(p => { if (seen.has(p.time)) return false; seen.add(p.time); return true; })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }
  return result;
}

// 5. Parse Calendar/Events (token unlocks, developments)
function parseCalendar() {
  const file = path.join(CRAWL_DIR, 'api.messari.io/timeseries/v1/project-calendar/1h.html');
  const raw = readJsonFromHtml(file);
  const data = raw?.data || raw;
  if (!data || !data.series) return {};

  const result = {};
  for (const s of data.series) {
    const slug = s.entity?.slug;
    if (!slug) continue;
    result[slug] = (s.points || []).map(p => ({
      timestamp: p[0],
      eventDate: p[1],
      eventType: p[2],
      status: p[3],
      priority: p[4],
      data: p[5],
      impact: p[6],
      importance: p[7],
      urgency: p[8],
    }));
  }
  return result;
}

// Run everything
console.log('Parsing messari.io crawl data...');

const projects = parseProjectCoverage();
console.log(`  Projects: ${projects.length}`);

const assets = parseAssetScreener();
console.log(`  Assets: ${Object.keys(assets).length}`);

const markets = parseMarketPairs();
console.log(`  Market pairs: ${markets.length}`);

const timeseries = parseTimeseries();
console.log(`  Timeseries: ${Object.keys(timeseries).length} assets`);

const calendar = parseCalendar();
console.log(`  Calendar events: ${Object.keys(calendar).length} projects`);

// Merge into unified project data
const mergedProjects = projects.map(proj => {
  const assetSlug = proj.asset?.slug || proj.slug;
  const assetData = assets[assetSlug] || assets[proj.slug] || {};
  const ohlcv = timeseries[proj.slug] || [];
  const events = calendar[proj.slug] || [];
  
  const tokenUnlocks = events.filter(e => e.eventType === 'token_unlock');
  const developments = events.filter(e => e.eventType === 'event');

  return {
    ...proj,
    price: assetData.latestPrice || assetData.price || 0,
    priceChange: assetData.priceChange || 0,
    rank: assetData.rank || 0,
    assetId: assetData.id || '',
    ohlcv: ohlcv.slice(-168), // Last 168 hours (7 days)
    tokenUnlocks,
    developments,
    markets: markets.filter(m => 
      m.baseAsset === proj.asset?.symbol || 
      m.baseAsset === proj.name
    ),
  };
});

// Save output
fs.writeFileSync(
  path.join(OUT_DIR, 'messari-projects.json'),
  JSON.stringify(mergedProjects, null, 2)
);

// Also save a lightweight list for the main table
const tableData = mergedProjects.map(p => ({
  id: p.slug,
  name: p.name,
  symbol: p.asset?.symbol || '',
  logo_id: p.logo_id,
  category: p.category,
  sector: p.sector,
  sectors_v2: p.sectors_v2,
  sub_sectors_v2: p.sub_sectors_v2,
  price: p.price,
  priceChange: p.priceChange,
  rank: p.rank,
  pageViews: p.pageViews,
}));

fs.writeFileSync(
  path.join(OUT_DIR, 'crypto-table.json'),
  JSON.stringify(tableData, null, 2)
);

console.log('\nDone! Files saved to public/data/');
console.log('  messari-projects.json (full data)');
console.log('  crypto-table.json (table list)');
