const fs = require('fs');

(async () => {
  const res = await fetch('https://www.coingecko.com/en/coins/bitcoin', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  console.log('Page size:', html.length);

  // Look for __NEXT_DATA__
  const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  console.log('__NEXT_DATA__:', nextData ? 'FOUND ' + nextData[1].length + ' chars' : 'NOT FOUND');
  
  // Look for JSON scripts
  const jsonScripts = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g);
  console.log('JSON scripts:', jsonScripts ? jsonScripts.length : 0);
  
  // Look for turbo/stimulus
  console.log('Has turbo:', html.includes('turbo'));
  console.log('Has stimulus:', html.includes('stimulus'));
  console.log('Has data-controller:', html.includes('data-controller'));
  
  // Search for data attributes with long values (might contain description)
  const dataValues = html.match(/data-[a-z-]+-value="[^"]{200,}"/g);
  if (dataValues) {
    console.log('\nLong data-value attributes:', dataValues.length);
    for (const dv of dataValues) {
      console.log('  -', dv.slice(0, 150) + '...');
    }
  }
  
  // Search for description-related data  
  const descPatterns = [
    'coin-about',
    'coin_about',
    'coinAbout',
    'description',
    'aboutContent',
    'about_content',
  ];
  for (const p of descPatterns) {
    const idx = html.indexOf(p);
    if (idx > -1) {
      console.log(`\nFound "${p}" at index ${idx}:`);
      console.log(html.slice(idx - 30, idx + 200).replace(/[\n\r]+/g, ' '));
    }
  }
  
  // Save a chunk of the HTML for analysis
  fs.writeFileSync('./cg-sample.txt', html.slice(0, 50000));
  console.log('\nSaved first 50k chars to cg-sample.txt');
  
  // Also search for any long text blocks that look like descriptions
  const longText = html.match(/>[^<]{500,}/g);
  if (longText) {
    console.log('\nLong text blocks (>500 chars):', longText.length);
    for (const t of longText.slice(0, 3)) {
      console.log('  Length:', t.length, '- Preview:', t.slice(1, 200));
    }
  } else {
    console.log('\nNo long text blocks found');
  }
})();
