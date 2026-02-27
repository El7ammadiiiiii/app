#!/usr/bin/env node
/**
 * Messari Shared Configuration & Utilities v3
 * 
 * Uses Puppeteer session + in-browser fetch for Cloudflare bypass.
 * RSC payload parsing for structured data extraction.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ── File paths ──
const DATA_DIR = path.join(__dirname, '../public/data');
const MARKETS_FILE = path.join(DATA_DIR, 'coingecko-markets.json');

// ── Concurrency & timing ──
const CONCURRENCY = 10;
const DELAY_BETWEEN_BATCHES = 2000;
const TOP_N = 1000;
const SAVE_EVERY = 25;

// ── CoinGecko ID → Messari slug mappings ──
const ID_MAP = {
  'ripple': 'xrp-ledger', 'binancecoin': 'bnb', 'usd-coin': 'usdc',
  'tether': 'tether', 'staked-ether': 'lido-staked-ether',
  'wrapped-bitcoin': 'wrapped-bitcoin', 'leo-token': 'bitfinex-leo',
  'ethena-usde': 'ethena-usde', 'wrapped-steth': 'wrapped-steth',
  'shiba-inu': 'shiba-inu', 'bitcoin-cash': 'bitcoin-cash',
  'the-open-network': 'toncoin', 'usds': 'sky-dollar', 'stellar': 'stellar',
  'avalanche-2': 'avalanche', 'internet-computer': 'internet-computer',
  'hedera-hashgraph': 'hedera-hashgraph', 'polkadot': 'polkadot',
  'monero': 'monero', 'near': 'near-protocol',
  'polygon-ecosystem-token': 'polygon', 'matic-network': 'polygon',
  'cosmos': 'cosmos', 'ethereum-classic': 'ethereum-classic',
  'render-token': 'render-network', 'okb': 'okb',
  'crypto-com-chain': 'cronos', 'vechain': 'vechain',
  'fetch-ai': 'fetch-ai', 'fantom': 'fantom', 'algorand': 'algorand',
  'immutable-x': 'immutable-x', 'injective-protocol': 'injective',
  'theta-token': 'theta-network', 'the-graph': 'the-graph',
  'flare-networks': 'flare-network', 'lido-dao': 'lido-dao',
  'elrond-erd-2': 'multiversx', 'flow': 'flow',
  'kucoin-shares': 'kucoin', 'gatetoken': 'gatetoken',
  'eos': 'eos', 'decentraland': 'decentraland',
  'the-sandbox': 'the-sandbox', 'arweave': 'arweave',
  'iota': 'iota', 'tezos': 'tezos', 'neo': 'neo', 'kava': 'kava',
  'axie-infinity': 'axie-infinity', 'zcash': 'zcash',
  'terra-luna-2': 'terra', 'maker': 'maker', 'rocket-pool': 'rocket-pool',
  'compound-governance-token': 'compound', 'yearn-finance': 'yearn-finance',
  'curve-dao-token': 'curve-finance', 'synthetix-network-token': 'synthetix',
  'pancakeswap-token': 'pancakeswap', 'sushi': 'sushiswap',
  '1inch': '1inch', 'basic-attention-token': 'basic-attention-token',
  'enjincoin': 'enjin', 'chiliz': 'chiliz', 'zilliqa': 'zilliqa',
  'amp-token': 'amp', 'loopring': 'loopring', 'nem': 'nem',
  'qtum': 'qtum', 'icon': 'icon-project', 'ravencoin': 'ravencoin',
  'harmony': 'harmony', 'ankr': 'ankr', 'celo': 'celo',
  'storj': 'storj', 'ocean-protocol': 'ocean-protocol',
  'band-protocol': 'band-protocol', 'skale': 'skale',
  'woo-network': 'woo-network', 'mask-network': 'mask-network',
  'oasis-network': 'oasis-network', 'nervos-network': 'nervos-network',
  'origintrail': 'origintrail', 'iotex': 'iotex', 'livepeer': 'livepeer',
  'kadena': 'kadena', 'reserve-rights-token': 'reserve',
  'aelf': 'aelf', 'holo': 'holochain', 'ontology': 'ontology',
  'waves': 'waves', 'lisk': 'lisk', 'status': 'status-network',
  'polymath': 'polymath', 'melon': 'enzyme-finance',
  'nexus-mutual': 'nexus-mutual', 'havven': 'synthetix',
  'mantra-dao': 'mantra', 'apecoin': 'apecoin',
  'worldcoin-wld': 'worldcoin', 'pendle': 'pendle',
  'jupiter-exchange-solana': 'jupiter', 'jito-governance-token': 'jito',
  'ethena': 'ethena', 'ondo-finance': 'ondo-finance',
  'celestia': 'celestia', 'pyth-network': 'pyth-network',
  'sei-network': 'sei', 'starknet': 'starknet', 'bittensor': 'bittensor',
  'bonk': 'bonk', 'dogwifcoin': 'dogwifhat', 'floki': 'floki',
  'pepe': 'pepe', 'first-digital-usd': 'first-digital-usd',
  'mantle': 'mantle', 'beam-2': 'beam', 'aave': 'aave',
  'thorchain': 'thorchain', 'gala': 'gala-games', 'helium': 'helium',
  'mina-protocol': 'mina-protocol', 'conflux-token': 'conflux-network',
  'kaspa': 'kaspa', 'wemix-token': 'wemix',
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

function loadMarkets(limit = TOP_N) {
  return JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf8')).slice(0, limit);
}

// ── RSC Parsing ──

function parseRSCChunks(html) {
  const chunks = [];
  const regex = /self\.__next_f\.push\(\[(\d+),"((?:[^"\\]|\\.)*)"\]\)/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (parseInt(m[1]) !== 1) continue;
    chunks.push(m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'));
  }
  return chunks;
}

function extractJSONArray(text, key) {
  const searchKey = `"${key}":[`;
  let idx = text.indexOf(searchKey);
  if (idx < 0) return [];
  idx += searchKey.length - 1;
  let depth = 0, start = idx, inStr = false, escape = false;
  for (let i = idx; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) {
      try { return JSON.parse(text.substring(start, i + 1)); } catch { return []; }
    }}
  }
  return [];
}

// Find ALL occurrences of a JSON array with the given key
function extractAllJSONArrays(text, key) {
  const results = [];
  const searchKey = `"${key}":[`;
  let searchStart = 0;
  while (true) {
    let idx = text.indexOf(searchKey, searchStart);
    if (idx < 0) break;
    idx += searchKey.length - 1;
    let depth = 0, start = idx, inStr = false, escape = false;
    let found = false;
    for (let i = idx; i < text.length; i++) {
      const c = text[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) {
        try {
          const arr = JSON.parse(text.substring(start, i + 1));
          if (arr.length > 0) results.push(arr);
        } catch {}
        searchStart = i + 1;
        found = true;
        break;
      }}
    }
    if (!found) break;
  }
  return results;
}

// Extract a JSON string value by key, handling escapes properly
function extractJSONString(text, key, startFrom = 0) {
  const searchKey = `"${key}":"`;
  let idx = text.indexOf(searchKey, startFrom);
  if (idx < 0) return { value: '', endIdx: -1 };
  const valStart = idx + searchKey.length;
  let escape = false;
  for (let i = valStart; i < text.length; i++) {
    if (escape) { escape = false; continue; }
    if (text[i] === '\\') { escape = true; continue; }
    if (text[i] === '"') {
      const raw = text.substring(valStart, i);
      const value = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        .replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      return { value, endIdx: i };
    }
  }
  return { value: '', endIdx: -1 };
}

function extractJSONObject(text, key) {
  const searchKey = `"${key}":{`;
  let idx = text.indexOf(searchKey);
  if (idx < 0) return null;
  idx += searchKey.length - 1;
  let depth = 0, start = idx, inStr = false, escape = false;
  for (let i = idx; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) {
      try { return JSON.parse(text.substring(start, i + 1)); } catch { return null; }
    }}
  }
  return null;
}

function normalizeRSCDate(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.startsWith('$D')) return dateVal.substring(2).replace(/\\$/, '');
    if (dateVal.startsWith('$')) return '';
    return dateVal;
  }
  if (typeof dateVal === 'number') return new Date(dateVal).toISOString();
  return '';
}

function extractNews(chunks) {
  const allText = chunks.join('\n');
  
  // Try standard "items" array first
  const items = extractJSONArray(allText, 'items');
  if (items.length > 0 && items[0]?.title && items[0]?.url) {
    return items
      .filter(item => item && item.title && item.url && item.url.startsWith('http'))
      .map(item => formatNewsItem(item));
  }

  // RSC format: articles are individual objects with "source":{"id":...}, "title":..., "url":...
  // They appear as consecutive objects in the chunk text. Extract using regex.
  const articles = [];
  // Find all source+title+url patterns
  const regex = /"source":\{"id":"[^"]+","logoUrl":"[^"]*","name":"([^"]+)"\},"title":"((?:[^"\\]|\\.)*)","url":"(https?:\/\/(?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = regex.exec(allText)) !== null) {
    const sourceName = m[1];
    const title = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const url = m[3].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    // Extract description/summary - look backward for "description":"..." before "isVideo"
    const beforePos = Math.max(0, m.index - 5000);
    const beforeText = allText.substring(beforePos, m.index);
    
    let summary = '';
    // Find last "description":" before this article's source
    const descKey = '"description":"';
    let descIdx = beforeText.lastIndexOf(descKey);
    if (descIdx >= 0) {
      const descStart = descIdx + descKey.length;
      // Find the end of this string value
      let esc = false;
      for (let di = descStart; di < beforeText.length; di++) {
        if (esc) { esc = false; continue; }
        if (beforeText[di] === '\\') { esc = true; continue; }
        if (beforeText[di] === '"') {
          const raw = beforeText.substring(descStart, di);
          if (!raw.startsWith('$') && raw.length > 30) {
            summary = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
              .replace(/\\"/g, '"').replace(/\\\\/g, '\\')
              .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
          }
          break;
        }
      }
    }
    
    // Look forward for category, subCategory, sourceType etc
    const afterPos = Math.min(allText.length, m.index + m[0].length + 500);
    const afterText = allText.substring(m.index + m[0].length, afterPos);
    
    let category = '--';
    const catMatch = afterText.match(/"category":"([^"]+)"/);
    if (catMatch && !catMatch[1].startsWith('$')) category = catMatch[1];
    
    let subCategory = '--';
    const subCatMatch = afterText.match(/"subCategory":"([^"]+)"/);
    if (subCatMatch && !subCatMatch[1].startsWith('$')) subCategory = subCatMatch[1];
    
    let ogImageUrl = '';
    const ogMatch = afterText.match(/"ogImageUrl":"(https?:\/\/[^"]+)"/);
    if (ogMatch) ogImageUrl = ogMatch[1];
    
    let sourceType = '';
    const stMatch = afterText.match(/"sourceType":"([^"]+)"/);
    if (stMatch) sourceType = stMatch[1];

    let isPriceAnalysis = false;
    if (afterText.includes('"isPriceAnalysis":true')) isPriceAnalysis = true;
    
    // Extract assets array if present nearby
    let assets = [];
    const assetsMatch = afterText.match(/"assets":\[([^\]]*)\]/);
    if (assetsMatch && assetsMatch[1]) {
      try {
        assets = JSON.parse('[' + assetsMatch[1] + ']')
          .filter(a => typeof a === 'object' && a.name)
          .map(a => ({ id: a.id, name: a.name, slug: a.slug, symbol: a.symbol }));
      } catch {}
    }

    articles.push({
      headline: title,
      url,
      date: '', // Date comes from publishTimeMillis in API or page context
      source: sourceName,
      sourceLogo: '',
      category,
      subCategory,
      summary,
      assets,
      ogImageUrl,
      contentType: '',
      sourceType,
      isPriceAnalysis,
    });
  }

  // Try to extract dates from the "feed" query context with beforeDate
  const dateMatch = allText.match(/"beforeDate":"(?:\$D)?(\d{4}-\d{2}-\d{2}[^"]+)"/);
  const feedDate = dateMatch ? dateMatch[1] : '';
  
  // If no explicit dates, assign approximate dates based on position/order
  if (articles.length > 0 && feedDate) {
    const baseDate = new Date(feedDate);
    articles.forEach((a, i) => {
      if (!a.date) {
        // Approximate: most recent first, ~4 hours apart
        const approxDate = new Date(baseDate.getTime() - i * 4 * 3600000);
        a.date = approxDate.toISOString();
      }
    });
  }

  return articles;
}

function formatNewsItem(item) {
  return {
    headline: item.title || '',
    url: item.url || '',
    date: normalizeRSCDate(item.date),
    source: typeof item.source === 'object'
      ? (item.source?.name || item.source?.sourceName || '') : (item.source || ''),
    sourceLogo: item.source?.logoUrl || '',
    category: (item.category && !String(item.category).startsWith('$')) ? item.category : '--',
    subCategory: (item.subCategory && !String(item.subCategory).startsWith('$'))
      ? item.subCategory
      : (item.subcategory && !String(item.subcategory).startsWith?.('$')) ? item.subcategory : '--',
    summary: (!item.description || String(item.description).startsWith('$'))
      ? '' : item.description,
    assets: (item.assets || [])
      .filter(a => typeof a === 'object' && a.name)
      .map(a => ({ id: a.id, name: a.name, slug: a.slug, symbol: a.symbol })),
    ogImageUrl: (!item.ogImageUrl || String(item.ogImageUrl).startsWith('$')) ? '' : item.ogImageUrl,
    contentType: item.contentType || '',
    sourceType: item.sourceType || '',
    isPriceAnalysis: !!item.isPriceAnalysis,
  };
}

/**
 * Extract FAQs from RSC text. The FAQs array has items like:
 * {"answer":"$c4","id":"uuid","question":"What is Bitcoin?"}
 * or {"answer":"actual text...","id":"uuid","question":"..."}
 * We extract individual FAQ objects using regex to handle $-references gracefully.
 */
function extractFAQs(chunks) {
  const allText = chunks.join('\n');
  const faqs = [];
  
  // Pattern: {"answer":"...","id":"uuid","question":"..."}
  // Also handles: {"question":"...","answer":"...","id":"..."}
  const regex = /\{"(?:answer|question)":/g;
  let m;
  while ((m = regex.exec(allText)) !== null) {
    const start = m.index;
    let depth = 0, inStr = false, esc = false;
    let end = -1;
    for (let i = start; i < Math.min(allText.length, start + 8000); i++) {
      const c = allText[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    try {
      const obj = JSON.parse(allText.substring(start, end + 1));
      if (obj.question && obj.id) {
        const answer = (obj.answer && !String(obj.answer).startsWith('$')) ? obj.answer : '';
        faqs.push({ question: obj.question, answer, id: obj.id });
      }
    } catch {}
  }
  
  // Deduplicate by question
  const seen = new Set();
  return faqs.filter(f => {
    if (seen.has(f.question)) return false;
    seen.add(f.question);
    return true;
  });
}

function extractProfile(chunks) {
  const allText = chunks.join('\n');
  
  // Extract FAQs separately (handles $-references)
  const faqs = extractFAQs(chunks);
  
  // Try "project" object first (RSC format)
  const project = extractJSONObject(allText, 'project');
  if (project && project.name) {
    return {
      entityId: project.id || '',
      name: project.name || '',
      slug: project.slug || '',
      overview: '',
      background: '',
      type: project.type || 'project',
      sectors_v2: project.sectorsV2 || [],
      sub_sectors_v2: project.subSectorsV2 || [],
      sector: (project.sectorsV2 || [])[0] || '',
      subSector: (project.subSectorsV2 || [])[0] || '',
      logoUrl: project.logoUrl || '',
      faqs,
      links: [],
      primaryAsset: project.primaryAsset || null,
      coverage: project.coverage || null,
      pageViews: project.pageViews || 0,
    };
  }

  // Fallback: try "entity" object
  const entity = extractJSONObject(allText, 'entity');
  if (entity && (entity.name || entity.slug)) {
    return {
      entityId: entity.id || '',
      name: entity.name || entity.slug || '',
      slug: entity.slug || '',
      overview: (!entity.overview || String(entity.overview).startsWith('$')) ? '' : entity.overview,
      background: (!entity.background || String(entity.background).startsWith('$')) ? '' : entity.background,
      type: entity.type || 'project',
      sectors_v2: entity.sectorsV2 || [],
      sub_sectors_v2: entity.subSectorsV2 || [],
      sector: (entity.sectorsV2 || [])[0] || '',
      subSector: (entity.subSectorsV2 || [])[0] || '',
      logoUrl: entity.logoUrl || '',
      faqs: faqs.length > 0 ? faqs : (entity.faqs || []).filter(f => f.question).map(f => ({
        question: f.question,
        answer: (!f.answer || String(f.answer).startsWith('$')) ? '' : f.answer,
      })),
      links: (entity.links || []).map(l => ({
        name: l.name || '', url: l.link || l.url || '', type: l.type || 'Other',
      })),
      primaryAsset: entity.primaryAsset || null,
      coverage: entity.coverage || null,
      pageViews: entity.pageViews || 0,
    };
  }

  return null;
}

function extractDevelopments(chunks) {
  const allText = chunks.join('\n');
  
  // Try ALL "events" arrays and pick the one with development-like items
  let items = [];
  const allEventsArrays = extractAllJSONArrays(allText, 'events');
  for (const arr of allEventsArrays) {
    if (arr.length > 0 && arr[0] && (arr[0].category || arr[0].eventDate || arr[0].urgency)) {
      items = arr;
      break;
    }
  }
  
  // Fallback: try ALL "items" arrays
  if (items.length === 0) {
    const allItemsArrays = extractAllJSONArrays(allText, 'items');
    for (const arr of allItemsArrays) {
      if (arr.length > 0 && arr[0] && (arr[0].category || arr[0].eventDate || arr[0].urgency)) {
        items = arr;
        break;
      }
    }
  }
  
  // Last resort: regex extraction for individual event objects  
  if (items.length === 0) {
    // Try various patterns that might match event objects
    const patterns = [
      /\{"category":"[^"]+","eventDate":\d+/g,
      /\{"eventDate":\d+,"[^"]+"/g,
    ];
    for (const regex of patterns) {
      let m;
      while ((m = regex.exec(allText)) !== null) {
        const start = m.index;
        let depth = 0, inStr = false, esc = false;
        for (let i = start; i < Math.min(allText.length, start + 10000); i++) {
          const c = allText[i];
          if (esc) { esc = false; continue; }
          if (c === '\\') { esc = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) {
            try {
              items.push(JSON.parse(allText.substring(start, i + 1)));
            } catch {}
            break;
          }}
        }
      }
      if (items.length > 0) break;
    }
  }
  
  return items
    .filter(item => item && (item.headline || item.title || item.eventType || item.category))
    .map(item => {
      // eventDate can be a unix timestamp (seconds)
      let eventDate = item.eventDate;
      if (typeof eventDate === 'number' && eventDate > 1000000000 && eventDate < 2000000000) {
        eventDate = new Date(eventDate * 1000).toISOString();
      } else {
        eventDate = normalizeRSCDate(eventDate);
      }
      
      return {
        headline: item.headline || item.title || item.category || '',
        date: normalizeRSCDate(item.date || item.timestamp) || eventDate,
        eventDate,
        lastUpdated: normalizeRSCDate(item.lastUpdated || item.modifiedAt || item.timestamp),
        category: (item.category && !String(item.category).startsWith?.('$')) ? item.category : (item.eventType || ''),
        subCategory: (item.subCategory && !String(item.subCategory).startsWith?.('$')) ? item.subCategory : '',
        status: item.status || '',
        urgency: item.urgency || '',
        impact: item.impact || '',
        importance: item.importance || '',
        priority: item.priority || 0,
        details: item.details || item.description || '',
        url: item.url || '',
        globalEvent: !!item.globalEvent,
        primaryAssets: (item.primaryAssets || []).map(a => ({ id: a.id, name: a.name, slug: a.slug, symbol: a.symbol })),
      };
    });
}

function extractOHLCV(chunks) {
  const allText = chunks.join('\n');
  const points = extractJSONArray(allText, 'points');
  if (points.length > 0 && Array.isArray(points[0])) {
    return points.map(p => ({
      time: new Date(p[0] * 1000).toISOString(),
      open: p[1], high: p[2], low: p[3], close: p[4], volume: p[5],
    }));
  }
  return [];
}

// ── Browser Session ──

async function createSession(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser;
    try {
      if (attempt > 1) {
        const wait = attempt * 30;
        console.log(`  ⏳ Retry ${attempt}/${maxRetries} — waiting ${wait}s before next attempt...`);
        await sleep(wait * 1000);
      }
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled',
               '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080'],
      });
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      await page.setRequestInterception(true);
      page.on('request', req => {
        const type = req.resourceType();
        if (['image', 'font', 'media'].includes(type)) req.abort();
        else req.continue();
      });
      
      console.log(`  🌐 Establishing Cloudflare session... (attempt ${attempt}/${maxRetries})`);
      await page.goto('https://messari.io/project/bitcoin', { waitUntil: 'networkidle2', timeout: 120000 });
      await sleep(3000);
      const title = await page.title();
      if (!title.includes('Bitcoin')) throw new Error('Cloudflare blocking - page title: ' + title);
      console.log('  ✅ Session established\n');
      return { browser, page };
    } catch (err) {
      console.log(`  ⚠️ Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (browser) try { await browser.close(); } catch (_) {}
      if (attempt === maxRetries) throw new Error(`Session failed after ${maxRetries} attempts: ${err.message}`);
    }
  }
}

async function fetchPage(page, urlPath) {
  return page.evaluate(async (path) => {
    try {
      const resp = await fetch(path);
      if (!resp.ok) return { status: resp.status, html: '' };
      return { status: resp.status, html: await resp.text() };
    } catch (e) {
      return { status: 0, html: '', error: e.message };
    }
  }, urlPath);
}

async function fetchBatch(page, urlPaths) {
  return page.evaluate(async (paths) => {
    return Promise.all(paths.map(async ({ slug, path }) => {
      try {
        const resp = await fetch(path);
        const html = resp.ok ? await resp.text() : '';
        return { slug, status: resp.status, html };
      } catch (e) {
        return { slug, status: 0, html: '', error: e.message };
      }
    }));
  }, urlPaths);
}

// ── CLI ──

function parseArgs() {
  const args = process.argv.slice(2);
  let start = 0, limit = TOP_N, force = false, output = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1]);
    if (args[i] === '--output' && args[i + 1]) output = args[i + 1];
    if (args[i] === '--force') force = true;
  }
  return { start, limit, force, output };
}

// ── CoinGecko Demo API Key ──
const CG_DEMO_KEY = process.env.CG_DEMO_KEY || '';
const CG_BASE_URL = 'https://api.coingecko.com/api/v3';
const CG_DELAY = CG_DEMO_KEY ? 2200 : 12000; // 2.2s with key, 12s without

async function cgFetch(urlPath, retries = 5) {
  const url = `${CG_BASE_URL}${urlPath}`;
  const headers = { 'Accept': 'application/json' };
  if (CG_DEMO_KEY) headers['x-cg-demo-api-key'] = CG_DEMO_KEY;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 429) {
        const wait = 60 + attempt * 30;
        console.log(`  \u23f3 Rate limited, waiting ${wait}s (attempt ${attempt})...`);
        await sleep(wait * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log(`  \u23f0 Timeout (attempt ${attempt}/${retries})`);
      } else {
        console.log(`  \u26a0 Retry ${attempt}/${retries}: ${e.message}`);
      }
      if (attempt === retries) throw e;
      await sleep(10000 * attempt);
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function progressBar(current, total, label = '') {
  const pct = ((current / total) * 100).toFixed(1);
  const filled = Math.floor(current / total * 30);
  const bar = '█'.repeat(filled) + '░'.repeat(30 - filled);
  return `[${bar}] ${pct}% ${label}`;
}

module.exports = {
  DATA_DIR, MARKETS_FILE, CONCURRENCY, DELAY_BETWEEN_BATCHES, TOP_N, SAVE_EVERY,
  ID_MAP, SYMBOL_OVERRIDES, toMessariSlug, loadMarkets,
  parseRSCChunks, extractJSONArray, extractAllJSONArrays, extractJSONObject, extractJSONString,
  extractNews, extractProfile, extractDevelopments, extractOHLCV, extractFAQs,
  normalizeRSCDate,
  createSession, fetchPage, fetchBatch,
  parseArgs, sleep, progressBar,
  CG_DEMO_KEY, CG_BASE_URL, CG_DELAY, cgFetch,
};
