"""
🏦 Arkham Intelligence — All Tags Address Crawler
===================================================
يزحف على جميع صفحات Tags في Arkham Intelligence ويجمع
كل عناوين المحافظ لكل الكيانات (منصات، بروتوكولات، أفراد...).

يستخدم API المباشر أولاً، ثم DrissionPage كبديل لتجاوز Cloudflare.
ينتج مجلد ALL ADDRESSES/ مع ملفات CSV منظمة لكل tag.

الاستخدام:
    crawler = ArkhamTagsCrawler()
    crawler.crawl_all()                    # زحف كامل
    crawler.crawl_category("CeFi")         # تصنيف محدد
    crawler.crawl_tag("cex")               # tag واحد
    crawler.crawl_all(resume=True)         # استئناف
"""

import csv
import json
import os
import re
import sys
import time
import random
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from collections import OrderedDict

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("❌ requests not installed. Run: pip install requests")
    sys.exit(1)

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("arkham_crawler")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
        logger.addHandler(handler)

# ══════════════════════════════════════════════════════════════════
# 📋 خريطة التصنيفات والتاقات
# ══════════════════════════════════════════════════════════════════

CATEGORIES: Dict[str, Dict[str, str]] = OrderedDict({
    "Airdrop": OrderedDict({
        "Pengu Airdrop Recipient Cluster": "pengu-airdrop-recipient-cluster",
        "Airdrop Distributor": "airdrop-distributor",
        "Airdrop Recipient": "airdrop-recipient",
    }),
    "Blockchain Ops": OrderedDict({
        "Smart Contract Platform": "smart-contract-platform",
        "Crosschain Interoperability": "crosschain-interoperability",
        "Blockchain Scaling": "blockchain-scaling",
        "Bridge": "bridge",
        "Blockchain Infra": "blockchain-infra",
    }),
    "CeFi": OrderedDict({
        "Proof of Reserves": "proof-of-reserves",
        "Centralized Exchange": "cex",
        "Lending (Centralized)": "lending-centralized",
    }),
    "Custody": OrderedDict({
        "Custodian": "custodian",
        "Fireblocks Custody": "fireblocks-custody",
        "Coinbase Prime Custody": "coinbase-prime-custody",
        "Swissquote Custody": "swissquote-custody",
        "Kingdom Trust Custody": "kingdom-trust-custody",
        "BitGo Custody": "bitgo-custody",
        "Cactus Custody": "cactus-custody",
        "Komainu Custody": "komainu-custody",
        "Anchorage Custody": "anchorage-custody",
        "Gemini Custody": "gemini-custody",
        "Zodia Custody": "zodia-custody",
        "Copper Custody": "copper-custody",
        "Cantor Fitzgerald Custody": "cantor-fitzgerald-custody",
        "Bitcoin Suisse Custody": "bitcoin-suisse-custody",
        "HashKey Custody": "hashkey-custody",
        "NYDIG Custody": "nydig-custody",
    }),
    "DeFi": OrderedDict({
        "Yield": "yield",
        "CDP": "cdp",
        "Decentralized Exchange": "dex",
        "DEX Aggregator": "dex-aggregator",
        "Derivatives": "derivatives",
        "Lending (Decentralized)": "lending-decentralized",
    }),
    "Governance": OrderedDict({
        "Governor": "governance-governor",
        "Governance Voter": "governance-voter",
        "Snapshot Delegator": "snapshot-delegator",
        "Snapshot Delegate": "snapshot-delegate",
        "Governance Delegator": "governance-delegator",
        "Governance Delegatee": "governance-delegatee",
        "Governance Token": "governance-token",
    }),
    "Government": OrderedDict({
        "Government": "government",
    }),
    "Illicit": OrderedDict({
        "Israeli Seizure Order (ASO)": "israeli-seizure-order-aso",
        "Suspicious": "suspicious",
        "Non-KYC Service": "non-kyc-service",
        "Mixed-KYC Service": "mixed-kyc-service",
        "Bybit Hack Funds": "bybit-hack-funds",
        "Scam": "scam",
        "Gambling": "gambling",
        "Darkweb": "darkweb",
        "Hacker": "hacker",
        "Ransomware": "ransomware",
        "Ponzi": "ponzi",
        "Tornado Cash Depositor": "tornadocash-depositor",
        "Tornado Cash Recipient": "tornadocash-recipient",
        "OFAC Sanctioned": "ofac-sanctioned",
        "EU Sanctioned": "eu-sanctioned",
        "France Sanctioned": "france-sanctioned",
        "UK Sanctioned": "uk-sanctioned",
        "Japan Sanctioned": "japan-sanctioned",
        "Banned by USDC": "banned-by-usdc",
        "Banned by USDT": "banned-by-usdt",
    }),
    "Miner_Validator": OrderedDict({
        "Miner": "miner",
        "Validator": "validator",
        "Foundry Pool Participant": "foundry-pool-participant",
        "Braiins Pool Participant": "braiins-pool-participant",
        "Luxor Tech Pool Participant": "luxor-tech-pool-participant",
        "MEV Fee Recipient": "mev-fee-recipient",
    }),
    "NFT": OrderedDict({
        "NFT": "nft",
        "NFT Marketplace": "nft-marketplace",
    }),
    "Other": OrderedDict({
        "Treasury Company": "treasury-company",
        "Prediction Market": "prediction-market",
        "Charity": "charity",
        "Stablecoin": "stablecoin",
        "Real World Assets": "real-world-assets",
        "Insurance": "insurance",
        "DAO": "dao",
        "Gaming": "gaming",
        "Meme": "meme",
        "Oracle": "oracle",
        "Privacy": "privacy",
        "Exchange-Traded Product": "etp",
        "Genesis Block Address": "genesis-block-address",
        "Genesis Creditor": "genesis-creditor",
        "Whale": "whale",
        "Fundraise": "fundraise",
        "High Transacting": "high-transacting",
        "Input Data Messenger": "input-data-messenger",
        "OP_RETURN Messenger": "op-return-messenger",
        "Creator of Token": "solana-token-creator-of-token",
        "Token Creator": "solana-token-creator",
        "Tron Account Created": "tron-account-created",
        "Tron Account Creater": "tron-account-creator",
        "Donor": "donor",
        "Tron Energy Delegator": "tron-energy-delegator",
        "Tron Energy Delegate": "tron-energy-delegate",
        "TRX Staker": "tron-staker",
        "Early Token Holder": "early-token-holder",
        "Solana Stake Unlock": "solana-stake-unlock",
        "Compromised Address": "compromised-address",
        "Team Wallet": "team-wallet",
        "Burn Address": "burn-address",
        "Dormant Address": "dormant-address",
    }),
    "Smart Contracts": OrderedDict({
        "MultiSig Deployer": "multisig-deployer",
        "Token Deployer": "token-deployer",
        "Pool Deployer": "pool-deployer",
        "Squads Vault": "squads-vault",
        "MultiSig - Contract Wallet": "multisig",
        "Gnosis Safes with Signers": "gnosis-safe-signer",
        "Signers of Gnosis Safes": "gnosis-safe-signer-of-safe",
        "Gnosis Safes with Previous Signers": "gnosis-safe-signer-prev",
        "Previous Signers of Gnosis Safes": "gnosis-safe-signer-of-safe-prev",
        "First Mint": "first-mint",
        "First Mint of Token": "first-mint-of-token",
    }),
    "Social": OrderedDict({
        "Key Opinion Leader": "kol",
        "Social": "social",
        "Pump.fun Users": "pumpfun-user",
        "Polymarket Users": "polymarket-user",
        "Galxe Users": "galxe-user",
        "Polymarket Accounts": "polymarket-account",
        "Star Atlas": "star-atlas",
        "Hyperliquid Users": "hyperliquid-user",
        "Fomo Users": "fomo-user",
        "TRUMP Dinner Leaderboard": "trump-dinner",
        "Vector.fun Users": "vectorfun-user",
        "Hyperliquid Referral Codes": "hyperliquid-referral-code",
        "Coinbase Verified Account": "coinbase-verified",
    }),
    "Staking": OrderedDict({
        "Liquid Staking": "liquid-staking",
        "Beacon Depositor": "beacon-depositor",
        "Tokenized ETH2 Staker": "tokenized-eth2-staker",
    }),
    "Trading": OrderedDict({
        "Fund (Decentralized)": "fund-decentralized",
        "OTC": "otc",
        "Fund": "fund",
        "Individual": "individual",
        "MEV": "mev",
    }),
})

# ══════════════════════════════════════════════════════════════════
# 🔑 إعدادات API والكوكيز
# ══════════════════════════════════════════════════════════════════

BASE_API = "https://api.arkm.com"
BASE_WEB = "https://intel.arkm.com"

DEFAULT_COOKIES = {
    "arkm_consent": "eyJhIjp0cnVILCJtIjp0cnVIfQ",
    "msc_dt": "ab28e6a0-8ee8-482c-8724-3f1fd0af99b1",
}

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Referer": "https://intel.arkm.com/",
    "Origin": "https://intel.arkm.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
}

# CSV columns
CSV_COLUMNS = [
    "entity_name",
    "entity_type",
    "wallet_label",
    "address",
    "chain",
    "balance_usd",
]


# ══════════════════════════════════════════════════════════════════
# 🕷️ الزاحف الرئيسي
# ══════════════════════════════════════════════════════════════════

class ArkhamTagsCrawler:
    """Crawls all Arkham Intelligence tag pages and exports addresses to CSV."""

    def __init__(
        self,
        output_dir: str = "ALL ADDRESSES",
        delay: float = 2.0,
        max_retries: int = 3,
        cookies: Optional[Dict[str, str]] = None,
        use_browser_fallback: bool = True,
    ):
        self.output_dir = Path(output_dir)
        self.delay = delay
        self.max_retries = max_retries
        self.use_browser_fallback = use_browser_fallback
        self.cookies = cookies or DEFAULT_COOKIES.copy()

        # Progress tracking
        self.progress_file = self.output_dir / "_progress.json"
        self.summary_file = self.output_dir / "_summary.csv"
        self.progress: Dict[str, Any] = {"completed": [], "failed": {}, "stats": {}}

        # Session setup
        self.session = self._build_session()

        # Stats
        self.total_addresses_collected = 0
        self.total_entities_collected = 0
        self.start_time = None

        # Browser fallback
        self._browser = None
        self._browser_available = None  # None = not checked yet

    def _build_session(self) -> requests.Session:
        """Build requests session with retry logic and cookies."""
        session = requests.Session()

        # Retry strategy
        retry = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        # Set cookies
        for name, value in self.cookies.items():
            session.cookies.set(name, value, domain=".arkm.com")

        # Set headers
        session.headers.update(DEFAULT_HEADERS)

        return session

    # ─────────────────────────────────────────────────────────────
    # 📁 Progress management
    # ─────────────────────────────────────────────────────────────

    def _load_progress(self):
        """Load progress from file if exists."""
        if self.progress_file.exists():
            try:
                self.progress = json.loads(self.progress_file.read_text(encoding="utf-8"))
                logger.info(f"📂 Loaded progress: {len(self.progress.get('completed', []))} tags completed")
            except Exception:
                self.progress = {"completed": [], "failed": {}, "stats": {}}
        else:
            self.progress = {"completed": [], "failed": {}, "stats": {}}

    def _save_progress(self):
        """Save progress to file."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.progress_file.write_text(
            json.dumps(self.progress, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def _mark_completed(self, tag_slug: str, entity_count: int, address_count: int):
        """Mark a tag as completed."""
        if tag_slug not in self.progress["completed"]:
            self.progress["completed"].append(tag_slug)
        self.progress["stats"][tag_slug] = {
            "entities": entity_count,
            "addresses": address_count,
            "timestamp": datetime.now().isoformat(),
        }
        # Remove from failed if it was there
        self.progress.get("failed", {}).pop(tag_slug, None)
        self._save_progress()

    def _mark_failed(self, tag_slug: str, error: str):
        """Mark a tag as failed."""
        if "failed" not in self.progress:
            self.progress["failed"] = {}
        self.progress["failed"][tag_slug] = {
            "error": error,
            "timestamp": datetime.now().isoformat(),
        }
        self._save_progress()

    def _is_completed(self, tag_slug: str) -> bool:
        """Check if tag is already completed."""
        return tag_slug in self.progress.get("completed", [])

    # ─────────────────────────────────────────────────────────────
    # 🌐 API requests
    # ─────────────────────────────────────────────────────────────

    def _api_get(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make GET request to Arkham API with error handling."""
        url = f"{BASE_API}/{endpoint.lstrip('/')}"
        for attempt in range(self.max_retries):
            try:
                resp = self.session.get(url, params=params, timeout=30)

                if resp.status_code == 200:
                    return resp.json()

                if resp.status_code == 403:
                    logger.warning(f"🔒 403 Forbidden on {url} — may need browser fallback")
                    return None

                if resp.status_code == 429:
                    wait = (attempt + 1) * 10
                    logger.warning(f"⏳ Rate limited (429). Waiting {wait}s...")
                    time.sleep(wait)
                    continue

                if resp.status_code == 404:
                    logger.warning(f"❓ 404 Not Found: {url} params={params}")
                    return {"_not_found": True}

                logger.warning(f"⚠️ HTTP {resp.status_code} on {url}")
                time.sleep((attempt + 1) * 3)

            except requests.exceptions.Timeout:
                logger.warning(f"⌛ Timeout on {url} (attempt {attempt + 1})")
                time.sleep((attempt + 1) * 5)
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"🔌 Connection error: {e}")
                time.sleep((attempt + 1) * 5)
            except Exception as e:
                logger.error(f"💥 Unexpected error on {url}: {e}")
                time.sleep(3)

        return None

    # ─────────────────────────────────────────────────────────────
    # 🕷️ Tag crawling
    # ─────────────────────────────────────────────────────────────

    def _crawl_tag_api(self, tag_slug: str) -> Optional[List[Dict]]:
        """
        Crawl a single tag via API, handling pagination.
        Returns list of address dicts, or None if API fails.
        """
        all_rows: List[Dict] = []
        seen_addresses: Set[str] = set()
        page = 0
        max_pages = 5000  # safety limit

        while page < max_pages:
            params = {"tag": tag_slug, "page": str(page)}
            data = self._api_get("tag/top", params=params)

            if data is None:
                # API failed — signal for browser fallback
                if page == 0:
                    return None
                else:
                    # We got some data, return what we have
                    logger.warning(f"⚠️ API failed at page {page} for {tag_slug}, returning {len(all_rows)} rows")
                    break

            if data.get("_not_found"):
                logger.info(f"❓ Tag '{tag_slug}' not found (404). Skipping.")
                return []

            # Extract addresses
            addresses = data.get("addresses") or []
            entities = data.get("entities") or []
            address_balances = data.get("addressBalances") or {}
            entity_balances = data.get("entityBalances") or {}

            # Process addresses (primary data source — has actual wallet addresses)
            for addr_obj in addresses:
                addr = addr_obj.get("address", "")
                chain = addr_obj.get("chain", "")
                key = f"{addr}:{chain}"

                if not addr or key in seen_addresses:
                    continue
                seen_addresses.add(key)

                entity_info = addr_obj.get("arkhamEntity") or {}
                label_info = addr_obj.get("arkhamLabel") or {}

                # Get balance
                balance = ""
                addr_balance = address_balances.get(addr)
                if isinstance(addr_balance, dict):
                    balance = addr_balance.get("totalBalance") or addr_balance.get("usdValue") or ""
                elif isinstance(addr_balance, (int, float)):
                    balance = addr_balance

                row = {
                    "entity_name": entity_info.get("name", ""),
                    "entity_type": entity_info.get("type", ""),
                    "wallet_label": label_info.get("name", ""),
                    "address": addr,
                    "chain": chain,
                    "balance_usd": str(balance) if balance != "" else "",
                }
                all_rows.append(row)

            # Process entities (secondary — entity-level info without specific addresses)
            for ent_obj in entities:
                ent_id = ent_obj.get("id", "")
                ent_name = ent_obj.get("name", "")
                ent_type = ent_obj.get("type", "")

                # Get entity balance if available
                balance = ""
                ent_bal = entity_balances.get(ent_id)
                if isinstance(ent_bal, dict):
                    balance = ent_bal.get("totalBalance") or ent_bal.get("usdValue") or ""
                elif isinstance(ent_bal, (int, float)):
                    balance = ent_bal

                # Only add entity row if we don't have address-level data for it
                entity_key = f"entity:{ent_id}"
                if entity_key not in seen_addresses and ent_name:
                    seen_addresses.add(entity_key)
                    row = {
                        "entity_name": ent_name,
                        "entity_type": ent_type,
                        "wallet_label": "(entity-level)",
                        "address": ent_id,
                        "chain": "",
                        "balance_usd": str(balance) if balance != "" else "",
                    }
                    all_rows.append(row)

            # Check pagination
            all_entities_done = data.get("allEntitiesFetched", True)
            all_addresses_done = data.get("allAddressesFetched", True)

            page_total = len(addresses) + len(entities)

            if all_entities_done and all_addresses_done:
                break

            if page_total == 0:
                # Empty page — probably done
                break

            page += 1

            # Progress feedback every 10 pages
            if page % 10 == 0:
                logger.info(f"  📄 Page {page}: {len(all_rows)} rows so far for '{tag_slug}'")

            # Rate limiting
            time.sleep(self.delay + random.uniform(0, 0.5))

        return all_rows

    def _crawl_tag_browser(self, tag_slug: str) -> Optional[List[Dict]]:
        """
        Fallback: crawl tag using DrissionPage browser automation.
        Returns list of address dicts, or None if browser is not available.
        """
        if not self.use_browser_fallback:
            return None

        # Check if DrissionPage is available
        if self._browser_available is None:
            try:
                from DrissionPage import ChromiumPage, ChromiumOptions
                self._browser_available = True
            except ImportError:
                logger.warning("⚠️ DrissionPage not installed. Browser fallback disabled.")
                logger.warning("   Install with: pip install DrissionPage")
                self._browser_available = False
                return None

        if not self._browser_available:
            return None

        try:
            from DrissionPage import ChromiumPage, ChromiumOptions

            logger.info(f"🌐 Using browser fallback for '{tag_slug}'...")

            if self._browser is None:
                co = ChromiumOptions()
                co.headless(True)
                co.set_argument("--no-sandbox")
                co.set_argument("--disable-gpu")
                co.set_argument("--disable-blink-features=AutomationControlled")
                co.set_argument("--window-size=1920,1080")
                co.set_argument("--disable-dev-shm-usage")
                self._browser = ChromiumPage(co)

                # Set cookies
                self._browser.get(f"{BASE_WEB}/tags/{tag_slug}")
                time.sleep(3)
                for name, value in self.cookies.items():
                    self._browser.set.cookies({
                        "name": name,
                        "value": value,
                        "domain": ".arkm.com",
                    })

            # Navigate to tag page
            url = f"{BASE_WEB}/tags/{tag_slug}"
            self._browser.get(url)
            time.sleep(5)

            all_rows: List[Dict] = []
            seen: Set[str] = set()
            max_clicks = 500

            for click_num in range(max_clicks):
                # Try to find and extract table data from the page
                # Look for address elements
                try:
                    # Try intercepting network requests
                    # The page loads data via fetch to api.arkm.com/tag/top
                    page_text = self._browser.html or ""

                    # Find SHOW MORE button and click it
                    show_more = self._browser.ele("text=SHOW MORE", timeout=3)
                    if show_more:
                        show_more.click()
                        time.sleep(self.delay + 1)
                    else:
                        break
                except Exception:
                    break

            # Extract data from page source — parse the rendered HTML
            try:
                page_html = self._browser.html or ""
                # Look for address patterns in the rendered page
                # ETH: 0x followed by 40 hex chars
                eth_addrs = re.findall(r"(0x[a-fA-F0-9]{40})", page_html)
                # BTC: bc1, 1, or 3 followed by 25-39 chars
                btc_addrs = re.findall(r"(bc1[a-zA-HJ-NP-Z0-9]{39,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})", page_html)
                # TRON: T followed by 33 chars
                tron_addrs = re.findall(r"(T[a-zA-Z0-9]{33})", page_html)

                for addr in eth_addrs + btc_addrs + tron_addrs:
                    if addr not in seen:
                        seen.add(addr)
                        chain = "ethereum"
                        if addr.startswith("bc1") or addr.startswith("1") or addr.startswith("3"):
                            chain = "bitcoin"
                        elif addr.startswith("T"):
                            chain = "tron"
                        all_rows.append({
                            "entity_name": "",
                            "entity_type": "",
                            "wallet_label": "",
                            "address": addr,
                            "chain": chain,
                            "balance_usd": "",
                        })

            except Exception as e:
                logger.error(f"💥 Browser data extraction failed: {e}")

            return all_rows if all_rows else None

        except Exception as e:
            logger.error(f"💥 Browser fallback error: {e}")
            return None

    def crawl_tag(self, tag_slug: str, display_name: str = "", category: str = "") -> int:
        """
        Crawl a single tag and save results to CSV.
        Returns number of addresses collected.
        """
        if not display_name:
            display_name = tag_slug

        logger.info(f"🔍 Crawling tag: {display_name} ({tag_slug})")

        # Try API first
        rows = self._crawl_tag_api(tag_slug)

        # Fallback to browser if API failed
        if rows is None:
            logger.warning(f"🔄 API failed for '{tag_slug}', trying browser fallback...")
            rows = self._crawl_tag_browser(tag_slug)

        if rows is None:
            error_msg = "Both API and browser fallback failed"
            logger.error(f"❌ {error_msg} for '{tag_slug}'")
            self._mark_failed(tag_slug, error_msg)
            return 0

        if not rows:
            logger.info(f"📭 No data for tag '{tag_slug}' (empty or 404)")
            # Still save empty CSV
            self._save_csv(rows, tag_slug, display_name, category)
            self._mark_completed(tag_slug, 0, 0)
            return 0

        # Sort rows: by entity_name, then balance descending
        def sort_key(r):
            name = r.get("entity_name", "").lower()
            try:
                bal = -float(r.get("balance_usd", 0) or 0)
            except (ValueError, TypeError):
                bal = 0
            return (name, bal)

        rows.sort(key=sort_key)

        # Count unique entities and addresses
        entities = set(r["entity_name"] for r in rows if r["entity_name"])
        addresses = set(r["address"] for r in rows if r["address"])

        # Save CSV
        self._save_csv(rows, tag_slug, display_name, category)

        # Update progress
        self._mark_completed(tag_slug, len(entities), len(addresses))
        self.total_addresses_collected += len(addresses)
        self.total_entities_collected += len(entities)

        logger.info(
            f"✅ {display_name}: {len(entities)} entities, "
            f"{len(addresses)} addresses saved"
        )
        return len(addresses)

    def _save_csv(self, rows: List[Dict], tag_slug: str, display_name: str, category: str):
        """Save rows to CSV file."""
        if category:
            folder = self.output_dir / category
        else:
            folder = self.output_dir

        folder.mkdir(parents=True, exist_ok=True)

        # Clean filename (remove chars not allowed in Windows filenames)
        safe_name = re.sub(r'[<>:"/\\|?*]', '-', display_name)
        filepath = folder / f"{safe_name}.csv"

        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            writer.writeheader()
            for row in rows:
                writer.writerow({col: row.get(col, "") for col in CSV_COLUMNS})

        logger.info(f"💾 Saved: {filepath} ({len(rows)} rows)")

    # ─────────────────────────────────────────────────────────────
    # 🎯 Batch crawling
    # ─────────────────────────────────────────────────────────────

    def crawl_category(self, category_name: str, resume: bool = False):
        """Crawl all tags in a category."""
        if category_name not in CATEGORIES:
            logger.error(f"❌ Unknown category: {category_name}")
            logger.info(f"Available categories: {', '.join(CATEGORIES.keys())}")
            return

        if resume:
            self._load_progress()

        tags = CATEGORIES[category_name]
        total = len(tags)
        logger.info(f"📦 Crawling category '{category_name}': {total} tags")

        for idx, (display_name, tag_slug) in enumerate(tags.items(), 1):
            if resume and self._is_completed(tag_slug):
                logger.info(f"⏭️  [{idx}/{total}] Skipping (done): {display_name}")
                continue

            logger.info(f"📌 [{idx}/{total}] {display_name}")
            self.crawl_tag(tag_slug, display_name, category_name)

            # Delay between tags
            if idx < total:
                time.sleep(self.delay)

    def crawl_all(self, resume: bool = False):
        """Crawl ALL categories and tags."""
        self.start_time = datetime.now()

        if resume:
            self._load_progress()

        total_tags = sum(len(tags) for tags in CATEGORIES.values())
        completed = len(self.progress.get("completed", []))

        logger.info("=" * 60)
        logger.info(f"🚀 Arkham Intelligence — Full Crawl")
        logger.info(f"📊 Total tags: {total_tags}")
        if resume and completed:
            logger.info(f"⏭️  Already completed: {completed}")
        logger.info(f"⏱️  Delay between requests: {self.delay}s")
        logger.info(f"📁 Output directory: {self.output_dir}")
        logger.info("=" * 60)

        tag_counter = 0
        for cat_name, tags in CATEGORIES.items():
            logger.info(f"\n{'─' * 40}")
            logger.info(f"📦 Category: {cat_name} ({len(tags)} tags)")
            logger.info(f"{'─' * 40}")

            for display_name, tag_slug in tags.items():
                tag_counter += 1

                if resume and self._is_completed(tag_slug):
                    logger.info(f"⏭️  [{tag_counter}/{total_tags}] Skip: {display_name}")
                    continue

                logger.info(f"📌 [{tag_counter}/{total_tags}] {display_name} ({tag_slug})")

                try:
                    self.crawl_tag(tag_slug, display_name, cat_name)
                except KeyboardInterrupt:
                    logger.warning("⚠️ Interrupted by user. Progress saved.")
                    self._save_progress()
                    self._write_summary()
                    return
                except Exception as e:
                    logger.error(f"💥 Error crawling {tag_slug}: {e}")
                    logger.error(traceback.format_exc())
                    self._mark_failed(tag_slug, str(e))

                # Delay between tags
                time.sleep(self.delay)

        # Final summary
        self._write_summary()

        elapsed = datetime.now() - self.start_time
        logger.info("\n" + "=" * 60)
        logger.info(f"🏁 Crawl Complete!")
        logger.info(f"⏱️  Duration: {elapsed}")
        logger.info(f"📊 Total entities: {self.total_entities_collected}")
        logger.info(f"📊 Total addresses: {self.total_addresses_collected}")
        logger.info(f"✅ Completed: {len(self.progress['completed'])}/{total_tags}")
        failed = self.progress.get("failed", {})
        if failed:
            logger.info(f"❌ Failed: {len(failed)} — {', '.join(failed.keys())}")
        logger.info(f"📁 Results in: {self.output_dir.resolve()}")
        logger.info("=" * 60)

    def _write_summary(self):
        """Write summary CSV with stats for all crawled tags."""
        self.output_dir.mkdir(parents=True, exist_ok=True)

        rows = []
        for cat_name, tags in CATEGORIES.items():
            for display_name, tag_slug in tags.items():
                stats = self.progress.get("stats", {}).get(tag_slug, {})
                status = "completed" if tag_slug in self.progress.get("completed", []) else \
                         "failed" if tag_slug in self.progress.get("failed", {}) else "pending"

                rows.append({
                    "category": cat_name,
                    "tag_slug": tag_slug,
                    "display_name": display_name,
                    "status": status,
                    "entity_count": stats.get("entities", ""),
                    "address_count": stats.get("addresses", ""),
                    "crawl_date": stats.get("timestamp", ""),
                })

        with open(self.summary_file, "w", newline="", encoding="utf-8-sig") as f:
            cols = ["category", "tag_slug", "display_name", "status",
                    "entity_count", "address_count", "crawl_date"]
            writer = csv.DictWriter(f, fieldnames=cols)
            writer.writeheader()
            writer.writerows(rows)

        logger.info(f"📋 Summary saved: {self.summary_file}")

    # ─────────────────────────────────────────────────────────────
    # 🧹 Cleanup
    # ─────────────────────────────────────────────────────────────

    def close(self):
        """Clean up resources."""
        if self._browser:
            try:
                self._browser.quit()
            except Exception:
                pass
            self._browser = None
        if self.session:
            self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
