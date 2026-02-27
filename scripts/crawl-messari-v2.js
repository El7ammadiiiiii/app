#!/usr/bin/env node
/**
 * Messari.io Comprehensive Crawler v2
 * 
 * Optimized: 2 pages per coin (main + news), better sidebar parsing,
 * extracts sector/rank/contracts/links from "About & Links" section.
 * 
 * Usage: node scripts/crawl-messari-v2.js [--start N] [--limit N] [--force]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ── Config ──
const OUT_FILE = path.join(__dirname, '../public/data/messari-projects.json');
const MARKETS_FILE = path.join(__dirname, '../public/data/coingecko-markets.json');
const DELAY_BETWEEN_COINS = 4000;       // 4s between coins
const NAV_TIMEOUT = 35000;              // 35s navigation timeout
const MAX_RETRIES = 2;
const SAVE_EVERY = 5;
const TOP_N = 1000;

// Parse CLI args
const args = process.argv.slice(2);
let START_INDEX = 0;
let LIMIT = TOP_N;
let FORCE = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i + 1]) START_INDEX = parseInt(args[i + 1]);
  if (args[i] === '--limit' && args[i + 1]) LIMIT = parseInt(args[i + 1]);
  if (args[i] === '--force') FORCE = true;
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
  'mantra-dao': 'mantra',
  'apecoin': 'apecoin',
  'worldcoin-wld': 'worldcoin',
  'pendle': 'pendle',
  'jupiter-exchange-solana': 'jupiter',
  'jito-governance-token': 'jito',
  'ethena': 'ethena',
  'ondo-finance': 'ondo-finance',
  'celestia': 'celestia',
  'pyth-network': 'pyth-network',
  'sei-network': 'sei',
  'starknet': 'starknet',
  'bittensor': 'bittensor',
  'bonk': 'bonk',
  'dogwifcoin': 'dogwifhat',
  'floki': 'floki',
  'pepe': 'pepe',
  'first-digital-usd': 'first-digital-usd',
  'mantle': 'mantle',
  'beam-2': 'beam',
  'aave': 'aave',
  'thorchain': 'thorchain',
  'gala': 'gala-games',
  'helium': 'helium',
  'mina-protocol': 'mina-protocol',
  'conflux-token': 'conflux-network',
  'kaspa': 'kaspa',
  'wemix-token': 'wemix',
};

const SYMBOL_OVERRIDES = {
  'BNB': 'bnb', 'XRP': 'xrp-ledger', 'USDC': 'usdc', 'USDT': 'tether',
  'DOT': 'polkadot', 'SOL': 'solana', 'ADA': 'cardano', 'AVAX': 'avalanche',
  'LINK': 'chainlink', 'MATIC': 'polygon', 'UNI': 'uniswap', 'ATOM': 'cosmos',
  'FTM': 'fantom', 'ALGO': 'algorand', 'XLM': 'stellar', 'VET': 'vechain',
  'ETC': 'ethereum-classic', 'NEAR': 'near-protocol', 'ICP': 'internet-computer',
  'HBAR': 'hedera-hashgraph', 'FIL': 'filecoin', 'IMX': 'immutable-x',
  'INJ': 'injective', 'THETA': 'theta-network', 'GRT': 'the-graph',
  'SAND': 'the-sandbox', 'MANA': 'decentraland', 'AXS': 'axie-infinity',
  'TON': 'toncoin', 'TIA': 'celestia', 'STX': 'stacks',
  'APT': 'aptos', 'SUI': 'sui', 'SEI': 'sei', 'TAO': 'bittensor',
  'AAVE': 'aave', 'RUNE': 'thorchain', 'MKR': 'maker', 'SNX': 'synthetix',
};

function toMessariSlug(coin) {
  if (ID_MAP[coin.id]) return ID_MAP[coin.id];
  if (SYMBOL_OVERRIDES[coin.symbol?.toUpperCase()]) return SYMBOL_OVERRIDES[coin.symbol.toUpperCase()];
  return coin.id;
}

function loadExisting() {
  try {
    const arr = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (Array.isArray(arr)) {
      const map = {};
      arr.forEach(p => { if (p.id) map[p.id] = p; });
      return map;
    }
    return {};
  } catch { return {}; }
}

function saveData(dataMap) {
  fs.writeFileSync(OUT_FILE, JSON.stringify(Object.values(dataMap), null, 2));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Parse the "About & Links" text block to extract structured sidebar data.
 * Pattern: [overview]\nSector[value]Sector Rank[value]Sub-Sector[value]...
 */
function parseSidebarText(text) {
  const result = {
    overview: '',
    sector: '',
    sectorRank: '',
    subSector: '',
    subSectorRank: '',
    contracts: [],
    messariApiId: '',
    resources: [],
    content: [],
    social: [],
    blockExplorers: [],
    founders: [],
    exchanges: [],
  };

  if (!text) return result;

  // Find the position of first structured label
  const sectorIdx = text.indexOf('Sector');
  if (sectorIdx > 0) {
    result.overview = text.substring(0, sectorIdx).trim();
  } else {
    result.overview = text.trim();
    return result;
  }

  // Extract with regex patterns from the structured part
  const structured = text.substring(sectorIdx);

  // Sector (must be before "Sector Rank")
  const sectorMatch = structured.match(/^Sector([A-Za-z0-9\s\-\/&]+?)(?=Sector Rank|Sub-Sector|Contracts|API ID)/);
  if (sectorMatch) result.sector = sectorMatch[1].trim();

  // Sector Rank - prefer first non-'n/a' value
  const sectorRankMatch = structured.match(/Sector Rank([#\d,\s\/na]+?)(?=Sub-Sector|Contracts|API ID|Content|Resources|Social)/);
  if (sectorRankMatch) {
    const ranks = sectorRankMatch[1].trim().split(',').map(r => r.trim()).filter(r => r);
    result.sectorRank = ranks.find(r => r !== 'n/a' && r !== '') || ranks[0] || '';
  }

  // Sub-Sector
  const subSectorMatch = structured.match(/Sub-Sector([A-Za-z0-9\s\-\/&\.]+?)(?=Sub-Sector Rank|Contracts|API ID|Content|Resources|Social)/);
  if (subSectorMatch) result.subSector = subSectorMatch[1].trim();

  // Sub-Sector Rank - prefer first non-'n/a' value
  const subSectorRankMatch = structured.match(/Sub-Sector Rank([#\d,\s\/na]+?)(?=Contracts|API ID|Content|Resources|Social)/);
  if (subSectorRankMatch) {
    const ranks = subSectorRankMatch[1].trim().split(',').map(r => r.trim()).filter(r => r);
    result.subSectorRank = ranks.find(r => r !== 'n/a' && r !== '') || ranks[0] || '';
  }

  // Contracts (hex addresses)
  const contractsMatch = structured.match(/Contracts((?:0x[a-fA-F0-9.]+[\s,]*)+)/);
  if (contractsMatch) {
    const addrs = contractsMatch[1].match(/0x[a-fA-F0-9.]+/g) || [];
    addrs.forEach(a => {
      // Expand abbreviated addresses (0xdac1...1ec7 → keep as is, expand later)
      result.contracts.push({ address: a.replace(/\.\.\./g, '...'), network: 'Ethereum' });
    });
  }
  // Also check for non-0x contracts (Tron T..., etc.)
  const tronMatch = structured.match(/Contracts[^A-Z]*?(T[A-Za-z0-9]{30,})/);
  if (tronMatch) {
    result.contracts.push({ address: tronMatch[1], network: 'TRON' });
  }

  // API ID
  const apiIdMatch = structured.match(/API ID([a-f0-9\-\.]+)/);
  if (apiIdMatch) result.messariApiId = apiIdMatch[1].replace(/\.\.\./g, '');

  // Content (Blog, etc.)
  const contentMatch = structured.match(/Content((?:[A-Za-z\s]+)+?)(?=Resources|Social|Block Explorer|Project|Founders|\n|$)/);
  if (contentMatch) {
    result.content = contentMatch[1].trim().split(/(?=[A-Z])/).filter(s => s.trim().length > 1).map(s => s.trim());
  }

  // Resources
  const resourcesMatch = structured.match(/Resources((?:[A-Za-z\s\.]+)+?)(?=Content|Social|Block Explorer|Project|Founders|\n|$)/);
  if (resourcesMatch) {
    result.resources = resourcesMatch[1].trim().split(/(?=[A-Z])/).filter(s => s.trim().length > 1).map(s => s.trim());
  }

  // Social
  const socialMatch = structured.match(/Social((?:[A-Za-z\s\(\)]+)+?)(?=Content|Resources|Block Explorer|Project|Founders|\n|$)/);
  if (socialMatch) {
    result.social = socialMatch[1].trim().split(/(?=[A-Z])/).filter(s => s.trim().length > 1).map(s => s.trim());
  }

  // Block Explorer
  const explorerMatch = structured.match(/Block Explorer((?:[A-Za-z\s\.]+)+?)(?=Content|Resources|Social|Project|Founders|\n|$)/);
  if (explorerMatch) {
    result.blockExplorers = explorerMatch[1].trim().split(/(?=[A-Z])/).filter(s => s.trim().length > 1).map(s => s.trim());
  }

  // Founders - split by title keywords and pair name+role
  const foundersMatch = structured.match(/Founders([\s\S]+?)$/);
  if (foundersMatch) {
    const raw = foundersMatch[1].trim();
    // Split into [name, title, name, title, ...] pairs
    const parts = raw.split(/((?:Co-)?Founder[^A-Z]*|CEO[^A-Z]*|CTO[^A-Z]*|Creator[^A-Z]*)/);
    const founders = [];
    for (let i = 0; i < parts.length; i += 2) {
      const name = parts[i]?.replace(/\n/g, ' ').trim();
      const role = parts[i+1]?.replace(/\n/g, ' ').trim() || '';
      if (name && name.length > 1) {
        founders.push({ name, role: role.replace(/,\s*$/, '').trim() });
      }
    }
    result.founders = founders;
  }

  // Project Exchanges
  const exchangesMatch = structured.match(/Project Exchanges((?:[A-Za-z\s\(\)]+)+?)(?=Founders|$)/);
  if (exchangesMatch) {
    result.exchanges = exchangesMatch[1].trim().split(/(?=[A-Z])/).filter(s => s.trim().length > 1).map(s => s.trim());
  }

  return result;
}

// ══════════════════════════════════════
//  MAIN CRAWLER
// ══════════════════════════════════════
async function crawlProject(browser, slug, coinId, coinSymbol, coinName) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);

  // Block images/fonts/media to speed up loading
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const result = {
    id: coinId,
    messariSlug: slug,
    name: coinName,
    symbol: coinSymbol,
    overview: '',
    background: '',
    sector: '',
    sectorRank: null,
    sectors_v2: [],
    sub_sectors_v2: [],
    subSectorRank: null,
    faqs: [],
    links: [],
    contract_addresses: [],
    news: [],
    developments: [],
    markets: [],
    ohlcv: [],
    messariApiId: '',
    resources: [],
    content: [],
    blockExplorers: [],
    social: [],
    founders: [],
    crawledAt: new Date().toISOString(),
  };

  try {
    // ═══════════════════════════════════
    //  STEP 1: Main project page
    // ═══════════════════════════════════
    console.log(`    📄 Main page...`);
    const mainUrl = `https://messari.io/project/${slug}`;
    const resp = await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    
    // Check for 404/redirect
    if (resp && (resp.status() === 404 || resp.url().includes('/404'))) {
      console.log(`    ⚠️ 404 - Project not found on Messari`);
      return { ...result, noDataOnMessari: true };
    }
    
    await sleep(4000); // Wait for React render

    // ── Extract ALL text from page sections ──
    const pageData = await page.evaluate(() => {
      const data = {
        aboutLinks: [],    // "About & Links" sections
        faqItems: [],      // Real FAQ Q&A pairs
        newsTabText: '',   // News section text
        allLinks: [],      // All external links
        devItems: [],      // Key development items
        pageTitle: document.title || '',
        sidebarData: {},   // Structured sidebar data from DOM elements
        bodyTextSnippet: '', // Relevant body text for parsing
      };

      // Get all text content organized by sections
      const allText = document.body.innerText || '';

      // ── Find "About & Links" sections ──
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, button, summary, [role="button"]');

      headings.forEach(h => {
        const text = h.textContent?.trim() || '';
        if (text === 'About & Links') {
          let el = h.nextElementSibling || h.parentElement?.nextElementSibling;
          let content = '';
          let depth = 0;
          while (el && depth < 15) {
            const t = el.innerText?.trim() || '';
            if (t.length > 10) {
              content += t + '\n';
            }
            el = el.nextElementSibling;
            depth++;
          }
          if (content.length > 20) {
            data.aboutLinks.push(content.trim());
          }
        }
      });

      // If no "About & Links" found, try sidebar selectors
      if (data.aboutLinks.length === 0) {
        const sidebarSelectors = [
          '[class*="sidebar"]', '[class*="info-panel"]', '[class*="profile"]',
          'aside', '[role="complementary"]'
        ];
        for (const sel of sidebarSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const t = el.innerText?.trim();
            if (t && t.includes('Sector') && t.length > 50) {
              data.aboutLinks.push(t);
              break;
            }
          }
        }
      }

      // ── Extract structured sidebar data from DOM elements ──
      // Search for specific label elements and their adjacent values
      const allElements = document.querySelectorAll('span, div, p, dt, dd, h3, h4, h5, h6, label, li');
      const sidebarLabels = {
        'Sector': 'sector', 'Sector Rank': 'sectorRank', 'Sector Ranking': 'sectorRank',
        'Sub-Sector': 'subSector', 'Sub-Sector Rank': 'subSectorRank',
        'Contracts': 'contracts', 'API ID': 'apiId',
        'Content': 'content', 'Resources': 'resources',
        'Social': 'social', 'Block Explorer': 'blockExplorers',
      };
      
      for (const el of allElements) {
        const t = el.textContent?.trim();
        if (!t || t.length > 40 || el.children.length > 3) continue;
        
        for (const [label, key] of Object.entries(sidebarLabels)) {
          if (t === label && !data.sidebarData[key]) {
            // Get value from next sibling or parent's next sibling
            let valueEl = el.nextElementSibling;
            if (!valueEl) valueEl = el.parentElement?.nextElementSibling;
            if (!valueEl) valueEl = el.parentElement?.parentElement?.nextElementSibling;
            const val = valueEl?.textContent?.trim();
            if (val && val !== t && val.length < 200) {
              data.sidebarData[key] = val;
            }
          }
        }
      }

      // Also search for Founders pattern: "[Project] Founders" heading
      const bodyText = document.body.innerText || '';
      const foundersMatch = bodyText.match(/Founders\n([\s\S]{5,500}?)(?=\n\n[A-Z]|\nUSD|\nPerformance|\n(?:Sector|Market|Volume|Price))/);
      if (foundersMatch) {
        data.sidebarData.foundersText = foundersMatch[1].trim();
      }
      
      // Extract a focused body text snippet around structured sidebar area
      const contractsIdx = bodyText.indexOf('Contracts\n');
      const sectorIdx2 = bodyText.indexOf('\nSector\n');
      const apiIdIdx = bodyText.indexOf('API ID\n');
      const searchStart = Math.min(
        contractsIdx > 0 ? contractsIdx : 99999,
        sectorIdx2 > 0 ? sectorIdx2 : 99999,
        apiIdIdx > 0 ? apiIdIdx : 99999
      );
      if (searchStart < 99999) {
        data.bodyTextSnippet = bodyText.substring(Math.max(0, searchStart - 200), searchStart + 1500);
      }

      // ── Find FAQ items (real Q&A) ──
      // Look for elements that look like questions (end with ?)
      const buttons = document.querySelectorAll('button, summary, [role="button"], [class*="accordion"]');
      buttons.forEach(btn => {
        const q = btn.textContent?.trim();
        if (!q) return;
        // Real FAQ questions typically start with What/How/Why/Can/Has/Is/Does
        if (/^(What|How|Why|Can|Has|Is|Does|Are|Will|Should|Where|When|Do)\s/i.test(q) && q.endsWith('?')) {
          // Try to find the answer
          let answerEl = btn.nextElementSibling;
          if (!answerEl) {
            answerEl = btn.parentElement?.nextElementSibling;
          }
          // Also check for hidden/collapsed content
          if (!answerEl && btn.closest('details')) {
            answerEl = btn.closest('details')?.querySelector(':not(summary)');
          }
          const answer = answerEl?.innerText?.trim() || '';
          if (answer.length > 10 && answer.length < 3000) {
            data.faqItems.push({ question: q, answer });
          }
        }
      });

      // If no FAQs found via buttons, try heading-based pattern
      if (data.faqItems.length === 0) {
        const allHeadings = document.querySelectorAll('h3, h4, h5');
        allHeadings.forEach(h => {
          const q = h.textContent?.trim();
          if (q && q.endsWith('?') && /^(What|How|Why|Can|Has|Is|Does)\s/i.test(q)) {
            const next = h.nextElementSibling;
            if (next) {
              const answer = next.innerText?.trim();
              if (answer && answer.length > 10 && answer.length < 3000) {
                data.faqItems.push({ question: q, answer });
              }
            }
          }
        });
      }

      // ── Collect all external links ──
      const linkSet = new Set();
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('http') || href.includes('messari.io')) return;
        if (linkSet.has(href)) return;
        linkSet.add(href);
        const text = a.textContent?.trim() || '';
        data.allLinks.push({ url: href, text: text.substring(0, 100) });
      });

      // ── Key Developments (may appear on main page) ──
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        const headerTexts = Array.from(headers).map(h => h.textContent?.trim().toLowerCase());
        
        // Check if this is a developments/events table
        if (headerTexts.some(h => h?.includes('headline') || h?.includes('event') || h?.includes('development'))) {
          // Build header index map for proper column mapping
          const hMap = {};
          headerTexts.forEach((h, i) => { if (h) hMap[h] = i; });
          const headlineIdx = hMap['event'] ?? hMap['headline'] ?? hMap['development'] ?? 0;
          const importanceIdx = hMap['importance'] ?? -1;
          const statusIdx = hMap['status'] ?? -1;
          const categoryIdx = hMap['category'] ?? -1;
          const subcategoryIdx = hMap['sub-category'] ?? hMap['subcategory'] ?? -1;
          const dateIdx = hMap['date'] ?? -1;
          
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            const headline = cells[headlineIdx]?.textContent?.trim();
            if (!headline || headline.length < 5) return;
            const link = cells[headlineIdx]?.querySelector('a')?.getAttribute('href') || '';
            const importance = importanceIdx >= 0 ? cells[importanceIdx]?.textContent?.trim() : '';
            const status = statusIdx >= 0 ? cells[statusIdx]?.textContent?.trim() : '';
            const category = categoryIdx >= 0 ? cells[categoryIdx]?.textContent?.trim() : '';
            const subCategory = subcategoryIdx >= 0 ? cells[subcategoryIdx]?.textContent?.trim() : '';
            const date = dateIdx >= 0 ? cells[dateIdx]?.textContent?.trim() : '';
            data.devItems.push({ headline, importance, status, date, category, subCategory, url: link });
          });
        }
      });

      return data;
    });

    // ── Parse "About & Links" text to extract structured data ──
    if (pageData.aboutLinks.length > 0) {
      // Use the longest "About & Links" block (most complete)
      const bestBlock = pageData.aboutLinks.sort((a, b) => b.length - a.length)[0];
      const parsed = parseSidebarText_browser(bestBlock);
      
      // Apply parsed data
      if (parsed.overview) result.overview = parsed.overview;
      if (parsed.sector) result.sector = parsed.sector;
      if (parsed.sectorRank) result.sectorRank = parsed.sectorRank;
      if (parsed.subSector) {
        result.subSector = parsed.subSector;
        result.sub_sectors_v2 = [parsed.subSector];
      }
      if (parsed.subSectorRank) result.subSectorRank = parsed.subSectorRank;
      if (parsed.messariApiId) result.messariApiId = parsed.messariApiId;
      if (parsed.contracts.length > 0) result.contract_addresses = parsed.contracts;
    }

    // Apply parsed data via Node-side parser too
    if (pageData.aboutLinks.length > 0) {
      const bestBlock = pageData.aboutLinks.sort((a, b) => b.length - a.length)[0];
      const parsed = parseSidebarText(bestBlock);
      if (parsed.overview && !result.overview) result.overview = parsed.overview;
      if (parsed.sector && !result.sector) result.sector = parsed.sector;
      if (parsed.sectorRank && !result.sectorRank) result.sectorRank = parsed.sectorRank;
      if (parsed.subSector && result.sub_sectors_v2.length === 0) {
        result.subSector = parsed.subSector;
        result.sub_sectors_v2 = [parsed.subSector];
      }
      if (parsed.subSectorRank && !result.subSectorRank) result.subSectorRank = parsed.subSectorRank;
      if (parsed.messariApiId && !result.messariApiId) result.messariApiId = parsed.messariApiId;
      if (parsed.contracts.length > 0 && result.contract_addresses.length === 0) {
        result.contract_addresses = parsed.contracts;
      }
      result.resources = parsed.resources;
      result.content = parsed.content;
      result.blockExplorers = parsed.blockExplorers;
      result.social = parsed.social;
      result.founders = parsed.founders;
    }

    // ── Apply structured sidebar data from DOM elements (fallback for missing fields) ──
    const sd = pageData.sidebarData || {};
    if (sd.sector && !result.sector) result.sector = sd.sector;
    if (sd.sectorRank && !result.sectorRank) {
      // Parse ranks, prefer non-"n/a"
      const ranks = sd.sectorRank.split(',').map(r => r.trim()).filter(r => r);
      const best = ranks.find(r => r !== 'n/a' && r !== '');
      if (best) result.sectorRank = best.match(/#?\d+/)?.[0] || best;
    }
    if (sd.subSector && !result.subSector) {
      result.subSector = sd.subSector;
      result.sub_sectors_v2 = [sd.subSector];
    }
    if (sd.subSectorRank && !result.subSectorRank) {
      const rankVal = sd.subSectorRank.match(/#?\d+/)?.[0];
      if (rankVal) result.subSectorRank = rankVal.startsWith('#') ? rankVal : '#' + rankVal;
    }
    if (sd.contracts && result.contract_addresses.length === 0) {
      // Parse contract addresses from the text
      const addrs = sd.contracts.match(/(?:0x[a-fA-F0-9.\u2026]+|T[A-Za-z0-9]{30,})/g) || [];
      result.contract_addresses = addrs.map(a => ({ address: a, network: a.startsWith('T') ? 'TRON' : 'Ethereum' }));
    }
    if (sd.content && result.content.length === 0) {
      result.content = sd.content.split('\n').map(s => s.trim()).filter(s => s.length > 1);
    }
    if (sd.resources && result.resources.length === 0) {
      result.resources = sd.resources.split('\n').map(s => s.trim()).filter(s => s.length > 1);
    }
    if (sd.social && result.social.length === 0) {
      result.social = sd.social.split('\n').map(s => s.trim()).filter(s => s.length > 1);
    }
    if (sd.blockExplorers && result.blockExplorers.length === 0) {
      result.blockExplorers = sd.blockExplorers.split('\n').map(s => s.trim()).filter(s => s.length > 1);
    }
    
    // Parse founders from body text if still empty
    if (sd.foundersText && result.founders.length === 0) {
      const lines = sd.foundersText.split('\n').map(l => l.trim()).filter(l => l);
      const founders = [];
      for (const line of lines) {
        if (/^(Co-)?Founder|^CEO|^CTO|^Creator|^Chief/i.test(line)) {
          if (founders.length > 0 && !founders[founders.length - 1].role) {
            founders[founders.length - 1].role = line;
          }
        } else if (line.length > 2 && line.length < 50) {
          founders.push({ name: line, role: '' });
        }
      }
      if (founders.length > 0) result.founders = founders;
    }

    // Parse body text snippet for contracts if still empty
    if (pageData.bodyTextSnippet && result.contract_addresses.length === 0) {
      const contractsMatch = pageData.bodyTextSnippet.match(/Contracts\n((?:(?:0x[a-fA-F0-9.\u2026]+|T[A-Za-z0-9]{30,})[\s\n]*)+)/);
      if (contractsMatch) {
        const addrs = contractsMatch[1].match(/(?:0x[a-fA-F0-9.\u2026]+|T[A-Za-z0-9]{30,})/g) || [];
        result.contract_addresses = addrs.map(a => ({ address: a, network: a.startsWith('T') ? 'TRON' : 'Ethereum' }));
      }
    }

    // Parse body text snippet for sector/rank (multi-line format fallback)
    if (pageData.bodyTextSnippet) {
      const bts = pageData.bodyTextSnippet;
      if (!result.sector || result.sector === 'Others') {
        const sectorM = bts.match(/\nSector\n([A-Za-z\s\-&\/]+?)\n/);
        if (sectorM && sectorM[1].trim() !== 'Others') result.sector = sectorM[1].trim();
      }
      if (!result.sectorRank || result.sectorRank === 'n/a') {
        const rankM = bts.match(/Sector Rank(?:ing)?\n([^\n]+)/);
        if (rankM) {
          const ranks = rankM[1].split(',').map(r => r.trim());
          const best = ranks.find(r => r !== 'n/a' && r.match(/#?\d/));
          if (best) result.sectorRank = best;
        }
      }
      if (!result.subSector) {
        const subM = bts.match(/Sub-Sector\n([A-Za-z0-9\s\-&\/\.]+?)\n/);
        if (subM) {
          result.subSector = subM[1].trim();
          result.sub_sectors_v2 = [subM[1].trim()];
        }
      }
      if (!result.subSectorRank || result.subSectorRank === 'n/a') {
        const subRankM = bts.match(/Sub-Sector Rank\n([^\n]+)/);
        if (subRankM) {
          const ranks = subRankM[1].split(',').map(r => r.trim());
          const best = ranks.find(r => r !== 'n/a' && r.match(/#?\d/));
          if (best) result.subSectorRank = best;
        }
      }
    }

    // Set overview from "About & Links" if still empty (use the longest aboutLinks block)
    if (!result.overview && pageData.aboutLinks.length > 0) {
      const longestBlock = pageData.aboutLinks.sort((a, b) => b.length - a.length)[0];
      // Take text before any structured label
      const sectorPos = longestBlock.indexOf('Sector');
      result.overview = sectorPos > 20 ? longestBlock.substring(0, sectorPos).trim() : longestBlock.trim();
    }

    // Apply FAQs (only real Q&A, not sidebar data)
    if (pageData.faqItems.length > 0) {
      result.faqs = pageData.faqItems;
    }

    // Apply links
    if (pageData.allLinks.length > 0) {
      result.links = pageData.allLinks.map(l => {
        let type = 'Other';
        const lower = l.url.toLowerCase();
        if (lower.includes('github.com')) type = 'Resources';
        else if (lower.includes('reddit.com') || lower.includes('twitter.com') || lower.includes('x.com') || lower.includes('discord') || lower.includes('telegram') || lower.includes('t.me')) type = 'Social';
        else if (lower.includes('medium.com') || lower.includes('blog') || lower.includes('substack') || lower.includes('youtube.com')) type = 'Content';
        else if (lower.includes('docs.') || lower.includes('documentation') || lower.includes('whitepaper') || lower.includes('.pdf')) type = 'Resources';
        else if (lower.includes('scan.') || lower.includes('explorer')) type = 'Block Explorer';
        let name = l.text || '';
        if (!name || name.length > 60) {
          try { name = new URL(l.url).hostname.replace('www.', ''); } catch { name = l.url.substring(0, 40); }
        }
        return { name, url: l.url, type };
      });
    }

    // Apply developments from main page
    if (pageData.devItems.length > 0) {
      result.developments = pageData.devItems;
    }

    // ═══════════════════════════════════
    //  STEP 2: News page
    // ═══════════════════════════════════
    console.log(`    📰 News page...`);
    try {
      await page.goto(`https://messari.io/project/${slug}/news`, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT
      });
      await sleep(4000);

      const newsData = await page.evaluate(() => {
        const results = [];
        
        // Method 1: Find table rows
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tbody tr, tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            
            const firstCell = cells[0];
            const linkEl = firstCell?.querySelector('a');
            const headline = linkEl?.textContent?.trim() || firstCell?.textContent?.trim() || '';
            const url = linkEl?.getAttribute('href') || '';
            
            if (!headline || headline.length < 10 || headline === 'Headline') return;
            
            // Collect asset icons
            const assets = [];
            row.querySelectorAll('img[alt]').forEach(img => {
              const alt = img.getAttribute('alt');
              if (alt && alt.length < 30 && alt.length > 1) assets.push(alt);
            });
            
            const dateText = cells.length > 1 ? cells[1]?.textContent?.trim() : '';
            const source = cells.length > 2 ? cells[2]?.textContent?.trim() : '';
            const category = cells.length > 4 ? cells[4]?.textContent?.trim() : '--';
            const subCategory = cells.length > 5 ? cells[5]?.textContent?.trim() : '--';
            
            results.push({
              headline,
              url: url.startsWith('http') ? url : '',
              date: dateText,
              source,
              category,
              subCategory,
              assets,
              summary: '',
            });
          });
        });
        
        // Method 2: If no tables, try rows/articles
        if (results.length === 0) {
          const articles = document.querySelectorAll('article, [class*="news"], [class*="article"], [class*="row"]');
          articles.forEach(art => {
            const linkEl = art.querySelector('a[href]');
            const headline = linkEl?.textContent?.trim() || art.querySelector('h3, h4, [class*="title"]')?.textContent?.trim() || '';
            if (!headline || headline.length < 10) return;
            
            const url = linkEl?.getAttribute('href') || '';
            const dateEl = art.querySelector('time, [class*="date"]');
            const date = dateEl?.textContent?.trim() || '';
            
            results.push({
              headline,
              url: url.startsWith('http') ? url : '',
              date,
              source: '',
              category: '--',
              subCategory: '--',
              assets: [],
              summary: '',
            });
          });
        }
        
        // Method 3: Find any list items with links
        if (results.length === 0) {
          const links = document.querySelectorAll('a[href^="http"]');
          const newsLinks = [];
          links.forEach(a => {
            const href = a.getAttribute('href') || '';
            const text = a.textContent?.trim() || '';
            if (text.length > 20 && text.length < 200 && !href.includes('messari.io')) {
              const parent = a.closest('div, li, article, tr');
              const dateEl = parent?.querySelector('time, [class*="date"]');
              newsLinks.push({
                headline: text,
                url: href,
                date: dateEl?.textContent?.trim() || '',
                source: '',
                category: '--',
                subCategory: '--',
                assets: [],
                summary: '',
              });
            }
          });
          if (newsLinks.length > 3) {
            results.push(...newsLinks);
          }
        }
        
        return results.slice(0, 50);
      });

      if (newsData.length > 0) {
        result.news = newsData;
      }
    } catch (err) {
      console.log(`    ⚠️ News failed: ${err.message}`);
    }

    // ═══════════════════════════════════
    //  STEP 3: Key Developments page (always visit)
    // ═══════════════════════════════════
    {
      console.log(`    🔧 Developments page...`);
      try {
        await page.goto(`https://messari.io/project/${slug}/key-developments`, {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT
        });
        await sleep(4000);

        const devsData = await page.evaluate(() => {
          const results = [];
          
          // Method 1: Table rows with header-based column mapping
          const tables = document.querySelectorAll('table');
          tables.forEach(table => {
            const headers = table.querySelectorAll('th');
            const headerTexts = Array.from(headers).map(h => h.textContent?.trim().toLowerCase());
            const hMap = {};
            headerTexts.forEach((h, i) => { if (h) hMap[h] = i; });
            const headlineIdx = hMap['event'] ?? hMap['headline'] ?? hMap['development'] ?? 0;
            const importanceIdx = hMap['importance'] ?? -1;
            const statusIdx = hMap['status'] ?? -1;
            const categoryIdx = hMap['category'] ?? -1;
            const subcategoryIdx = hMap['sub-category'] ?? hMap['subcategory'] ?? -1;
            const dateIdx = hMap['date'] ?? -1;
            
            const rows = table.querySelectorAll('tbody tr, tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length < 2) return;
              
              const headline = cells[headlineIdx]?.textContent?.trim();
              if (!headline || headline.length < 5 || headline === 'Headline' || headline === 'Event') return;
              
              const link = cells[headlineIdx]?.querySelector('a')?.getAttribute('href') || '';
              const importance = importanceIdx >= 0 ? cells[importanceIdx]?.textContent?.trim() : '';
              const status = statusIdx >= 0 ? cells[statusIdx]?.textContent?.trim() : '';
              const category = categoryIdx >= 0 ? cells[categoryIdx]?.textContent?.trim() : '';
              const subCategory = subcategoryIdx >= 0 ? cells[subcategoryIdx]?.textContent?.trim() : '';
              const date = dateIdx >= 0 ? cells[dateIdx]?.textContent?.trim() : '';
              
              results.push({ headline, importance, status, date, category, subCategory, url: link, details: '' });
            });
          });
          
          // Method 2: Any structured list (fallback)
          if (results.length === 0) {
            const items = document.querySelectorAll('[class*="event"], [class*="development"], [class*="row"], article');
            items.forEach(item => {
              const text = item.innerText?.trim() || '';
              if (text.length < 10 || text.length > 500) return;
              const parts = text.split('\n').map(s => s.trim()).filter(s => s);
              if (parts.length >= 2) {
                const linkEl = item.querySelector('a');
                results.push({
                  headline: parts[0],
                  importance: '',
                  status: '',
                  date: '',
                  category: parts.length > 2 ? parts[2] : '',
                  subCategory: parts.length > 3 ? parts[3] : '',
                  url: linkEl?.getAttribute('href') || '',
                  details: '',
                });
              }
            });
          }
          
          return results;
        });

        if (devsData.length > 0) {
          result.developments = devsData;
        }
      } catch (err) {
        console.log(`    ⚠️ Developments failed: ${err.message}`);
      }
    }

  } catch (err) {
    console.log(`    ❌ Error: ${err.message}`);
  } finally {
    await page.close();
  }

  return result;
}

// Browser-side sidebar parser (injected into page.evaluate)
// has to be a string for serialization
function parseSidebarText_browser(text) {
  const result = {
    overview: '', sector: '', sectorRank: '', subSector: '', subSectorRank: '',
    contracts: [], messariApiId: '',
  };
  if (!text) return result;
  const sectorIdx = text.indexOf('\nSector');
  if (sectorIdx > 0) {
    result.overview = text.substring(0, sectorIdx).trim();
    const struct = text.substring(sectorIdx + 1);
    const sm = struct.match(/^Sector([A-Za-z0-9\s\-\/&]+?)(?=Sector Rank|Sub-Sector|Contracts|API ID)/);
    if (sm) result.sector = sm[1].trim();
    const srm = struct.match(/Sector Rank([#\d,\s\/na]+?)(?=Sub-Sector|Contracts|API ID|Content)/);
    if (srm) result.sectorRank = srm[1].trim().split(',')[0].trim();
    const ssm = struct.match(/Sub-Sector([A-Za-z0-9\s\-\/&\.]+?)(?=Sub-Sector Rank|Contracts|API ID|Content)/);
    if (ssm) result.subSector = ssm[1].trim();
    const ssrm = struct.match(/Sub-Sector Rank([#\d,\s\/na]+?)(?=Contracts|API ID|Content)/);
    if (ssrm) result.subSectorRank = ssrm[1].trim().split(',')[0].trim();
    const cm = struct.match(/Contracts((?:0x[a-fA-F0-9.]+[\s,]*)+)/);
    if (cm) {
      const addrs = cm[1].match(/0x[a-fA-F0-9.]+/g) || [];
      addrs.forEach(a => result.contracts.push({ address: a, network: 'Ethereum', networkSlug: 'ethereum' }));
    }
    const aim = struct.match(/API ID([a-f0-9\-\.]+)/);
    if (aim) result.messariApiId = aim[1];
  }
  return result;
}

// ══════════════════════════════════════
//  MAIN
// ══════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Messari.io Crawler v2 (Optimized)');
  console.log('═══════════════════════════════════════\n');

  const markets = JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf8'));
  const top = markets.slice(0, TOP_N);
  console.log(`📊 Top ${top.length} coins loaded`);

  const existing = loadExisting();
  console.log(`📦 Existing: ${Object.keys(existing).length} projects\n`);

  const toCrawl = [];
  for (let i = START_INDEX; i < Math.min(top.length, START_INDEX + LIMIT); i++) {
    const coin = top[i];
    const slug = toMessariSlug(coin);
    const ex = existing[coin.id];
    
    if (!FORCE && ex) {
      // Skip if we have good data already (sector parsed + real FAQs)
      const hasSector = ex.sector && ex.sector.length > 1;
      const hasOverview = ex.overview && ex.overview.length > 20;
      const hasRealFaqs = ex.faqs?.length > 0 && !ex.faqs[0]?.question?.includes('About & Links');
      if (hasSector && hasOverview && hasRealFaqs) continue;
    }
    
    toCrawl.push({ index: i, coin, slug });
  }

  console.log(`🔍 To crawl: ${toCrawl.length} (skipping ${Math.min(top.length, START_INDEX + LIMIT) - START_INDEX - toCrawl.length} good)\n`);

  if (toCrawl.length === 0) {
    console.log('✅ All coins have good Messari data!');
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-gpu', '--window-size=1920,1080'],
  });

  let newCount = 0, failCount = 0;
  const startTime = Date.now();

  for (let idx = 0; idx < toCrawl.length; idx++) {
    const { index, coin, slug } = toCrawl[idx];
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    const rate = idx > 0 ? (idx / ((Date.now() - startTime) / 60000)).toFixed(1) : '?';
    const remaining = idx > 0 ? ((toCrawl.length - idx) / (idx / ((Date.now() - startTime) / 60000))).toFixed(0) : '?';

    console.log(`  [${idx + 1}/${toCrawl.length}] #${index + 1} ${coin.id} → ${slug} (${elapsed}m, ${rate}/min, ~${remaining}m left)`);

    let success = false;
    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      try {
        const data = await crawlProject(browser, slug, coin.id, coin.symbol?.toUpperCase(), coin.name);

        const hasData = (data.overview?.length > 20) || (data.faqs?.length > 0) ||
                       (data.news?.length > 0) || (data.sector?.length > 0) ||
                       (data.links?.length > 0) || (data.contract_addresses?.length > 0);

        if (hasData) {
          // Merge: preserve old data, overlay new
          const old = existing[coin.id] || {};
          existing[coin.id] = {
            ...old,
            ...data,
            // Preserve rich old data if new is empty
            overview: data.overview || old.overview || '',
            faqs: data.faqs?.length > 0 ? data.faqs : (old.faqs || []),
            links: data.links?.length > 0 ? data.links : (old.links || []),
            news: data.news?.length > 0 ? data.news : (old.news || []),
            developments: data.developments?.length > 0 ? data.developments : (old.developments || []),
            contract_addresses: data.contract_addresses?.length > 0 ? data.contract_addresses : (old.contract_addresses || []),
            markets: data.markets?.length > 0 ? data.markets : (old.markets || []),
            ohlcv: data.ohlcv?.length > 0 ? data.ohlcv : (old.ohlcv || []),
          };
          newCount++;
          const stats = [
            data.sector ? `sector:${data.sector}` : '',
            data.sectorRank ? `rank:${data.sectorRank}` : '',
            data.subSector ? `sub:${data.subSector}` : '',
            data.overview?.length > 0 ? `overview:${data.overview.length}` : '',
            data.faqs?.length > 0 ? `faqs:${data.faqs.length}` : '',
            data.news?.length > 0 ? `news:${data.news.length}` : '',
            data.developments?.length > 0 ? `devs:${data.developments.length}` : '',
            data.links?.length > 0 ? `links:${data.links.length}` : '',
            data.contract_addresses?.length > 0 ? `contracts:${data.contract_addresses.length}` : '',
            data.founders?.length > 0 ? `founders:${data.founders.length}` : '',
          ].filter(Boolean).join(', ');
          console.log(`    ✅ ${stats || 'minimal data'}`);
          success = true;
          break;
        } else {
          existing[coin.id] = { id: coin.id, messariSlug: slug, name: coin.name, symbol: coin.symbol, noDataOnMessari: true, crawledAt: new Date().toISOString() };
          console.log(`    ⚠️ No data found`);
          success = true;
          break;
        }
      } catch (err) {
        if (retry < MAX_RETRIES) {
          console.log(`    ⚠️ Retry ${retry + 1}: ${err.message}`);
          await sleep(3000);
        } else {
          console.log(`    ❌ Failed: ${err.message}`);
          failCount++;
        }
      }
    }

    if ((idx + 1) % SAVE_EVERY === 0) {
      saveData(existing);
      console.log(`    💾 Saved: ${Object.keys(existing).length} total (${newCount} new)\n`);
    }

    if (idx < toCrawl.length - 1) await sleep(DELAY_BETWEEN_COINS);
  }

  saveData(existing);
  await browser.close();

  console.log('\n═══════════════════════════════════════');
  console.log(`  ✅ Done! ${Object.keys(existing).length} total, ${newCount} new, ${failCount} failed`);
  console.log(`  Time: ${((Date.now() - startTime) / 60000).toFixed(1)} minutes`);
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
