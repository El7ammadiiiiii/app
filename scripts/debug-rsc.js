const { createSession, fetchPage, parseRSCChunks, extractNews, extractProfile, extractDevelopments, extractAllJSONArrays } = require('./messari-config');

(async () => {
  const { browser, page } = await createSession();
  
  // Test news
  console.log('\n=== Testing News ===');
  const newsResp = await fetchPage(page, '/project/bitcoin/news');
  const newsChunks = parseRSCChunks(newsResp.html);
  const news = extractNews(newsChunks);
  console.log('Articles found:', news.length);
  if (news.length > 0) {
    console.log('First article summary (first 200 chars):', news[0].summary?.substring(0, 200));
    console.log('Sources:', [...new Set(news.map(n => n.source))].join(', '));
    console.log('With summaries:', news.filter(n => n.summary).length);
    console.log('With categories:', news.filter(n => n.category !== '--').length);
    console.log('With assets:', news.filter(n => n.assets?.length > 0).length);
  }

  // Test profile
  console.log('\n=== Testing Profile ===');
  const profResp = await fetchPage(page, '/project/bitcoin');
  const profChunks = parseRSCChunks(profResp.html);
  const profile = extractProfile(profChunks);
  if (profile) {
    console.log('Name:', profile.name);
    console.log('Slug:', profile.slug);
    console.log('Sector:', profile.sector);
    console.log('SubSector:', profile.subSector);
    console.log('Logo:', profile.logoUrl);
    console.log('FAQs:', profile.faqs?.length);
    console.log('Links:', profile.links?.length);
  } else {
    console.log('No profile found');
  }

  // Test developments  
  console.log('\n=== Testing Developments ===');
  const devResp = await fetchPage(page, '/project/bitcoin/key-developments');
  const devChunks = parseRSCChunks(devResp.html);
  
  // Debug: check what arrays exist
  const allText = devChunks.join('\n');
  console.log('Text length:', allText.length);
  
  // Find all occurrences of "events"
  let pos = 0, evtCount = 0;
  while (true) {
    pos = allText.indexOf('"events":[', pos);
    if (pos < 0) break;
    console.log(`  "events":[ at position ${pos}, context: ...${allText.substring(pos, pos + 100)}...`);
    evtCount++;
    pos += 10;
  }
  console.log('Total "events":[ occurrences:', evtCount);
  
  // Try extractAllJSONArrays
  const allEvtArrays = extractAllJSONArrays(allText, 'events');
  console.log('extractAllJSONArrays found', allEvtArrays.length, 'arrays');
  allEvtArrays.forEach((arr, i) => {
    console.log(`  Array ${i}: ${arr.length} items, first keys: ${arr[0] ? Object.keys(arr[0]).join(',') : 'empty'}`);
  });
  
  const devs = extractDevelopments(devChunks);
  console.log('Developments found:', devs.length);
  if (devs.length > 0) {
    console.log('First:', JSON.stringify(devs[0], null, 2));
  }
  
  await browser.close();
})();
