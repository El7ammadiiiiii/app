#!/usr/bin/env node
/**
 * Test RSC parsing with proper unescape handling
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function parseRSCFromHTML(html) {
  const chunks = [];
  // Match self.__next_f.push([TYPE, "CONTENT"])
  const regex = /self\.__next_f\.push\(\[(\d+),"((?:[^"\\]|\\.)*)"\]\)/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const type = parseInt(m[1]);
    if (type !== 1) continue;
    // Unescape the payload string
    let raw = m[2]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
    chunks.push(raw);
  }
  return chunks;
}

function extractNewsItems(chunks) {
  const items = [];
  // Concatenate all chunks and search for news item patterns
  const allText = chunks.join('\n');
  
  // Find the items array from fetchProjectCoverageV3
  // Pattern: "items":[{...},{...}]
  const itemsRegex = /"items":\[((?:\{(?:[^{}]|\{[^{}]*\})*\}(?:,\s*)?)+)\]/g;
  let m;
  while ((m = itemsRegex.exec(allText)) !== null) {
    const itemsStr = '[' + m[1] + ']';
    try {
      const arr = JSON.parse(itemsStr);
      for (const item of arr) {
        if (item.title && item.url && item.url.startsWith('http')) {
          items.push(item);
        }
      }
    } catch {
      // Try individual items
      const singleRe = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;
      let sm;
      while ((sm = singleRe.exec(m[1])) !== null) {
        try {
          const item = JSON.parse(sm[0]);
          if (item.title && item.url && item.url.startsWith('http')) {
            items.push(item);
          }
        } catch {}
      }
    }
  }
  return items;
}

function extractProfile(chunks) {
  const allText = chunks.join('\n');
  
  // Find entity with faqs, overview, links
  const entityRegex = /"entity":\{([^}]*"name":"[^"]+")[^]*?"faqs":\[/;
  const em = allText.match(entityRegex);
  if (!em) return null;
  
  // Extract profile fields individually
  const overview = allText.match(/"overview":"((?:[^"\\]|\\.)*)"/)?.[1] || '';
  const name = allText.match(/"entity":\{[^}]*"name":"([^"]+)"/)?.[1] || '';
  const sectorsMatch = allText.match(/"sectorsV2":\[([^\]]*)\]/);
  const sectors = sectorsMatch ? JSON.parse('[' + sectorsMatch[1] + ']') : [];
  const subSectorsMatch = allText.match(/"subSectorsV2":\[([^\]]*)\]/);
  const subSectors = subSectorsMatch ? JSON.parse('[' + subSectorsMatch[1] + ']') : [];
  
  // FAQs
  const faqRegex = /\{"answer":"(?:[^"\\]|\\.)*","id":"[^"]+","question":"(?:[^"\\]|\\.)*"\}/g;
  const faqs = [];
  let fm;
  while ((fm = faqRegex.exec(allText)) !== null) {
    try { faqs.push(JSON.parse(fm[0])); } catch {}
  }
  
  return { name, overview, sectors, subSectors, faqs };
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.goto('https://messari.io/project/bitcoin', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('Session ready\n');

  // ── Test: Fetch and parse news ──
  console.log('=== Parsing bitcoin news ===');
  const newsHtml = await page.evaluate(async () => {
    const resp = await fetch('/project/bitcoin/news');
    return await resp.text();
  });
  
  const chunks = parseRSCFromHTML(newsHtml);
  console.log('RSC chunks:', chunks.length);
  console.log('Largest chunk:', Math.max(...chunks.map(c => c.length)), 'chars');
  
  // Save the largest chunk for inspection
  const largest = chunks.reduce((a, b) => a.length > b.length ? a : b, '');
  fs.writeFileSync(path.join(__dirname, 'debug-largest-chunk.txt'), largest);
  console.log('Saved largest chunk to debug-largest-chunk.txt');
  
  // Search for news patterns in the unescaped chunks
  const allText = chunks.join('\n');
  console.log('\nPattern counts in unescaped RSC:');
  console.log('  "title":', (allText.match(/"title"/g) || []).length);
  console.log('  "url":', (allText.match(/"url"/g) || []).length);
  console.log('  "description":', (allText.match(/"description"/g) || []).length);
  console.log('  "source":', (allText.match(/"source"/g) || []).length);
  console.log('  "category":', (allText.match(/"category"/g) || []).length);
  console.log('  "assets":', (allText.match(/"assets"/g) || []).length);
  console.log('  "items":', (allText.match(/"items"/g) || []).length);
  console.log('  "pages":', (allText.match(/"pages"/g) || []).length);
  console.log('  "$D20', (allText.match(/\$D20/g) || []).length);
  
  // Extract news items
  const newsItems = extractNewsItems(chunks);
  console.log('\nExtracted news items:', newsItems.length);
  if (newsItems.length > 0) {
    const first = newsItems[0];
    console.log('First item keys:', Object.keys(first).join(', '));
    console.log('Title:', first.title?.substring(0, 80));
    console.log('URL:', first.url?.substring(0, 80));
    console.log('Source:', JSON.stringify(first.source));
    console.log('Date:', first.date);
    console.log('Summary:', first.description?.substring(0, 100));
    console.log('Assets:', JSON.stringify(first.assets?.slice(0, 2)));
    console.log('Category:', first.category);
  }
  
  // ── Test: Profile data ──
  console.log('\n=== Parsing profile from same page ===');
  const profile = extractProfile(chunks);
  if (profile) {
    console.log('Name:', profile.name);
    console.log('Overview:', profile.overview?.substring(0, 100));
    console.log('Sectors:', profile.sectors);
    console.log('SubSectors:', profile.subSectors);
    console.log('FAQs:', profile.faqs?.length);
    if (profile.faqs?.[0]) console.log('First FAQ:', profile.faqs[0].question);
  } else {
    console.log('Profile not found via entity regex');
    // Try broader search
    const overviewMatch = allText.match(/"overview":"((?:[^"\\]|\\.)*)"/);
    console.log('Overview found:', !!overviewMatch, overviewMatch?.[1]?.substring(0, 80));
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
