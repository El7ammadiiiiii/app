#!/usr/bin/env node
/**
 * Messari Data Merger v3
 * 
 * Merges output from all 3 specialized crawlers into a single messari-projects.json.
 * Preserves existing data and enriches with new crawler data.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'messari-projects.json');
const MARKETS_FILE = path.join(DATA_DIR, 'coingecko-markets.json');

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`  ⚠️  Failed to parse ${path.basename(filePath)}: ${err.message}`);
    return {};
  }
}

// Glob-scan for all range files matching pattern
function loadAllMatching(prefix) {
  const files = fs.readdirSync(DATA_DIR).filter(f => {
    // Match: messari-news.json, messari-news-r2.json, messari-news-r3.json, etc.
    return f.startsWith(prefix) && f.endsWith('.json');
  });
  let merged = {};
  for (const file of files) {
    const data = loadJSON(path.join(DATA_DIR, file));
    const count = Object.keys(data).length;
    if (count > 0) {
      console.log(`    📄 ${file}: ${count} entries`);
      Object.assign(merged, data);
    }
  }
  return merged;
}

function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     🔄 Messari Data Merger v4           ║');
  console.log('║     (Multi-Range Support)               ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Load all data sources (scan for range files)
  console.log('  📰 Loading news files...');
  const newsData = loadAllMatching('messari-news');
  console.log(`  📰 Total news entries: ${Object.keys(newsData).length}\n`);

  console.log('  🔔 Loading devs files...');
  const devsData = loadAllMatching('messari-devs');
  console.log(`  🔔 Total devs entries: ${Object.keys(devsData).length}\n`);

  console.log('  📋 Loading profile files...');
  const profileData = loadAllMatching('messari-profile');
  console.log(`  📋 Total profile entries: ${Object.keys(profileData).length}\n`);

  console.log('  ❓ Loading FAQ files...');
  const faqData = loadAllMatching('messari-faqs');
  console.log(`  ❓ Total FAQ entries: ${Object.keys(faqData).length}\n`);

  const existing = loadJSON(OUTPUT_FILE);
  const markets = JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf8'));

  console.log(`  📂 Existing merged: ${Object.keys(existing).length}`);
  console.log('');

  // Build merged result
  const merged = {};
  
  // Get all unique coin IDs from all sources (filter out numeric keys from legacy format)
  const allIds = new Set([
    ...Object.keys(newsData),
    ...Object.keys(devsData),
    ...Object.keys(profileData),
    ...Object.keys(faqData),
    ...Object.keys(existing).filter(k => !/^\d+$/.test(k)),
  ]);

  for (const coinId of allIds) {
    const prev = existing[coinId] || {};
    const news = newsData[coinId] || {};
    const devs = devsData[coinId] || {};
    const prof = profileData[coinId] || {};
    const faq = faqData[coinId] || {};
    const market = markets.find(m => m.id === coinId);

    // Determine slug
    const slug = prof.slug || news.slug || devs.slug || prev.slug || coinId;
    
    // Build the unified record
    merged[coinId] = {
      // Basic info
      slug,
      symbol: prof.symbol || news.symbol || devs.symbol || prev.symbol || market?.symbol?.toUpperCase() || '',
      name: prof.profile?.name || prev.name || market?.name || '',
      
      // Profile data
      overview: prof.profile?.overview || prev.overview || '',
      background: prof.profile?.background || prev.background || '',
      sector: prof.profile?.sector || prof.sidebar?.sector || prev.sector || '',
      subSector: prof.profile?.subSector || prof.sidebar?.subSector || prev.subSector || '',
      sectors_v2: prof.profile?.sectors_v2 || prev.sectors_v2 || [],
      sub_sectors_v2: prof.profile?.sub_sectors_v2 || prev.sub_sectors_v2 || [],
      rank: prof.sidebar?.rank || prev.rank || null,
      logoUrl: prof.profile?.logoUrl || prev.logoUrl || '',
      entityId: prof.profile?.entityId || prev.entityId || '',
      
      // Links / resources
      links: prof.profile?.links || prof.sidebar?.links || prev.links || [],
      
      // FAQs (dedicated FAQ crawler > profile-embedded > existing)
      faqs: (faq.faqs?.length > 0 ? faq.faqs : null) || (prof.profile?.faqs?.length > 0 ? prof.profile.faqs : null) || prev.faqs || [],
      
      // Contracts
      contracts: prof.contracts?.length > 0 ? prof.contracts : (prev.contracts || []),
      
      // News articles
      news: news.news?.length > 0 ? news.news : (prev.news || []),
      
      // Key developments
      developments: devs.developments?.length > 0 ? devs.developments : (prev.developments || prev.keyDevelopments || []),
      
      // OHLCV data (historical)
      ohlcv: prof.ohlcv?.length > 0 ? prof.ohlcv : (prev.ohlcv || []),
      
      // Governance
      governance: prof.sidebar?.governance || prev.governance || null,
      
      // Coverage info  
      coverage: prof.profile?.coverage || prev.coverage || null,
      primaryAsset: prof.profile?.primaryAsset || prev.primaryAsset || null,
      
      // Metadata
      crawledAt: new Date().toISOString(),
      sources: {
        news: news.crawledAt || prev.sources?.news || null,
        devs: devs.crawledAt || prev.sources?.devs || null,
        profile: prof.crawledAt || prev.sources?.profile || null,
        faqs: faq.crawledAt || prev.sources?.faqs || null,
      },
    };
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));

  // Stats
  const stats = {
    total: Object.keys(merged).length,
    withNews: Object.values(merged).filter(m => m.news?.length > 0).length,
    withDevs: Object.values(merged).filter(m => m.developments?.length > 0).length,
    withProfile: Object.values(merged).filter(m => m.overview).length,
    withFAQs: Object.values(merged).filter(m => m.faqs?.length > 0).length,
    withContracts: Object.values(merged).filter(m => m.contracts?.length > 0).length,
    withOHLCV: Object.values(merged).filter(m => m.ohlcv?.length > 0).length,
    totalNews: Object.values(merged).reduce((s, m) => s + (m.news?.length || 0), 0),
    totalDevs: Object.values(merged).reduce((s, m) => s + (m.developments?.length || 0), 0),
  };

  console.log('  ════════════════════════════════════');
  console.log(`  🔄 Merge Complete!`);
  console.log(`  📊 Total projects: ${stats.total}`);
  console.log(`  📰 With news: ${stats.withNews} (${stats.totalNews} articles)`);
  console.log(`  🔔 With developments: ${stats.withDevs} (${stats.totalDevs} items)`);
  console.log(`  📋 With profile/overview: ${stats.withProfile}`);
  console.log(`  ❓ With FAQs: ${stats.withFAQs}`);
  console.log(`  📜 With contracts: ${stats.withContracts}`);
  console.log(`  📈 With OHLCV: ${stats.withOHLCV}`);
  console.log(`  💾 Output: ${OUTPUT_FILE}`);
  console.log('  ════════════════════════════════════\n');
}

main();
