#!/usr/bin/env node
/**
 * Test Messari HTTP-Direct Fetch
 * 
 * Validates that we can fetch RSC payloads and API data
 * from Messari without Puppeteer. Tests with Bitcoin.
 */

const { getHeaders, getRSCHeaders, parseRSCPayload, extractNewsFromRSC, extractProfileFromRSC, sleep } = require('./messari-config');

const TESTS = {
  passed: 0,
  failed: 0,
  results: [],
};

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

function assert(name, condition, details = '') {
  if (condition) {
    TESTS.passed++;
    TESTS.results.push({ name, status: 'PASS' });
    log('✅', name);
  } else {
    TESTS.failed++;
    TESTS.results.push({ name, status: 'FAIL', details });
    log('❌', `${name} — ${details}`);
  }
}

async function testMainPage() {
  console.log('\n═══ Test 1: Main Project Page (HTML) ═══');
  try {
    const url = 'https://messari.io/project/bitcoin';
    const resp = await fetch(url, { headers: getHeaders() });
    assert('Main page HTTP status', resp.ok, `Status: ${resp.status}`);
    
    const html = await resp.text();
    assert('HTML received', html.length > 1000, `Length: ${html.length}`);
    
    const hasRSC = html.includes('self.__next_f.push');
    assert('RSC payloads present', hasRSC);
    
    if (hasRSC) {
      const objects = parseRSCPayload(html);
      assert('RSC objects parsed', objects.length > 0, `Found ${objects.length} objects`);
      
      const profile = extractProfileFromRSC(objects);
      assert('Profile extracted', profile !== null);
      if (profile) {
        assert('Profile has name', profile.name === 'Bitcoin', `Got: ${profile.name}`);
        assert('Profile has overview', (profile.overview?.length || 0) > 20, `Length: ${profile.overview?.length}`);
        assert('Profile has sectors', profile.sectors_v2?.length > 0, `Got: ${JSON.stringify(profile.sectors_v2)}`);
        assert('Profile has FAQs', profile.faqs?.length > 0, `Count: ${profile.faqs?.length}`);
        assert('Profile has links', profile.links?.length > 0, `Count: ${profile.links?.length}`);
        log('📝', `Overview: ${profile.overview?.substring(0, 100)}...`);
        log('📝', `Sectors: ${profile.sectors_v2?.join(', ')}`);
        log('📝', `SubSectors: ${profile.sub_sectors_v2?.join(', ')}`);
        log('📝', `FAQs: ${profile.faqs?.length} items`);
        log('📝', `Links: ${profile.links?.length} items`);
      }
    }
  } catch (err) {
    assert('Main page fetch', false, err.message);
  }
}

async function testNewsPage() {
  console.log('\n═══ Test 2: News Page (RSC) ═══');
  try {
    const url = 'https://messari.io/project/bitcoin/news';
    const resp = await fetch(url, { headers: getHeaders() });
    assert('News page HTTP status', resp.ok, `Status: ${resp.status}`);
    
    const html = await resp.text();
    const objects = parseRSCPayload(html);
    assert('RSC objects from news page', objects.length > 0, `Found ${objects.length}`);
    
    const news = extractNewsFromRSC(objects);
    assert('News items extracted', news.length > 0, `Found ${news.length} items`);
    
    if (news.length > 0) {
      const first = news[0];
      assert('News has headline', !!first.headline, first.headline?.substring(0, 60));
      assert('News has URL', first.url?.startsWith('http'), first.url);
      assert('News has ISO date', first.date?.includes('T') || first.date?.includes('-'), first.date);
      assert('News has source', !!first.source, first.source);
      assert('News has summary', (first.summary?.length || 0) > 10, `Length: ${first.summary?.length}`);
      assert('News has assets', first.assets?.length > 0, `Count: ${first.assets?.length}`);
      
      log('📝', `First: "${first.headline?.substring(0, 60)}"`);
      log('📝', `Date: ${first.date}`);
      log('📝', `Source: ${first.source}`);
      log('📝', `Summary: ${first.summary?.substring(0, 80)}...`);
      log('📝', `Assets: ${JSON.stringify(first.assets?.slice(0, 3))}`);
    }
  } catch (err) {
    assert('News page fetch', false, err.message);
  }
}

async function testKeyDevPage() {
  console.log('\n═══ Test 3: Key Developments Page (RSC) ═══');
  try {
    const url = 'https://messari.io/project/bitcoin/key-developments';
    const resp = await fetch(url, { headers: getHeaders() });
    assert('Devs page HTTP status', resp.ok, `Status: ${resp.status}`);
    
    const html = await resp.text();
    assert('HTML received', html.length > 500, `Length: ${html.length}`);
    
    const objects = parseRSCPayload(html);
    log('📝', `RSC objects: ${objects.length}`);
    
    // Key developments might use a different data structure
    // Search for development-related data in the RSC payload
    let devItems = [];
    for (const obj of objects) {
      const str = JSON.stringify(obj);
      if (str.includes('urgency') || str.includes('eventType') || str.includes('key-development') ||
          str.includes('status') || str.includes('headline')) {
        // Found potential dev-related data
        if (obj?.state?.data?.pages) {
          for (const page of obj.state.data.pages) {
            if (page?.items) devItems.push(...page.items);
          }
        }
        if (obj?.items) devItems.push(...obj.items);
        if (obj?.queries) {
          for (const q of obj.queries) {
            if (q?.state?.data?.pages) {
              for (const page of q.state.data.pages) {
                if (page?.items) devItems.push(...page.items);
              }
            }
            if (q?.state?.data?.items) devItems.push(...q.state.data.items);
          }
        }
      }
    }
    
    assert('Dev items found', devItems.length > 0, `Found ${devItems.length}`);
    if (devItems.length > 0) {
      const first = devItems[0];
      log('📝', `First dev item keys: ${Object.keys(first).join(', ')}`);
      log('📝', `First dev: ${JSON.stringify(first).substring(0, 300)}`);
    } else {
      // Dump all object keys for debugging
      log('🔍', 'No dev items found. Dumping RSC object summaries:');
      for (let i = 0; i < Math.min(objects.length, 5); i++) {
        const str = JSON.stringify(objects[i]);
        log('📝', `  Object ${i}: keys=${Object.keys(objects[i]).join(',')} len=${str.length}`);
        if (str.length < 500) log('📝', `  Value: ${str}`);
      }
    }
  } catch (err) {
    assert('Devs page fetch', false, err.message);
  }
}

async function testNewsAPI() {
  console.log('\n═══ Test 4: News API Direct ═══');
  try {
    // Try the screener API to get project data including news
    const url = 'https://api.messari.io/screener/v2/project_coverage/results?slugs=bitcoin&fields=name,slug,type,links,overview,background,faqs,sectorsV2,subSectorsV2,logoUrl';
    const resp = await fetch(url, {
      headers: {
        ...getHeaders(),
        'Accept': 'application/json',
      }
    });
    
    if (resp.ok) {
      const json = await resp.json();
      assert('Screener API works', true);
      log('📝', `Response keys: ${Object.keys(json).join(', ')}`);
      log('📝', `Data: ${JSON.stringify(json).substring(0, 500)}`);
    } else {
      log('⚠️', `Screener API status: ${resp.status} ${resp.statusText}`);
      // Try alternative: direct news article API
      const articleUrl = 'https://api.messari.io/news-web/v1/news/articles?limit=5&slugs=bitcoin';
      const resp2 = await fetch(articleUrl, {
        headers: { ...getHeaders(), 'Accept': 'application/json' }
      });
      if (resp2.ok) {
        const json2 = await resp2.json();
        assert('News article API works', true);
        log('📝', `Response: ${JSON.stringify(json2).substring(0, 500)}`);
      } else {
        log('⚠️', `News API status: ${resp2.status}`);
      }
    }
  } catch (err) {
    log('⚠️', `API test error: ${err.message}`);
  }
}

async function testRSCFlight() {
  console.log('\n═══ Test 5: RSC Flight Request ═══');
  try {
    // Try fetching with RSC headers (flight data, more compact)
    const url = 'https://messari.io/project/bitcoin/news';
    const resp = await fetch(url, { headers: getRSCHeaders() });
    assert('RSC flight status', resp.ok, `Status: ${resp.status}`);
    
    const text = await resp.text();
    assert('RSC flight has data', text.length > 100, `Length: ${text.length}`);
    
    // RSC flight data is typically line-separated chunks
    const lines = text.split('\n').filter(l => l.trim());
    log('📝', `Flight lines: ${lines.length}`);
    
    // Check if it contains JSON data directly
    let foundData = false;
    for (const line of lines) {
      if (line.includes('"title"') && line.includes('"url"')) {
        foundData = true;
        break;
      }
    }
    assert('Flight data contains news', foundData);
    
    if (lines.length > 0) {
      log('📝', `First line: ${lines[0].substring(0, 200)}`);
      log('📝', `Last line: ${lines[lines.length - 1].substring(0, 200)}`);
    }
  } catch (err) {
    assert('RSC flight request', false, err.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Messari HTTP-Direct Fetch Test');
  console.log('═══════════════════════════════════════');
  
  await testMainPage();
  await sleep(1000);
  await testNewsPage();
  await sleep(1000);
  await testKeyDevPage();
  await sleep(1000);
  await testNewsAPI();
  await sleep(1000);
  await testRSCFlight();
  
  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${TESTS.passed} passed, ${TESTS.failed} failed`);
  console.log('═══════════════════════════════════════');
  
  if (TESTS.failed > 0) {
    console.log('\n⚠️ Some tests failed. Check if:');
    console.log('   1. Messari rate limiting (try again in 1 min)');
    console.log('   2. Cloudflare blocking (may need cookies from Puppeteer)');
    console.log('   3. RSC format changed (update parseRSCPayload)');
  }
}

main().catch(console.error);
