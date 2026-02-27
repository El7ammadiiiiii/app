/**
 * Crawl full About content from CoinGecko for ALL coins using Puppeteer
 * Uses multiple pages in parallel for speed
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const MARKETS_PATH = path.join(__dirname, '..', 'public', 'data', 'coingecko-markets.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'coingecko-about.json');
const CONCURRENCY = 3; // Number of parallel pages
const DELAY_MS = 1500;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Sections to remove (stale price data)
const REMOVE_HEADINGS = [
  'what is the daily trading volume',
  'what is the highest and lowest price',
  'what is the market cap',
  'what is the fully diluted valuation',
  'how does the price performance',
  'where can you buy',
];

function cleanHTML(html) {
  let clean = html
    .replace(/<a[^>]*href="https?:\/\/(www\.)?coingecko\.com[^"]*"[^>]*>(.*?)<\/a>/gi, '$2')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\s{3,}/g, ' ')
    .trim();

  // Remove stale FAQ sections
  for (const heading of REMOVE_HEADINGS) {
    const regex = new RegExp(
      `<h3[^>]*>[^<]*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</h3>[\\s\\S]*?(?=<h[23]|$)`,
      'gi'
    );
    clean = clean.replace(regex, '');
  }

  // Remove CoinGecko/Messari text
  clean = clean.replace(/CoinGecko/gi, '').replace(/Messari/gi, '');
  clean = clean.replace(/<p>\s*<\/p>/g, '').trim();

  return clean;
}

async function extractAbout(page, coinId) {
  try {
    const url = `https://www.coingecko.com/en/coins/${coinId}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);

    // Click Read More buttons
    try {
      const btns = await page.$$('button');
      for (const btn of btns) {
        const txt = await btn.evaluate(el => el.textContent.trim());
        if (txt.toLowerCase().includes('read more')) {
          await btn.click().catch(() => {});
          await sleep(300);
        }
      }
    } catch(e) {}

    const result = await page.evaluate(() => {
      // Method 1: find h2 "About X" or "What is X"
      const h2s = document.querySelectorAll('h2');
      let aboutH2 = null;
      for (const h of h2s) {
        const t = h.textContent.trim().toLowerCase();
        if (t.startsWith('about ') || t.startsWith('what is ') || t.startsWith('what are ')) {
          aboutH2 = h;
          break;
        }
      }

      if (aboutH2) {
        // Collect siblings until next major section
        let html = aboutH2.outerHTML;
        let cur = aboutH2.nextElementSibling;
        while (cur) {
          if (cur.tagName === 'H2') {
            const t = cur.textContent.trim().toLowerCase();
            if (!t.includes('about') && !t.includes('what is') && !t.includes('faq')) break;
          }
          const txt = cur.textContent.trim();
          if (!txt.includes('Do you find the content') && !txt.includes('thumbs_up') && !txt.includes('thumbs_down')) {
            html += cur.outerHTML;
          }
          cur = cur.nextElementSibling;
        }
        return { html, title: aboutH2.textContent.trim() };
      }

      // Method 2: Collect h3-based about content
      const allH3s = document.querySelectorAll('h3');
      const aboutH3s = [];
      for (const h3 of allH3s) {
        const t = h3.textContent.trim().toLowerCase();
        if (t.includes('related coins') || t.includes('trending') || t.includes('privacy') || t.includes('cookie')) continue;
        if (t.startsWith('what is') || t.startsWith('who ') || t.startsWith('how does') || t.startsWith('how do') ||
            t.startsWith('history') || t.includes('purpose') || t.includes('difference between') ||
            t.includes('created') || t.includes('consensus') || t.includes('token') || t.includes('unique') ||
            t.includes('staking') || t.includes('burn') || t.startsWith('what are') || t.includes('about ') ||
            t.includes('team') || t.includes('investors') || t.includes('adoption') || t.includes('roadmap') ||
            t.includes('ecosystem') || t.includes('halving') || t.includes('mining') || t.includes('ledger') ||
            t.includes('use case') || t.includes('launch') || t.includes('proof') || t.includes('validators') ||
            t.includes('is ') || t.includes('can ') || t.includes('faq') || t.includes('utility')) {
          aboutH3s.push(h3);
        }
      }

      if (aboutH3s.length > 0) {
        let html = '';
        for (const h3 of aboutH3s) {
          html += h3.outerHTML;
          let sib = h3.nextElementSibling;
          while (sib) {
            if (sib.tagName === 'H2' || sib.tagName === 'H3') break;
            if (['P','UL','OL','DIV'].includes(sib.tagName)) {
              const t = sib.textContent.trim();
              if (t.length > 5 && !t.includes('Do you find') && !t.includes('thumbs_')) {
                html += sib.outerHTML;
              }
            }
            sib = sib.nextElementSibling;
          }
        }
        return { html, title: aboutH3s[0].textContent.trim() };
      }

      // Method 3: meta description fallback
      const meta = document.querySelector('meta[name="description"]');
      if (meta && meta.content.length > 50) {
        return { html: `<p>${meta.content}</p>`, title: 'About' };
      }

      return { html: '', title: '' };
    });

    if (result.html.length > 50) {
      const cleaned = cleanHTML(result.html);
      return { id: coinId, title: result.title, html: cleaned, charCount: cleaned.length };
    }

    return { id: coinId, title: '', html: '', charCount: 0 };
  } catch (error) {
    console.error(`  ❌ ${coinId}: ${error.message}`);
    return { id: coinId, title: '', html: '', charCount: 0 };
  }
}

async function main() {
  const markets = JSON.parse(fs.readFileSync(MARKETS_PATH, 'utf8'));
  const allIds = markets.map(m => m.id);

  // Load existing data
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')); } catch(e) {}

  // Only crawl coins we don't have yet (or have very short content)
  const toCrawl = allIds.filter(id => !existing[id] || existing[id].html.length < 100);
  console.log(`🚀 Crawling About for ${toCrawl.length} coins (${allIds.length - toCrawl.length} already done)...\n`);

  if (toCrawl.length === 0) {
    console.log('✅ All coins already crawled!');
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
  });

  // Create multiple pages for parallel crawling
  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);
    page.on('request', r => ['image','font','media','stylesheet'].includes(r.resourceType()) ? r.abort() : r.continue());
    pages.push(page);
  }

  let done = 0;
  let success = Object.keys(existing).length;

  // Process in batches
  for (let i = 0; i < toCrawl.length; i += CONCURRENCY) {
    const batch = toCrawl.slice(i, i + CONCURRENCY);
    const promises = batch.map((coinId, idx) => extractAbout(pages[idx], coinId));
    const results = await Promise.all(promises);

    for (const result of results) {
      done++;
      if (result.charCount > 50) {
        existing[result.id] = { title: result.title, html: result.html };
        success++;
        console.log(`  ✅ [${done}/${toCrawl.length}] ${result.id}: ${result.charCount} chars`);
      } else {
        console.log(`  ⚠️ [${done}/${toCrawl.length}] ${result.id}: no content`);
      }
    }

    // Save progress every 15 coins
    if (done % 15 === 0 || done === toCrawl.length) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2), 'utf8');
      console.log(`  💾 Saved progress: ${success} total coins with About data\n`);
    }

    await sleep(DELAY_MS);
  }

  await browser.close();

  // Final save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`\n✅ Done! ${success} coins with About content saved.`);
}

main().catch(console.error);
