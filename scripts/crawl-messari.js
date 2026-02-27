#!/usr/bin/env node
/**
 * Messari.io Comprehensive Crawler
 * 
 * Uses Puppeteer to visit messari.io/project/{slug} pages for our top 1000 coins
 * and captures rich data by intercepting API responses + scraping DOM.
 * 
 * Data captured:
 *  - Profile: overview, background, FAQs, sector, sub-sector, sector rank
 *  - News: first 50 news items per project
 *  - Key Developments: full development events
 *  - Historical Market: OHLCV data
 *  - Links/Resources: website, whitepaper, github, docs, block explorer, etc.
 *  - Contracts: all contract addresses across chains
 *  - API ID, Analytics
 * 
 * Usage: node scripts/crawl-messari.js [--start N] [--limit N]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ── Config ──
const OUT_FILE = path.join(__dirname, '../public/data/messari-projects.json');
const MARKETS_FILE = path.join(__dirname, '../public/data/coingecko-markets.json');
const DELAY_BETWEEN_COINS = 8000;      // 8s between coins
const PAGE_WAIT_TIMEOUT = 25000;        // 25s for page load
const NAV_TIMEOUT = 30000;              // 30s navigation timeout
const MAX_RETRIES = 2;
const SAVE_EVERY = 5;                   // Save after every 5 coins
const TOP_N = 1000;                     // First 1000 coins

// Parse CLI args
const args = process.argv.slice(2);
let START_INDEX = 0;
let LIMIT = TOP_N;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i+1]) START_INDEX = parseInt(args[i+1]);
  if (args[i] === '--limit' && args[i+1]) LIMIT = parseInt(args[i+1]);
}

// ── Known ID mappings (CoinGecko ID → Messari slug) ──
const ID_MAP = {
  'ripple': 'xrp-ledger',
  'binancecoin': 'bnb',
  'usd-coin': 'usdc',
  'tether': 'tether',
  'staked-ether': 'lido-staked-ether',
  'wrapped-bitcoin': 'wrapped-bitcoin',
  'leo-token': 'bitfinex-leo',
  'ethena-usde': 'ethena-usde',
  'wrapped-steth': 'wrapped-steth',
  'shiba-inu': 'shiba-inu',
  'bitcoin-cash': 'bitcoin-cash',
  'the-open-network': 'toncoin',
  'usds': 'sky-dollar',
  'stellar': 'stellar',
  'avalanche-2': 'avalanche',
  'internet-computer': 'internet-computer',
  'hedera-hashgraph': 'hedera-hashgraph',
  'polkadot': 'polkadot',
  'monero': 'monero',
  'near': 'near-protocol',
  'polygon-ecosystem-token': 'polygon',
  'matic-network': 'polygon',
  'cosmos': 'cosmos',
  'ethereum-classic': 'ethereum-classic',
  'render-token': 'render-network',
  'okb': 'okb',
  'crypto-com-chain': 'cronos',
  'vechain': 'vechain',
  'fetch-ai': 'fetch-ai',
  'fantom': 'fantom',
  'algorand': 'algorand',
  'immutable-x': 'immutable-x',
  'injective-protocol': 'injective',
  'theta-token': 'theta-network',
  'the-graph': 'the-graph',
  'flare-networks': 'flare-network',
  'lido-dao': 'lido-dao',
  'elrond-erd-2': 'multiversx',
  'flow': 'flow',
  'kucoin-shares': 'kucoin',
  'gatetoken': 'gatetoken',
  'eos': 'eos',
  'decentraland': 'decentraland',
  'the-sandbox': 'the-sandbox',
  'arweave': 'arweave',
  'iota': 'iota',
  'tezos': 'tezos',
  'neo': 'neo',
  'kava': 'kava',
  'axie-infinity': 'axie-infinity',
  'zcash': 'zcash',
  'terra-luna-2': 'terra',
  'maker': 'maker',
  'rocket-pool': 'rocket-pool',
  'compound-governance-token': 'compound',
  'yearn-finance': 'yearn-finance',
  'curve-dao-token': 'curve-finance',
  'synthetix-network-token': 'synthetix',
  'pancakeswap-token': 'pancakeswap',
  'sushi': 'sushiswap',
  '1inch': '1inch',
  'basic-attention-token': 'basic-attention-token',
  'enjincoin': 'enjin',
  'chiliz': 'chiliz',
  'zilliqa': 'zilliqa',
  'amp-token': 'amp',
  'loopring': 'loopring',
  'nem': 'nem',
  'qtum': 'qtum',
  'icon': 'icon-project',
  'ravencoin': 'ravencoin',
  'harmony': 'harmony',
  'ankr': 'ankr',
  'celo': 'celo',
  'storj': 'storj',
  'ocean-protocol': 'ocean-protocol',
  'band-protocol': 'band-protocol',
  'skale': 'skale',
  'woo-network': 'woo-network',
  'mask-network': 'mask-network',
  'oasis-network': 'oasis-network',
  'nervos-network': 'nervos-network',
  'origintrail': 'origintrail',
  'iotex': 'iotex',
  'livepeer': 'livepeer',
  'kadena': 'kadena',
  'reserve-rights-token': 'reserve',
  'aelf': 'aelf',
  'holo': 'holochain',
  'ontology': 'ontology',
  'waves': 'waves',
  'lisk': 'lisk',
  'status': 'status-network',
  'polymath': 'polymath',
  'melon': 'enzyme-finance',
  'nexus-mutual': 'nexus-mutual',
  'havven': 'synthetix',
};

// Build reverse lookup for symbol matching
const SYMBOL_OVERRIDES = {
  'BNB': 'bnb',
  'XRP': 'xrp-ledger',
  'USDC': 'usdc',
  'USDT': 'tether',
  'DOT': 'polkadot',
  'SOL': 'solana',
  'ADA': 'cardano',
  'AVAX': 'avalanche',
  'LINK': 'chainlink',
  'MATIC': 'polygon',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'FTM': 'fantom',
  'ALGO': 'algorand',
  'XLM': 'stellar',
  'VET': 'vechain',
  'ETC': 'ethereum-classic',
  'NEAR': 'near-protocol',
  'ICP': 'internet-computer',
  'HBAR': 'hedera-hashgraph',
  'FIL': 'filecoin',
  'IMX': 'immutable-x',
  'INJ': 'injective',
  'THETA': 'theta-network',
  'GRT': 'the-graph',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
};

/**
 * Maps a CoinGecko coin to its Messari slug
 */
function toMessariSlug(coin) {
  // 1. Direct mapping table
  if (ID_MAP[coin.id]) return ID_MAP[coin.id];
  // 2. Symbol override
  if (SYMBOL_OVERRIDES[coin.symbol?.toUpperCase()]) return SYMBOL_OVERRIDES[coin.symbol.toUpperCase()];
  // 3. Try the CoinGecko ID as slug (most common case)
  return coin.id;
}

// ── Load existing data ──
function loadExisting() {
  try {
    const raw = fs.readFileSync(OUT_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      const map = {};
      arr.forEach(p => { if (p.id) map[p.id] = p; });
      return map;
    }
    return {};
  } catch { return {}; }
}

function saveData(dataMap) {
  const arr = Object.values(dataMap);
  fs.writeFileSync(OUT_FILE, JSON.stringify(arr, null, 2));
}

// ── Helper: safe text from element ──
async function safeText(page, selector) {
  try {
    return await page.$eval(selector, el => el.textContent?.trim() || '');
  } catch { return ''; }
}

// ── Helper: delay ──
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main Crawler ──
async function crawlProject(browser, slug, coinId, coinSymbol, coinName) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  
  // Collected data
  const result = {
    id: coinId,
    messariSlug: slug,
    name: coinName,
    symbol: coinSymbol,
    // Profile
    overview: '',
    background: '',
    category: '',
    sector: '',
    sectorRank: null,
    sectors_v2: [],
    sub_sectors_v2: [],
    subSectorRank: null,
    logo_id: '',
    // FAQs
    faqs: [],
    // Links
    links: [],
    // Contracts
    contract_addresses: [],
    // News
    news: [],
    // Developments
    developments: [],
    // Market pairs
    markets: [],
    // OHLCV
    ohlcv: [],
    // API ID (Messari's entity ID)
    messariApiId: '',
    // Analytics
    analytics: {},
    // Timestamps
    crawledAt: new Date().toISOString(),
  };

  // Intercept API responses
  const apiResponses = {};
  page.on('response', async (response) => {
    const url = response.url();
    try {
      if (url.includes('api.messari.io') && response.status() === 200) {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json') || ct.includes('text')) {
          const body = await response.text();
          try {
            const json = JSON.parse(body);
            // Categorize by URL pattern
            if (url.includes('/project_coverage/') || url.includes('/project/')) {
              apiResponses.projectCoverage = json;
            }
            if (url.includes('/asset/') && url.includes('results')) {
              apiResponses.assetScreener = json;
            }
            if (url.includes('/bqen/') || url.includes('market')) {
              apiResponses.markets = json;
            }
            if (url.includes('/timeseries/') && url.includes('price')) {
              apiResponses.timeseries = json;
            }
            if (url.includes('/calendar/') || url.includes('event')) {
              apiResponses.calendar = json;
            }
            if (url.includes('/news/') || url.includes('intel')) {
              apiResponses.news = json;
            }
            // Store all responses by URL fragment for later analysis
            const key = url.split('api.messari.io/')[1]?.split('?')[0] || url;
            apiResponses[key] = json;
          } catch { /* not JSON */ }
        }
      }
    } catch { /* response may have been closed */ }
  });

  try {
    // ═══════════════════════════════════════════
    //  STEP 1: Visit main project page
    // ═══════════════════════════════════════════
    console.log(`    📄 Loading project page...`);
    await page.goto(`https://messari.io/project/${slug}`, { 
      waitUntil: 'networkidle2', 
      timeout: NAV_TIMEOUT 
    });
    await sleep(3000); // Wait for dynamic content

    // ── Scrape profile data from DOM ──
    
    // Sector & Sub-sector
    const sectorInfo = await page.evaluate(() => {
      const result = { sector: '', subSector: '', sectorRank: null, subSectorRank: null, categories: [] };
      
      // Look for sector/classification labels
      const allText = document.body.innerText;
      
      // Find elements containing sector info
      const labels = document.querySelectorAll('[class*="label"], [class*="tag"], [class*="badge"], [class*="chip"], span, div');
      const sectorKeywords = new Set();
      
      labels.forEach(el => {
        const text = el.textContent?.trim();
        if (!text || text.length > 60 || text.length < 2) return;
        
        // Check for sector-like text near "Sector" labels
        const parent = el.parentElement;
        const parentText = parent?.textContent || '';
        
        if (parentText.includes('Sector') || parentText.includes('sector')) {
          if (text !== 'Sector' && !text.includes('Rank') && text.length < 40) {
            sectorKeywords.add(text);
          }
        }
      });
      
      // Extract from structured data if available  
      const metaTags = document.querySelectorAll('meta[property], meta[name]');
      metaTags.forEach(m => {
        const prop = m.getAttribute('property') || m.getAttribute('name') || '';
        const content = m.getAttribute('content') || '';
        if (prop.includes('category') || prop.includes('sector')) {
          result.sector = content;
        }
      });
      
      // Look for structured sidebar or classification section
      const sidebarSections = document.querySelectorAll('section, [role="complementary"], aside');
      sidebarSections.forEach(section => {
        const sText = section.innerText || '';
        if (sText.includes('Sector') && sText.includes('Sub-Sector')) {
          const lines = sText.split('\n').map(l => l.trim()).filter(l => l);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i] === 'Sector' && lines[i+1]) result.sector = lines[i+1];
            if (lines[i] === 'Sub-Sector' && lines[i+1]) result.subSector = lines[i+1];
            if (lines[i] === 'Sector Rank' && lines[i+1]) result.sectorRank = lines[i+1];
            if (lines[i] === 'Sub-Sector Rank' && lines[i+1]) result.subSectorRank = lines[i+1];
          }
        }
      });
      
      return result;
    });
    
    result.sector = sectorInfo.sector || result.sector;
    result.sub_sectors_v2 = sectorInfo.subSector ? [sectorInfo.subSector] : result.sub_sectors_v2;
    result.sectorRank = sectorInfo.sectorRank;
    result.subSectorRank = sectorInfo.subSectorRank;

    // ── Scrape overview/about from DOM ──
    const overview = await page.evaluate(() => {
      // Look for overview/about text blocks
      const selectors = [
        '[data-testid="project-overview"]',
        '[class*="overview"]',
        '[class*="description"]',
        '[class*="about"]',
        'article',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim().length > 50) {
          return el.textContent.trim().substring(0, 5000);
        }
      }
      // Try finding the main content area
      const main = document.querySelector('main') || document.querySelector('[role="main"]');
      if (main) {
        const paragraphs = main.querySelectorAll('p');
        const text = Array.from(paragraphs).map(p => p.textContent?.trim()).filter(t => t && t.length > 30).join('\n\n');
        if (text.length > 50) return text.substring(0, 5000);
      }
      return '';
    });
    result.overview = overview;

    // ── Scrape contracts ──
    const contracts = await page.evaluate(() => {
      const results = [];
      // Look for contract address elements
      const contractSection = document.body.innerText;
      
      // Find elements with addresses (0x..., T..., etc)
      const allElements = document.querySelectorAll('a[href*="explorer"], a[href*="scan"], [class*="contract"], [class*="address"]');
      allElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        // Look for hex addresses
        const match = text.match(/0x[a-fA-F0-9]{6,}/);
        if (match) {
          let network = 'Unknown';
          if (href.includes('etherscan')) network = 'Ethereum';
          else if (href.includes('bscscan')) network = 'BNB Chain';
          else if (href.includes('polygonscan')) network = 'Polygon';
          else if (href.includes('arbiscan')) network = 'Arbitrum';
          else if (href.includes('snowtrace') || href.includes('avax')) network = 'Avalanche';
          else if (href.includes('ftmscan')) network = 'Fantom';
          else if (href.includes('tronscan')) network = 'TRON';
          
          results.push({ address: match[0], network, networkSlug: network.toLowerCase().replace(/\s+/g, '-') });
        }
      });
      
      // Also look for sidebar contract info
      const rows = document.querySelectorAll('tr, [class*="row"]');
      rows.forEach(row => {
        const text = row.innerText || '';
        if (text.includes('Contract') || text.includes('contract')) {
          const addrMatch = text.match(/0x[a-fA-F0-9]{6,}|T[A-Za-z0-9]{30,}/);
          if (addrMatch) {
            const parts = text.split('\n').map(s => s.trim()).filter(s => s);
            const network = parts.find(p => !p.includes('0x') && !p.includes('Contract') && p.length > 2 && p.length < 30) || 'Unknown';
            results.push({ address: addrMatch[0], network, networkSlug: network.toLowerCase().replace(/\s+/g, '-') });
          }
        }
      });
      
      return results;
    });
    if (contracts.length > 0) result.contract_addresses = contracts;

    // ── Scrape links/resources from sidebar ──
    const links = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all external links in the sidebar/info panel
      const allLinks = document.querySelectorAll('a[href]');
      allLinks.forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent?.trim() || '';
        
        // Skip internal links
        if (href.startsWith('/') || href.includes('messari.io') || href === '#') return;
        if (!href.startsWith('http')) return;
        if (seen.has(href)) return;
        seen.add(href);
        
        // Classify the link
        let type = 'Other';
        const lower = href.toLowerCase();
        if (lower.includes('github.com')) type = 'Resources';
        else if (lower.includes('reddit.com')) type = 'Social';
        else if (lower.includes('twitter.com') || lower.includes('x.com')) type = 'Social';
        else if (lower.includes('discord')) type = 'Social';
        else if (lower.includes('telegram') || lower.includes('t.me')) type = 'Social';
        else if (lower.includes('medium.com') || lower.includes('blog') || lower.includes('substack')) type = 'Content';
        else if (lower.includes('youtube.com')) type = 'Content';
        else if (lower.includes('docs.') || lower.includes('documentation')) type = 'Resources';
        else if (lower.includes('scan.') || lower.includes('explorer')) type = 'Block Explorer';
        else if (lower.includes('whitepaper') || lower.includes('.pdf')) type = 'Resources';
        else if (text.length > 0 && text.length < 4 && !lower.includes('scan')) type = 'Website';

        // Determine label
        let name = text || '';
        if (!name && lower.includes('github')) name = 'Github';
        if (!name && lower.includes('reddit')) name = 'Reddit';
        if (!name && lower.includes('twitter') || lower.includes('x.com')) name = 'Twitter';
        if (!name && lower.includes('discord')) name = 'Discord';
        if (!name && lower.includes('telegram') || lower.includes('t.me')) name = 'Telegram';
        if (!name) {
          try { name = new URL(href).hostname.replace('www.', ''); } catch { name = href.substring(0, 40); }
        }
        
        results.push({ name, url: href, type });
      });
      
      return results;
    });
    result.links = links;

    // ── Scrape FAQs ──
    const faqs = await page.evaluate(() => {
      const results = [];
      
      // Look for FAQ accordion elements
      const faqContainers = document.querySelectorAll('[class*="faq"], [class*="accordion"], details, [data-testid*="faq"]');
      faqContainers.forEach(container => {
        const q = container.querySelector('summary, [class*="question"], button, h3, h4');
        const a = container.querySelector('[class*="answer"], [class*="content"], [class*="panel"], p');
        if (q && a) {
          const question = q.textContent?.trim();
          const answer = a.textContent?.trim();
          if (question && answer && question.length > 5) {
            results.push({ question, answer });
          }
        }
      });
      
      // Also look for Q&A patterns in the page
      if (results.length === 0) {
        const headings = document.querySelectorAll('h3, h4, h5');
        headings.forEach(h => {
          const text = h.textContent?.trim() || '';
          if (text.endsWith('?') || text.startsWith('What') || text.startsWith('How') || text.startsWith('Why') || text.startsWith('Who')) {
            const next = h.nextElementSibling;
            if (next && next.tagName === 'P') {
              results.push({ question: text, answer: next.textContent?.trim() || '' });
            }
          }
        });
      }
      
      return results;
    });
    if (faqs.length > 0) result.faqs = faqs;

    // ── Scrape API ID ──
    const apiId = await page.evaluate(() => {
      const text = document.body.innerText;
      // Look for API ID section
      const match = text.match(/API ID\s*[\n\r]+\s*([a-f0-9-]{20,})/i);
      if (match) return match[1];
      
      // Also check meta tags
      const meta = document.querySelector('meta[property="og:url"]');
      if (meta) {
        const url = meta.getAttribute('content') || '';
        const slug = url.split('/project/')[1]?.split('/')[0];
        if (slug) return slug;
      }
      return '';
    });
    result.messariApiId = apiId;

    // ═══════════════════════════════════════════
    //  STEP 2: Visit Intel/News page
    // ═══════════════════════════════════════════
    console.log(`    📰 Loading news...`);
    try {
      await page.goto(`https://messari.io/project/${slug}/news`, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT
      });
      await sleep(3000);

      // Scrape news items from DOM
      const newsItems = await page.evaluate(() => {
        const results = [];
        
        // Look for news article rows/cards
        const rows = document.querySelectorAll('tr, [class*="row"], article, [class*="news-item"], [class*="article"]');
        rows.forEach(row => {
          const linkEl = row.querySelector('a[href]');
          const headline = row.querySelector('a, [class*="title"], [class*="headline"], h3, h4, td:first-child');
          const dateEl = row.querySelector('time, [class*="date"], [class*="time"], td:nth-child(2)');
          const sourceEl = row.querySelector('[class*="source"], td:nth-child(3)');
          const categoryEl = row.querySelector('[class*="category"], td:nth-child(5)');
          const subCategoryEl = row.querySelector('[class*="sub-category"], td:last-child');
          
          const headlineText = headline?.textContent?.trim();
          if (!headlineText || headlineText.length < 10) return;
          
          // Get asset icons/tags
          const assetIcons = [];
          row.querySelectorAll('img[alt]').forEach(img => {
            const alt = img.getAttribute('alt');
            if (alt && alt.length < 20) assetIcons.push(alt);
          });
          
          results.push({
            headline: headlineText,
            url: linkEl?.getAttribute('href') || '',
            date: dateEl?.textContent?.trim() || '',
            source: sourceEl?.textContent?.trim() || '',
            category: categoryEl?.textContent?.trim() || '--',
            subCategory: subCategoryEl?.textContent?.trim() || '--',
            assets: assetIcons,
          });
        });
        
        return results.slice(0, 50);
      });

      // Also try to get news from intercepted API
      if (apiResponses.news?.rows) {
        const apiNews = apiResponses.news.rows.slice(0, 50).map(row => ({
          headline: row.title || row.headline || row.ENTITY?.title || '',
          url: row.url || row.link || row.ENTITY?.url || '',
          date: row.publishedAt || row.published_at || row.timestamp || '',
          source: row.source?.name || row.sourceName || '',
          category: row.category || row.tags?.[0] || '--',
          subCategory: row.subCategory || '--',
          summary: row.summary || row.ai_summary || '',
          assets: (row.assets || row.relatedAssets || []).map(a => a.name || a.symbol || a).slice(0, 10),
        }));
        // Prefer API data if richer
        if (apiNews.length > 0 && apiNews[0].headline) {
          result.news = apiNews;
        }
      }

      // Use DOM news if API didn't provide
      if (result.news.length === 0 && newsItems.length > 0) {
        result.news = newsItems;
      }
    } catch (err) {
      console.log(`    ⚠️ News scrape failed: ${err.message}`);
    }

    // ═══════════════════════════════════════════
    //  STEP 3: Visit Key Developments page  
    // ═══════════════════════════════════════════
    console.log(`    🔧 Loading key developments...`);
    try {
      await page.goto(`https://messari.io/project/${slug}/key-developments`, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT
      });
      await sleep(3000);

      const devItems = await page.evaluate(() => {
        const results = [];
        
        const rows = document.querySelectorAll('tr, [class*="row"], article, [class*="event"], [class*="development"]');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, [class*="cell"]');
          const textContent = row.innerText || '';
          
          if (textContent.length < 10) return;
          if (textContent.includes('Headline') && textContent.includes('Date')) return; // Skip header
          
          const parts = textContent.split('\n').map(s => s.trim()).filter(s => s);
          if (parts.length < 2) return;

          // Try to extract structured data
          const linkEl = row.querySelector('a[href]');
          const dateEl = row.querySelector('time, [class*="date"]');
          
          results.push({
            headline: parts[0] || '',
            date: dateEl?.textContent?.trim() || parts[1] || '',
            category: parts.length > 2 ? parts[2] : '--',
            subCategory: parts.length > 3 ? parts[3] : '--',
            url: linkEl?.getAttribute('href') || '',
            details: '',
          });
        });
        
        return results;
      });

      if (devItems.length > 0) {
        result.developments = devItems;
      }

      // If we have calendar data from API
      if (apiResponses.calendar?.data?.series) {
        const events = [];
        for (const s of apiResponses.calendar.data.series) {
          for (const p of (s.points || [])) {
            events.push({
              timestamp: p[0],
              eventDate: p[1],
              eventType: p[2] || 'event',
              status: p[3] || '',
              priority: p[4] || 'Medium',
              data: p[5] || {},
              impact: p[6] || '',
              importance: p[7] || '',
              urgency: p[8] || '',
            });
          }
        }
        if (events.length > 0 && result.developments.length === 0) {
          result.developments = events;
        }
      }
    } catch (err) {
      console.log(`    ⚠️ Developments scrape failed: ${err.message}`);
    }

    // ═══════════════════════════════════════════
    //  STEP 4: Visit Markets page (Historical)
    // ═══════════════════════════════════════════
    console.log(`    📈 Loading markets...`);
    try {
      await page.goto(`https://messari.io/project/${slug}/markets`, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT
      });
      await sleep(3000);

      const marketPairs = await page.evaluate(() => {
        const results = [];
        
        const rows = document.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return;
          
          const exchange = cells[0]?.textContent?.trim() || '';
          const pair = cells[1]?.textContent?.trim() || '';
          const price = cells[2]?.textContent?.trim() || '';
          const volume = cells[3]?.textContent?.trim() || '';
          
          if (!exchange || exchange === 'Exchange') return;
          
          const exchangeLogo = cells[0]?.querySelector('img')?.getAttribute('src') || '';
          
          // Parse pair into base/quote
          const pairParts = pair.split('/');
          
          results.push({
            exchange,
            exchangeLogo,
            baseAsset: pairParts[0]?.trim() || '',
            quoteAsset: pairParts[1]?.trim() || '',
            price: parseFloat(price.replace(/[,$]/g, '')) || 0,
            volume: parseFloat(volume.replace(/[,$KMB]/gi, '').trim()) || 0,
            liveness: 'live',
          });
        });
        
        return results;
      });

      if (marketPairs.length > 0) {
        result.markets = marketPairs;
      }

      // Check for intercepted market data
      if (apiResponses.markets?.rows) {
        const apiMarkets = apiResponses.markets.rows.map(row => ({
          id: row.ENTITY?.id || '',
          baseAsset: row.baseAsset?.symbol || row.ENTITY?.base_asset_name || '',
          quoteAsset: row.quoteAsset?.symbol || row.ENTITY?.quote_asset_name || '',
          exchange: row.exchange?.name || row.ENTITY?.exchange_name || '',
          exchangeLogo: row.exchange?.logo_url || '',
          liveness: row.liveness || 'live',
          price: row.price || 0,
          volume: row.volume || 0,
          shareOfVolume: row.shareOfVolume || 0,
        }));
        if (apiMarkets.length > 0) result.markets = apiMarkets;
      }
    } catch (err) {
      console.log(`    ⚠️ Markets scrape failed: ${err.message}`);
    }

    // ═══════════════════════════════════════════
    //  STEP 5: Use intercepted API for rich data
    // ═══════════════════════════════════════════
    
    // Project Coverage data (richest source)
    if (apiResponses.projectCoverage?.rows) {
      const row = apiResponses.projectCoverage.rows.find(r => 
        r.ENTITY?.slug === slug || r.ENTITY?.id === slug
      );
      if (row) {
        const e = row.ENTITY || {};
        result.overview = result.overview || e.overview || '';
        result.background = e.background || '';
        result.category = e.category || '';
        result.sector = result.sector || e.sector || '';
        result.sectors_v2 = e.sectors_v2 || result.sectors_v2;
        result.sub_sectors_v2 = e.sub_sectors_v2 || result.sub_sectors_v2;
        result.logo_id = e.logo_id || '';
        result.messariApiId = e.id || result.messariApiId;
        
        // FAQs from API
        if (e.faqs?.length > 0) {
          result.faqs = e.faqs.map(f => ({ question: f.question, answer: f.answer }));
        }
        
        // Links from API
        if (e.links?.length > 0) {
          result.links = e.links.map(l => ({ name: l.name, url: l.link || l.url, type: l.type }));
        }
        
        // Contracts from API
        const pa = row.primaryAsset || {};
        if (pa.contract_addresses?.length > 0) {
          result.contract_addresses = pa.contract_addresses.map(c => ({
            address: c.contract_address,
            network: c.network_name,
            networkSlug: c.network_slug,
          }));
        }
      }
    }

    // Timeseries OHLCV
    if (apiResponses.timeseries?.data?.series) {
      for (const s of apiResponses.timeseries.data.series) {
        const points = (s.points || []).map(p => ({
          time: p[0], open: p[1], close: p[2], high: p[3], low: p[4], volume: p[5],
        }));
        if (points.length > 0) {
          result.ohlcv = points;
          break;
        }
      }
    }

  } catch (err) {
    console.log(`    ❌ Error crawling ${slug}: ${err.message}`);
  } finally {
    await page.close();
  }

  return result;
}

// ═══════════════════════════════════════════
//  MAIN 
// ═══════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Messari.io Comprehensive Crawler');
  console.log('═══════════════════════════════════════\n');

  // Load CoinGecko top 1000
  const markets = JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf8'));
  const top1000 = markets.slice(0, TOP_N);
  console.log(`📊 Top ${top1000.length} coins loaded from CoinGecko markets`);

  // Load existing data
  const existing = loadExisting();
  console.log(`📦 Existing Messari data: ${Object.keys(existing).length} projects\n`);

  // Determine which coins to crawl
  const toCrawl = [];
  for (let i = START_INDEX; i < Math.min(top1000.length, START_INDEX + LIMIT); i++) {
    const coin = top1000[i];
    const slug = toMessariSlug(coin);
    // Skip if already crawled with rich data
    const ex = existing[coin.id];
    if (ex && (ex.news?.length > 0 || ex.developments?.length > 0 || ex.faqs?.length > 0 || ex.overview?.length > 100)) {
      continue;
    }
    toCrawl.push({ index: i, coin, slug });
  }

  console.log(`🔍 Coins to crawl: ${toCrawl.length} (skipping ${Math.min(top1000.length, START_INDEX + LIMIT) - START_INDEX - toCrawl.length} already done)\n`);

  if (toCrawl.length === 0) {
    console.log('✅ All coins already have Messari data!');
    return;
  }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--window-size=1920,1080',
    ],
  });

  let newCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let idx = 0; idx < toCrawl.length; idx++) {
    const { index, coin, slug } = toCrawl[idx];
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    const remaining = idx > 0 ? ((Date.now() - startTime) / idx * (toCrawl.length - idx) / 60000).toFixed(0) : '?';

    console.log(`  [${idx + 1}/${toCrawl.length}] #${index + 1} ${coin.id} → ${slug} (${elapsed}m elapsed, ~${remaining}m remaining)...`);

    let success = false;
    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      try {
        const data = await crawlProject(browser, slug, coin.id, coin.symbol?.toUpperCase(), coin.name);
        
        // Check if we got meaningful data
        const hasData = data.overview?.length > 20 || data.faqs?.length > 0 || 
                       data.news?.length > 0 || data.developments?.length > 0 ||
                       data.links?.length > 0 || data.contract_addresses?.length > 0;
        
        if (hasData) {
          // Merge with existing to preserve any old data
          existing[coin.id] = { ...(existing[coin.id] || {}), ...data };
          newCount++;
          const stats = [
            data.overview?.length > 0 ? `overview:${data.overview.length}` : '',
            data.faqs?.length > 0 ? `faqs:${data.faqs.length}` : '',
            data.news?.length > 0 ? `news:${data.news.length}` : '',
            data.developments?.length > 0 ? `devs:${data.developments.length}` : '',
            data.links?.length > 0 ? `links:${data.links.length}` : '',
            data.contract_addresses?.length > 0 ? `contracts:${data.contract_addresses.length}` : '',
            data.markets?.length > 0 ? `markets:${data.markets.length}` : '',
          ].filter(s => s).join(', ');
          console.log(`    ✅ OK (${stats})`);
          success = true;
          break;
        } else {
          console.log(`    ⚠️ No data found on Messari for ${slug}`);
          // Store minimal entry to skip next time
          existing[coin.id] = { id: coin.id, messariSlug: slug, name: coin.name, symbol: coin.symbol, noDataOnMessari: true, crawledAt: new Date().toISOString() };
          success = true;
          break;
        }
      } catch (err) {
        if (retry < MAX_RETRIES) {
          console.log(`    ⚠️ Retry ${retry + 1}: ${err.message}`);
          await sleep(5000);
        } else {
          console.log(`    ❌ Failed after ${MAX_RETRIES + 1} attempts: ${err.message}`);
          failCount++;
        }
      }
    }

    // Save progress periodically
    if ((idx + 1) % SAVE_EVERY === 0) {
      saveData(existing);
      console.log(`    💾 Progress saved: ${Object.keys(existing).length} total (${newCount} new, ${failCount} failed)\n`);
    }

    // Delay between coins
    if (idx < toCrawl.length - 1) {
      await sleep(DELAY_BETWEEN_COINS);
    }
  }

  // Final save
  saveData(existing);
  await browser.close();

  console.log('\n═══════════════════════════════════════');
  console.log(`  ✅ Crawl Complete!`);
  console.log(`  Total: ${Object.keys(existing).length} projects`);
  console.log(`  New: ${newCount}, Failed: ${failCount}`);
  console.log(`  Time: ${((Date.now() - startTime) / 60000).toFixed(1)} minutes`);
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
