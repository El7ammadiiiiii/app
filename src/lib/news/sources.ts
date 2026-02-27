import type { NewsSource } from './types';

/**
 * "بدون API" مصادر RSS/Atom. بعض المواقع قد تمنع أو تغيّر روابط الـ RSS.
 * إذا تغيّر feed في المستقبل، عدّل feedUrl فقط.
 */
export const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'coindesk',
    name: 'CoinDesk',
    homepageUrl: 'https://www.coindesk.com',
    kind: 'rss',
    feedUrl: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  },
  {
    id: 'cointelegraph',
    name: 'Cointelegraph',
    homepageUrl: 'https://cointelegraph.com',
    kind: 'rss',
    feedUrl: 'https://cointelegraph.com/rss',
  },
  {
    id: 'newsbtc',
    name: 'NewsBTC',
    homepageUrl: 'https://www.newsbtc.com',
    kind: 'rss',
    feedUrl: 'https://www.newsbtc.com/feed/',
  },
  {
    id: 'cryptoninjas',
    name: 'CryptoNinjas',
    homepageUrl: 'https://www.cryptoninjas.net',
    kind: 'rss',
    feedUrl: 'https://www.cryptoninjas.net/feed/',
  },
  {
    id: 'cryptodaily',
    name: 'CryptoDaily',
    homepageUrl: 'https://cryptodaily.co.uk',
    kind: 'rss',
    feedUrl: 'https://cryptodaily.co.uk/feed/',
  },
  {
    id: 'decrypt',
    name: 'Decrypt',
    homepageUrl: 'https://decrypt.co',
    kind: 'rss',
    feedUrl: 'https://decrypt.co/feed',
  },
  {
    id: 'bitcoinmagazine',
    name: 'Bitcoin Magazine',
    homepageUrl: 'https://bitcoinmagazine.com',
    kind: 'rss',
    feedUrl: 'https://bitcoinmagazine.com/feed',
    crawlDelayMs: 5000,
  },
  {
    id: 'cryptopotato',
    name: 'CryptoPotato',
    homepageUrl: 'https://cryptopotato.com',
    kind: 'rss',
    feedUrl: 'https://cryptopotato.com/feed/',
  },
  {
    id: 'coingape',
    name: 'CoinGape',
    homepageUrl: 'https://coingape.com',
    kind: 'rss',
    feedUrl: 'https://coingape.com/feed/',
    crawlDelayMs: 10000,
  },
  {
    id: 'beincrypto',
    name: 'BeInCrypto',
    homepageUrl: 'https://beincrypto.com',
    kind: 'rss',
    feedUrl: 'https://beincrypto.com/feed/',
  },
  {
    id: 'bankless',
    name: 'Bankless',
    homepageUrl: 'https://www.bankless.com',
    kind: 'rss',
    feedUrl: 'https://www.bankless.com/feed',
  },
];
