#!/usr/bin/env node
/**
 * Test full in-browser pipeline: fetch + RSC parse
 */
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  
  console.log('Loading initial page (establishing session)...');
  await page.goto('https://messari.io/project/bitcoin', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('Session established.\n');

  // ── Test 1: Fetch news and extract data ──
  console.log('=== Test 1: Bitcoin news RSC parse ===');
  const t1 = Date.now();
  const newsData = await page.evaluate(async () => {
    const resp = await fetch('/project/bitcoin/news');
    const html = await resp.text();
    
    // Look for title patterns
    const titleMatches = [];
    const re = /"title":"([^"]{15,200})"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const t = m[1];
      if (!t.includes('<!') && !t.includes('Messari') && !t.includes('__next')) {
        titleMatches.push(t);
      }
    }
    
    // Look for source.name patterns 
    const sourceMatches = [];
    const re2 = /"sourceName":"([^"]+)"/g;
    while ((m = re2.exec(html)) !== null) { sourceMatches.push(m[1]); }
    const re2b = /"name":"([^"]{3,30})"/g;
    
    // Look for summary/description
    const descMatches = [];
    const re3 = /"description":"(- [^"]{20,500})"/g;
    while ((m = re3.exec(html)) !== null) { descMatches.push(m[1].substring(0, 100)); }
    
    // Look for date patterns
    const dateMatches = [];
    const re4 = /"\$D(\d{4}-\d{2}-\d{2}T[^"]+)"/g;
    while ((m = re4.exec(html)) !== null) { dateMatches.push(m[1]); }
    
    // Look for publishTimeMillis
    const pTimeMatches = [];
    const re5 = /"publishTimeMillis":(\d+)/g;
    while ((m = re5.exec(html)) !== null) { pTimeMatches.push(Number(m[1])); }
    
    // Look for url patterns in news context
    const urlMatches = [];
    const re6 = /"url":"(https?:\/\/[^"]+)"/g;
    while ((m = re6.exec(html)) !== null) {
      if (!m[1].includes('messari.io') && !m[1].includes('directus.') && !m[1].includes('cdn.')) {
        urlMatches.push(m[1]);
      }
    }

    // Look for assets
    const assetMatches = [];
    const re7 = /"symbol":"([A-Z]{2,10})"/g;
    while ((m = re7.exec(html)) !== null) { assetMatches.push(m[1]); }

    return {
      status: resp.status,
      htmlLen: html.length,
      titles: titleMatches.length,
      firstTitles: titleMatches.slice(0, 5),
      sources: [...new Set(sourceMatches)].slice(0, 10),
      descs: descMatches.length,
      firstDescs: descMatches.slice(0, 2),
      dates: dateMatches.length,
      firstDates: dateMatches.slice(0, 3),
      pTimes: pTimeMatches.length,
      firstPTimes: pTimeMatches.slice(0, 3).map(t => new Date(t).toISOString()),
      urls: urlMatches.length,
      firstUrls: urlMatches.slice(0, 3),
      symbols: [...new Set(assetMatches)].slice(0, 10),
    };
  });
  console.log(`Time: ${Date.now() - t1}ms`);
  console.log(JSON.stringify(newsData, null, 2));

  // ── Test 2: Key developments ──
  console.log('\n=== Test 2: Bitcoin key-developments ===');
  const t2 = Date.now();
  const devsData = await page.evaluate(async () => {
    const resp = await fetch('/project/bitcoin/key-developments');
    const html = await resp.text();
    
    // Check what data patterns exist
    const patterns = {
      urgency: (html.match(/"urgency"/g) || []).length,
      eventType: (html.match(/"eventType"/g) || []).length,
      impact: (html.match(/"impact"/g) || []).length,
      status: (html.match(/"status"/g) || []).length,
      headline: (html.match(/"headline"/g) || []).length,
      eventDate: (html.match(/"eventDate"/g) || []).length,
      timestamp: (html.match(/"timestamp"/g) || []).length,
      priority: (html.match(/"priority"/g) || []).length,
    };
    
    // Find dev item titles
    const titles = [];
    const re = /"headline":"([^"]{10,200})"/g;
    let m;
    while ((m = re.exec(html)) !== null) { titles.push(m[1]); }

    // Find event types
    const eventTypes = [];
    const re2 = /"eventType":"([^"]+)"/g;
    while ((m = re2.exec(html)) !== null) { eventTypes.push(m[1]); }

    return {
      status: resp.status,
      htmlLen: html.length,
      patterns,
      titles: titles.length,
      firstTitles: titles.slice(0, 5),
      eventTypes: [...new Set(eventTypes)].slice(0, 10),
    };
  });
  console.log(`Time: ${Date.now() - t2}ms`);
  console.log(JSON.stringify(devsData, null, 2));

  // ── Test 3: Profile (main page) ──
  console.log('\n=== Test 3: Ethereum profile ===');
  const t3 = Date.now();
  const profileData = await page.evaluate(async () => {
    const resp = await fetch('/project/ethereum');
    const html = await resp.text();
    
    const patterns = {
      overview: (html.match(/"overview"/g) || []).length,
      background: (html.match(/"background"/g) || []).length,
      sectorsV2: (html.match(/"sectorsV2"/g) || []).length,
      subSectorsV2: (html.match(/"subSectorsV2"/g) || []).length,
      faqs: (html.match(/"faqs"/g) || []).length,
      links: (html.match(/"links"/g) || []).length,
      logoUrl: (html.match(/"logoUrl"/g) || []).length,
      ohlcv: (html.match(/"open"/g) || []).length,
      series: (html.match(/"series"/g) || []).length,
      points: (html.match(/"points"/g) || []).length,
    };
    
    // Get overview content
    const overviewMatch = html.match(/"overview":"([^"]{20,500})"/);
    
    // Get sectors
    const sectorsMatch = html.match(/"sectorsV2":\[([^\]]*)\]/);
    
    // Get FAQ count - look for question/answer pairs
    const faqCount = (html.match(/"question":"[^"]+"/g) || []).length;

    return {
      status: resp.status,
      htmlLen: html.length,
      patterns,
      overview: overviewMatch ? overviewMatch[1].substring(0, 100) : null,
      sectors: sectorsMatch ? sectorsMatch[1] : null,
      faqCount,
    };
  });
  console.log(`Time: ${Date.now() - t3}ms`);
  console.log(JSON.stringify(profileData, null, 2));

  // ── Test 4: Speed test - 10 coins simultaneously ──
  console.log('\n=== Test 4: 10 coins parallel ===');
  const slugs = ['solana', 'cardano', 'polkadot', 'chainlink', 'avalanche', 'uniswap', 'cosmos', 'fantom', 'near-protocol', 'stellar'];
  const t4 = Date.now();
  const batchResults = await page.evaluate(async (slugs) => {
    const results = await Promise.all(slugs.map(async slug => {
      try {
        const resp = await fetch('/project/' + slug + '/news');
        const html = await resp.text();
        const titleCount = (html.match(/"title":"[^"]{15,}/g) || []).length;
        return { slug, status: resp.status, len: html.length, titles: titleCount };
      } catch (e) {
        return { slug, error: e.message };
      }
    }));
    return results;
  }, slugs);
  console.log(`Time: ${Date.now() - t4}ms for ${slugs.length} coins`);
  batchResults.forEach(r => console.log(`  ${r.slug}: status=${r.status} len=${r.len} titles=${r.titles}`));

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
