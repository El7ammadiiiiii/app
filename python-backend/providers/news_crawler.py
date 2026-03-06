"""
📰 news_crawler.py — Multi-source RSS News Crawler (Firebase + SQLite lifecycle)

Crawls news from 10 RSS sources every 1 hour.
Stores ALL articles in SQLite (persistent, never deleted).
Writes recent articles (last 7 days) to Firebase: crawler_data/news
Serves paginated API at /api/crawler/news

Sources: CoinDesk, Cointelegraph, NewsBTC, CryptoNinjas, CryptoDaily,
         Decrypt, Bitcoin Magazine, CoinGape, BeInCrypto, Bankless
"""

import asyncio
import hashlib
import html
import logging
import os
import re
import sqlite3
import sys
import time
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree

from fastapi import APIRouter, Query

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_writer import init_firebase, get_db

logger = logging.getLogger("news_crawler")
news_crawler_router = APIRouter()

NEWS_REFRESH_INTERVAL = 60 * 60  # 1 hour
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "news.db")

# ─── RSS Sources (CryptoPotato removed) ───
RSS_SOURCES = [
    {"id": "coindesk", "name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/"},
    {"id": "cointelegraph", "name": "Cointelegraph", "url": "https://cointelegraph.com/rss"},
    {"id": "newsbtc", "name": "NewsBTC", "url": "https://www.newsbtc.com/feed/"},
    {"id": "cryptoninjas", "name": "CryptoNinjas", "url": "https://www.cryptoninjas.net/feed/"},
    {"id": "cryptodaily", "name": "CryptoDaily", "url": "https://cryptodaily.co.uk/feed/"},
    {"id": "decrypt", "name": "Decrypt", "url": "https://decrypt.co/feed"},
    {"id": "bitcoinmagazine", "name": "Bitcoin Magazine", "url": "https://bitcoinmagazine.com/feed"},
    {"id": "coingape", "name": "CoinGape", "url": "https://coingape.com/feed/"},
    {"id": "beincrypto", "name": "BeInCrypto", "url": "https://beincrypto.com/feed/"},
    {"id": "bankless", "name": "Bankless", "url": "https://www.bankless.com/feed"},
]

_bg_tasks: List[asyncio.Task] = []
_running = False
_stats: Dict[str, Any] = {
    "total_runs": 0,
    "articles_total": 0,
    "articles_new": 0,
    "errors": 0,
    "last_run": None,
}


# ═══════════════════════════════════════════════
# SQLite Persistence
# ═══════════════════════════════════════════════

def _init_db():
    """Create SQLite database and tables."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            source_id TEXT NOT NULL,
            source_name TEXT NOT NULL,
            published_at TEXT,
            published_at_ms INTEGER,
            excerpt TEXT,
            image_url TEXT,
            created_at INTEGER NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at_ms DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_news_source ON news(source_id)")
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_news_url ON news(url)")
    conn.commit()
    conn.close()
    logger.info("📰 News SQLite DB initialized at %s", DB_PATH)


def _insert_articles(articles: List[Dict[str, Any]]) -> int:
    """Insert articles into SQLite, skip duplicates. Returns count of new inserts."""
    conn = sqlite3.connect(DB_PATH)
    new_count = 0
    for a in articles:
        try:
            conn.execute("""
                INSERT OR IGNORE INTO news (id, title, url, source_id, source_name,
                    published_at, published_at_ms, excerpt, image_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                a["id"], a["title"], a["url"], a["source_id"], a["source_name"],
                a.get("published_at"), a.get("published_at_ms", 0),
                a.get("excerpt"), a.get("image_url"),
                int(time.time() * 1000),
            ))
            if conn.total_changes:
                new_count += 1
        except Exception as e:
            logger.debug("Insert skip: %s", e)
    conn.commit()

    # Get total count
    total = conn.execute("SELECT COUNT(*) FROM news").fetchone()[0]
    conn.close()
    return new_count


def _query_articles(
    page: int = 1,
    page_size: int = 20,
    source_id: Optional[str] = None,
    since_ms: Optional[int] = None,
) -> Dict[str, Any]:
    """Query articles from SQLite with pagination."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    where_clauses = []
    params: list = []

    if source_id:
        where_clauses.append("source_id = ?")
        params.append(source_id)
    if since_ms:
        where_clauses.append("published_at_ms >= ?")
        params.append(since_ms)

    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

    total = conn.execute(f"SELECT COUNT(*) FROM news WHERE {where_sql}", params).fetchone()[0]

    offset = (page - 1) * page_size
    rows = conn.execute(
        f"""SELECT * FROM news WHERE {where_sql}
            ORDER BY published_at_ms DESC
            LIMIT ? OFFSET ?""",
        params + [page_size, offset]
    ).fetchall()

    articles = []
    for row in rows:
        articles.append({
            "id": row["id"],
            "title": row["title"],
            "url": row["url"],
            "source": {"id": row["source_id"], "name": row["source_name"]},
            "publishedAt": row["published_at"],
            "publishedAtMs": row["published_at_ms"],
            "excerpt": row["excerpt"],
            "imageUrl": row["image_url"],
        })

    conn.close()
    total_pages = max(1, -(-total // page_size))

    return {
        "items": articles,
        "page": page,
        "pageSize": page_size,
        "totalItems": total,
        "totalPages": total_pages,
    }


# ═══════════════════════════════════════════════
# RSS Parsing
# ═══════════════════════════════════════════════

def _strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:500]


def _extract_image(item_el) -> Optional[str]:
    """Try to extract image URL from RSS item."""
    # enclosure
    enc = item_el.find("enclosure")
    if enc is not None:
        url = enc.get("url", "")
        if url.startswith("http"):
            return url

    # media:content / media:thumbnail
    for ns in ["http://search.yahoo.com/mrss/", "media"]:
        for tag in ["content", "thumbnail"]:
            full_tag = f"{{{ns}}}{tag}" if "://" in ns else f"{ns}:{tag}"
            el = item_el.find(full_tag)
            if el is not None:
                url = el.get("url", "")
                if url.startswith("http"):
                    return url

    # Try content:encoded for <img>
    for content_tag in ["content:encoded", "{http://purl.org/rss/1.0/modules/content/}encoded"]:
        cel = item_el.find(content_tag)
        if cel is not None and cel.text:
            m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', cel.text)
            if m and m.group(1).startswith("http"):
                return m.group(1)

    return None


def _parse_date(text: Optional[str]) -> int:
    """Parse date string to milliseconds timestamp."""
    if not text:
        return int(time.time() * 1000)
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(text)
        return int(dt.timestamp() * 1000)
    except Exception:
        pass
    # Try ISO format
    try:
        from datetime import datetime as dt_cls
        dt = dt_cls.fromisoformat(text.replace("Z", "+00:00"))
        return int(dt.timestamp() * 1000)
    except Exception:
        pass
    return int(time.time() * 1000)


def _build_article_id(source_id: str, url: str, title: str) -> str:
    """Build a stable unique ID for a news article."""
    raw = f"{source_id}:{url}".lower().strip()
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _normalize_url(url: str) -> str:
    """Normalize URL for deduplication."""
    url = url.strip()
    if url.endswith("/"):
        url = url[:-1]
    # Remove tracking params
    url = re.sub(r'[?&](utm_\w+|ref|source|campaign)=[^&]*', '', url)
    return url


async def _fetch_rss(source: Dict[str, str]) -> List[Dict[str, Any]]:
    """Fetch and parse a single RSS feed."""
    articles = []

    try:
        import aiohttp

        headers = {
            "User-Agent": "CCWays-NewsCrawler/1.0",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(source["url"], headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    logger.warning("⚠️ %s returned %d", source["name"], resp.status)
                    return []
                xml_text = await resp.text()

        # Parse XML
        root = ElementTree.fromstring(xml_text)

        # RSS 2.0: rss > channel > item
        channel = root.find("channel")
        if channel is not None:
            for item in channel.findall("item"):
                title_el = item.find("title")
                link_el = item.find("link")
                if title_el is None or link_el is None:
                    continue

                title = (title_el.text or "").strip()
                url = _normalize_url((link_el.text or "").strip())
                if not title or not url:
                    continue

                pubdate_el = item.find("pubDate")
                published_ms = _parse_date(pubdate_el.text if pubdate_el is not None else None)

                desc_el = item.find("description")
                excerpt = _strip_html(desc_el.text if desc_el is not None else "")
                image_url = _extract_image(item)

                articles.append({
                    "id": _build_article_id(source["id"], url, title),
                    "title": title,
                    "url": url,
                    "source_id": source["id"],
                    "source_name": source["name"],
                    "published_at": None,
                    "published_at_ms": published_ms,
                    "excerpt": excerpt,
                    "image_url": image_url,
                })

        # Atom: feed > entry
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns) or root.findall("entry"):
            title_el = entry.find("atom:title", ns) or entry.find("title")
            link_el = entry.find("atom:link[@rel='alternate']", ns) or entry.find("atom:link", ns) or entry.find("link")

            if title_el is None:
                continue

            title = (title_el.text or "").strip()
            url = ""
            if link_el is not None:
                url = _normalize_url(link_el.get("href", link_el.text or "").strip())

            if not title or not url:
                continue

            pub_el = entry.find("atom:published", ns) or entry.find("published") or entry.find("atom:updated", ns) or entry.find("updated")
            published_ms = _parse_date(pub_el.text if pub_el is not None else None)

            summary_el = entry.find("atom:summary", ns) or entry.find("summary")
            excerpt = _strip_html(summary_el.text if summary_el is not None else "")
            image_url = _extract_image(entry)

            articles.append({
                "id": _build_article_id(source["id"], url, title),
                "title": title,
                "url": url,
                "source_id": source["id"],
                "source_name": source["name"],
                "published_at": None,
                "published_at_ms": published_ms,
                "excerpt": excerpt,
                "image_url": image_url,
            })

    except Exception as e:
        logger.error("❌ RSS fetch error [%s]: %s", source["name"], e)

    # Set published_at ISO strings
    for a in articles:
        if a["published_at_ms"]:
            from datetime import datetime, timezone
            a["published_at"] = datetime.fromtimestamp(
                a["published_at_ms"] / 1000, tz=timezone.utc
            ).isoformat()

    return articles


# ═══════════════════════════════════════════════
# Firebase Write
# ═══════════════════════════════════════════════

async def _write_news_to_firebase(articles: List[Dict[str, Any]]) -> bool:
    """Write recent articles to Firebase (last 7 days only for freshness)."""
    try:
        db = get_db()
        seven_days_ago = int((time.time() - 7 * 24 * 3600) * 1000)
        recent = [a for a in articles if a.get("published_at_ms", 0) > seven_days_ago]
        recent.sort(key=lambda x: x.get("published_at_ms", 0), reverse=True)
        recent = recent[:500]  # Max 500 articles in Firebase

        # Write as a single document with array
        doc_ref = db.collection("crawler_data").document("news")
        firebase_items = []
        for a in recent:
            firebase_items.append({
                "id": a["id"],
                "title": a["title"],
                "url": a["url"],
                "source": {"id": a["source_id"], "name": a["source_name"]},
                "publishedAt": a.get("published_at"),
                "publishedAtMs": a.get("published_at_ms", 0),
                "excerpt": a.get("excerpt"),
                "imageUrl": a.get("image_url"),
            })

        await doc_ref.set({
            "articles": firebase_items,
            "count": len(firebase_items),
            "updated_at": int(time.time() * 1000),
            "sources": [s["id"] for s in RSS_SOURCES],
        })

        return True
    except Exception as e:
        logger.error("Firebase news write failed: %s", e)
        return False


# ═══════════════════════════════════════════════
# Crawler Runner
# ═══════════════════════════════════════════════

async def _run_news_crawler() -> Dict[str, Any]:
    """Run all RSS sources, store in SQLite and Firebase."""
    results = {"success": False, "articles_new": 0, "articles_total": 0, "sources_ok": 0}

    all_articles: List[Dict[str, Any]] = []

    for source in RSS_SOURCES:
        try:
            articles = await _fetch_rss(source)
            all_articles.extend(articles)
            results["sources_ok"] += 1
            logger.info("📰 %s: %d articles", source["name"], len(articles))
            await asyncio.sleep(1)  # Polite delay
        except Exception as e:
            logger.error("❌ %s failed: %s", source["name"], e)

    if all_articles:
        # Store in SQLite (persistent, never deleted)
        new_count = _insert_articles(all_articles)
        results["articles_new"] = new_count
        results["articles_total"] = len(all_articles)

        # Write recent to Firebase
        # Query all recent from SQLite for Firebase
        seven_days_ago = int((time.time() - 7 * 24 * 3600) * 1000)
        recent_data = _query_articles(page=1, page_size=500, since_ms=seven_days_ago)
        if recent_data["items"]:
            # Convert back to internal format for Firebase write
            fb_articles = []
            for item in recent_data["items"]:
                fb_articles.append({
                    "id": item["id"],
                    "title": item["title"],
                    "url": item["url"],
                    "source_id": item["source"]["id"],
                    "source_name": item["source"]["name"],
                    "published_at": item.get("publishedAt"),
                    "published_at_ms": item.get("publishedAtMs", 0),
                    "excerpt": item.get("excerpt"),
                    "image_url": item.get("imageUrl"),
                })
            await _write_news_to_firebase(fb_articles)

        results["success"] = True
        logger.info("✅ News: %d total, %d new from %d sources",
                     len(all_articles), new_count, results["sources_ok"])

    return results


async def _news_crawler_loop():
    """Background loop: run every 1 hour."""
    await asyncio.sleep(30)  # Initial delay

    while _running:
        try:
            logger.info("🔄 News crawler starting...")
            start = time.time()
            result = await _run_news_crawler()
            elapsed = time.time() - start

            _stats["total_runs"] += 1
            _stats["articles_total"] = result.get("articles_total", 0)
            _stats["articles_new"] = result.get("articles_new", 0)
            _stats["last_run"] = {
                "success": result["success"],
                "articles_total": result["articles_total"],
                "articles_new": result["articles_new"],
                "sources_ok": result["sources_ok"],
                "elapsed_s": round(elapsed, 1),
                "timestamp": int(time.time() * 1000),
            }

            logger.info("✅ News cycle done: %d articles, %d new, %.0fs",
                         result["articles_total"], result["articles_new"], elapsed)

        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ News loop error: %s", e)

        await asyncio.sleep(NEWS_REFRESH_INTERVAL)


# ═══════════════════════════════════════════════
# Lifecycle
# ═══════════════════════════════════════════════

async def init_news_crawler():
    global _running
    try:
        init_firebase()
    except Exception:
        pass
    _init_db()
    _running = True
    _bg_tasks.append(asyncio.create_task(_news_crawler_loop()))
    logger.info("✅ News crawler started (every %dh, SQLite + Firebase)", NEWS_REFRESH_INTERVAL // 3600)


async def shutdown_news_crawler():
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 News crawler shutdown")


# ═══════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════

@news_crawler_router.get("/status")
async def news_status():
    return {"running": _running, "stats": _stats}


@news_crawler_router.get("/articles")
async def get_news(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=5, le=50),
    source: Optional[str] = Query(None),
    sinceMs: Optional[int] = Query(None),
):
    """Paginated news from SQLite (persistent storage)."""
    data = _query_articles(page=page, page_size=pageSize, source_id=source, since_ms=sinceMs)
    return {**data, "fetchedAt": time.time() * 1000}


@news_crawler_router.get("/sources")
async def news_sources():
    return {"sources": RSS_SOURCES, "count": len(RSS_SOURCES)}


@news_crawler_router.post("/trigger")
async def trigger_news():
    try:
        result = await _run_news_crawler()
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
