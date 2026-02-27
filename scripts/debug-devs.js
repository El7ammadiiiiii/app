const { createSession, fetchPage, parseRSCChunks, extractDevelopments } = require('./messari-config');
(async () => {
  const { browser, page } = await createSession();
  
  for (const slug of ['solana']) {
    console.log(`\n=== ${slug} ===`);
    
    // Intercept Algolia API calls
    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('algolia') && url.includes('intel_notable_event')) {
        console.log('\n=== ALGOLIA RESPONSE ===');
        console.log('URL:', url.substring(0, 150));
        try {
          const json = await resp.json();
          console.log('Hits:', json.hits?.length || json.results?.[0]?.hits?.length);
          const hits = json.hits || json.results?.[0]?.hits || [];
          if (hits.length > 0) {
            console.log('First hit keys:', Object.keys(hits[0]).join(', '));
            console.log('First hit:', JSON.stringify(hits[0], null, 2).substring(0, 500));
          }
        } catch (e) {
          console.log('Error parsing response:', e.message);
        }
      }
    });
    
    // Also intercept the request to see query params
    page.on('request', req => {
      const url = req.url();
      if (url.includes('algolia') && url.includes('intel_notable_event')) {
        console.log('\n=== ALGOLIA REQUEST ===');
        const postData = req.postData();
        if (postData) {
          try {
            const parsed = JSON.parse(postData);
            console.log('Query:', JSON.stringify(parsed, null, 2).substring(0, 1000));
          } catch {
            console.log('Post data:', postData.substring(0, 500));
          }
        }
      }
    });
    
    // Navigate to page
    await page.goto(`https://messari.io/project/${slug}/key-developments`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000)); // Wait for lazy API calls
  }
  
  await browser.close();
})();
