#!/usr/bin/env node
const { createSession, fetchPage, parseRSCChunks, extractOHLCV, extractProfile, extractFAQs, extractJSONArray, extractJSONObject, extractAllJSONArrays } = require('./messari-config');

(async () => {
  const { browser, page } = await createSession();
  
  // Test Bitcoin
  const resp = await fetchPage(page, '/project/bitcoin');
  console.log('Status:', resp.status, 'HTML length:', resp.html?.length);
  
  const chunks = parseRSCChunks(resp.html);
  console.log('Chunks:', chunks.length);
  
  // Debug FAQs
  console.log('\n=== FAQs (new extractor) ===');
  const faqs = extractFAQs(chunks);
  console.log('Found:', faqs.length, 'FAQs');
  faqs.forEach((f, i) => {
    console.log(`  ${i+1}. Q: ${f.question.substring(0, 60)}`);
    console.log(`     A: ${(f.answer || '(empty - RSC reference)').substring(0, 80)}`);
  });
  
  // Check profile output (should include FAQs now)
  const profile = extractProfile(chunks);
  console.log('\n=== Profile ===');
  console.log('Name:', profile?.name);
  console.log('FAQs in profile:', profile?.faqs?.length);
  console.log('Sector:', profile?.sector);
  
  // Test Ethereum too
  const resp2 = await fetchPage(page, '/project/ethereum');
  const chunks2 = parseRSCChunks(resp2.html);
  const faqs2 = extractFAQs(chunks2);
  console.log('\n=== Ethereum FAQs ===');
  console.log('Found:', faqs2.length, 'FAQs');
  faqs2.forEach((f, i) => {
    console.log(`  ${i+1}. Q: ${f.question.substring(0, 60)}`);
  });
  
  await browser.close();
})();
