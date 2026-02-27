#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.goto('https://messari.io/project/bitcoin', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('Session ready');
  
  // Dump raw HTML from news page to file for analysis
  const html = await page.evaluate(async () => {
    const resp = await fetch('/project/bitcoin/news');
    return await resp.text();
  });
  
  fs.writeFileSync(path.join(__dirname, 'debug-news.html'), html);
  console.log('Saved debug-news.html, length:', html.length);
  
  // Find the largest self.__next_f.push call
  const pushRegex = /self\.__next_f\.push\(\[(\d+),"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  let largest = { len: 0, type: -1, content: '' };
  let pushCount = 0;
  while ((match = pushRegex.exec(html)) !== null) {
    pushCount++;
    const type = parseInt(match[1]);
    const content = match[2];
    if (content.length > largest.len) {
      largest = { len: content.length, type, content: content.substring(0, 500) };
    }
  }
  console.log('RSC pushes found:', pushCount);
  console.log('Largest push:', largest.len, 'chars, type:', largest.type);
  console.log('Largest push sample:', largest.content);
  
  // Also look for any text containing "title" in the raw HTML (case-sensitive search)
  const titleIdx = html.indexOf('"title"');
  const titleIdx2 = html.indexOf('title');
  const titleIdx3 = html.indexOf('\\u0022title');
  const titleIdx4 = html.indexOf('\\\"title');
  console.log('\nTitle search:');
  console.log('  "title" at:', titleIdx, titleIdx > 0 ? html.substring(titleIdx, titleIdx + 100) : '');
  console.log('  title at:', titleIdx2, titleIdx2 > 0 ? html.substring(titleIdx2, titleIdx2 + 100) : '');
  console.log('  \\u0022title at:', titleIdx3);
  console.log('  \\"title at:', titleIdx4, titleIdx4 > 0 ? html.substring(titleIdx4, titleIdx4 + 100) : '');
  
  await browser.close();
}

main().catch(console.error);
