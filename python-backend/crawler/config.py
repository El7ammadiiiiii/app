"""
⚙️ إعدادات الزاحف وسجل السلاسل المدعومة
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class CrawlerFamily(str, Enum):
    ETHERSCAN = "etherscan"
    BLOCKSCOUT = "blockscout"
    INDEPENDENT = "independent"
    SUBSCAN = "subscan"
    COSMOS = "cosmos"
    LEVEL2 = "level2"
    DEFILLAMA = "defillama"
    STAKINGREWARDS = "stakingrewards"


@dataclass
class ChainConfig:
    """إعدادات سلسلة واحدة"""
    chain_id: int
    name: str
    symbol: str
    base_url: str
    family: CrawlerFamily = CrawlerFamily.ETHERSCAN
    enabled: bool = True
    # الصفحات المتوفرة (بعض المستكشفات لا تملك كل الصفحات)
    has_charts: bool = True
    has_accounts: bool = True
    has_tokens: bool = True
    has_gas_tracker: bool = True
    has_node_tracker: bool = True
    has_dex: bool = True
    has_supply: bool = True
    # الصفحات الإضافية
    has_chart_pages: bool = True  # تفعيل زحف الرسوم البيانية التاريخية
    defillama_slug: Optional[str] = None  # Slug for DeFiLlama mapping (e.g. "ethereum", "bsc")
    # تأخير مخصص (ثواني بين الطلبات)
    request_delay: float = 2.0


# ══════════════════════════════════════════════════════════════════
# 🗂️ سجل سلاسل عائلة Etherscan — 20+ سلسلة
# ══════════════════════════════════════════════════════════════════

ETHERSCAN_CHAINS: Dict[str, ChainConfig] = {
    "ethereum": ChainConfig(
        chain_id=1,
        name="Ethereum",
        symbol="ETH",
        base_url="https://etherscan.io",
        defillama_slug="ethereum",
        request_delay=4.0,  # Cloudflare أشد
    ),
    "polygon": ChainConfig(
        chain_id=137,
        name="Polygon",
        symbol="MATIC",
        base_url="https://polygonscan.com",
        defillama_slug="polygon",
        request_delay=4.0,
    ),
    "bsc": ChainConfig(
        chain_id=56,
        name="BNB Smart Chain",
        symbol="BNB",
        base_url="https://bscscan.com",
        defillama_slug="bsc",
        request_delay=4.0,
    ),
    "arbitrum": ChainConfig(
        chain_id=42161,
        name="Arbitrum",
        symbol="ETH",
        base_url="https://arbiscan.io",
        defillama_slug="arbitrum",
    ),
    "optimism": ChainConfig(
        chain_id=10,
        name="Optimism",
        symbol="ETH",
        base_url="https://optimistic.etherscan.io",
        defillama_slug="optimism",
    ),
    "celo": ChainConfig(
        chain_id=42220,
        name="Celo",
        symbol="CELO",
        base_url="https://celoscan.io",
        defillama_slug="celo",
    ),
    "gnosis": ChainConfig(
        chain_id=100,
        name="Gnosis Chain",
        symbol="xDAI",
        base_url="https://gnosisscan.io",
        defillama_slug="gnosis",  # or xdai
    ),
    "moonbeam": ChainConfig(
        chain_id=1284,
        name="Moonbeam",
        symbol="GLMR",
        base_url="https://moonscan.io",
        defillama_slug="moonbeam",
    ),
    "moonriver": ChainConfig(
        chain_id=1285,
        name="Moonriver",
        symbol="MOVR",
        base_url="https://moonriver.moonscan.io",
        defillama_slug="moonriver",
    ),
    "base": ChainConfig(
        chain_id=8453,
        name="Base",
        symbol="ETH",
        base_url="https://basescan.org",
        defillama_slug="base",
    ),
    "linea": ChainConfig(
        chain_id=59144,
        name="Linea",
        symbol="ETH",
        base_url="https://lineascan.build",
        defillama_slug="linea",
    ),
    "scroll": ChainConfig(
        chain_id=534352,
        name="Scroll",
        symbol="ETH",
        base_url="https://scrollscan.com",
        defillama_slug="scroll",
    ),
    "mantle": ChainConfig(
        chain_id=5000,
        name="Mantle",
        symbol="MNT",
        base_url="https://mantlescan.xyz",
        defillama_slug="mantle",
    ),
    "polygon_zkevm": ChainConfig(
        chain_id=1101,
        name="Polygon zkEVM",
        symbol="ETH",
        base_url="https://zkevm.polygonscan.com",
        defillama_slug="polygon_zkevm",
    ),
    "blast": ChainConfig(
        chain_id=81457,
        name="Blast",
        symbol="ETH",
        base_url="https://blastscan.io",
        defillama_slug="blast",
    ),
    "taiko": ChainConfig(
        chain_id=167000,
        name="Taiko",
        symbol="ETH",
        base_url="https://taikoscan.io",
        defillama_slug="taiko",
    ),
    "fraxtal": ChainConfig(
        chain_id=252,
        name="Fraxtal",
        symbol="frxETH",
        base_url="https://fraxscan.com",
        defillama_slug="fraxtal",
    ),
    "berachain": ChainConfig(
        chain_id=80084,
        name="Berachain",
        symbol="BERA",
        base_url="https://berascan.com",
        defillama_slug="berachain",
    ),
    "worldcoin": ChainConfig(
        chain_id=480,
        name="World Chain",
        symbol="WLD",
        base_url="https://worldscan.org",
        defillama_slug="worldcoin",
    ),
    "core_dao": ChainConfig(
        chain_id=1116,
        name="Core DAO",
        symbol="CORE",
        base_url="https://scan.coredao.org",
        defillama_slug="core_dao",
    ),
}


# ══════════════════════════════════════════════════════════════════
# 🗂️ سجل سلاسل عائلة Blockscout — 8 سلاسل
# ══════════════════════════════════════════════════════════════════

BLOCKSCOUT_CHAINS: Dict[str, ChainConfig] = {
    "harmony": ChainConfig(
        chain_id=1666600000,
        name="Harmony",
        symbol="ONE",
        base_url="https://explorer.harmony.one",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=1.5,  # API أسرع من HTML
    ),
    "manta_pacific": ChainConfig(
        chain_id=169,
        name="Manta Pacific",
        symbol="MANTA",
        base_url="https://pacific-explorer.manta.network",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=1.5,
    ),
    "aurora": ChainConfig(
        chain_id=1313161554,
        name="Aurora",
        symbol="AURORA",
        base_url="https://explorer.aurora.dev",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=1.5,
    ),
    "zora": ChainConfig(
        chain_id=7777777,
        name="Zora",
        symbol="ETH",
        base_url="https://explorer.zora.energy",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=1.5,
    ),
    "bob": ChainConfig(
        chain_id=60808,
        name="BOB",
        symbol="ETH",
        base_url="https://explorer.gobob.xyz",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=1.5,
    ),
    "metis": ChainConfig(
        chain_id=1088,
        name="Metis",
        symbol="METIS",
        base_url="https://andromeda-explorer.metis.io",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=1.5,
    ),
    "lukso": ChainConfig(
        chain_id=42,
        name="LUKSO",
        symbol="LYX",
        base_url="https://explorer.lukso.network",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=2.0,
        has_gas_tracker=False,
        has_node_tracker=False,
    ),
    "neon_evm": ChainConfig(
        chain_id=245022934,
        name="Neon EVM",
        symbol="NEON",
        base_url="https://neonscan.org",
        family=CrawlerFamily.BLOCKSCOUT,
        request_delay=2.0,
        # NeonScan ليس Blockscout قياسي — HTML فقط
        has_gas_tracker=False,
        has_node_tracker=False,
        has_dex=False,
    ),
}


# نقاط API v2 لعائلة Blockscout
BLOCKSCOUT_API_ENDPOINTS = {
    "stats": "/api/v2/stats",
    "addresses": "/api/v2/addresses",
    "tokens": "/api/v2/tokens?type=ERC-20",
    "blocks": "/api/v2/main-page/blocks",
    "transactions": "/api/v2/main-page/transactions",
    "tx_chart": "/api/v2/stats/charts/transactions",
    "market_chart": "/api/v2/stats/charts/market",
}


# ══════════════════════════════════════════════════════════════════
# 🌐 سلاسل مستقلة — Independent Chain Explorers
# ══════════════════════════════════════════════════════════════════

@dataclass
class IndependentChainConfig(ChainConfig):
    """إعدادات سلسلة مستقلة مع API مخصص"""
    api_base: str = ""
    api_endpoints: Dict[str, str] = field(default_factory=dict)
    # نوع الموقع: api (JSON أولاً) أو html (HTML فقط)
    site_type: str = "api"


INDEPENDENT_CHAINS: Dict[str, IndependentChainConfig] = {
    # ── المجموعة 1: مواقع بـ API مجاني غني ──
    "multiversx": IndependentChainConfig(
        chain_id=508,
        name="MultiversX",
        symbol="EGLD",
        base_url="https://explorer.multiversx.com",
        family=CrawlerFamily.INDEPENDENT,
        api_base="https://api.multiversx.com",
        api_endpoints={
            "stats": "/stats",
            "economics": "/economics",
            "tokens": "/tokens?size=50",
            "accounts": "/accounts?size=50&sort=balance&order=desc",
        },
        request_delay=1.0,
        site_type="api",
    ),
    "tron": IndependentChainConfig(
        chain_id=728126428,
        name="Tron",
        symbol="TRX",
        base_url="https://tronscan.org",
        family=CrawlerFamily.INDEPENDENT,
        api_base="https://apilist.tronscan.org/api",
        api_endpoints={
            "status": "/system/status",
            "accounts": "/account/list?sort=-balance&limit=50&start=0",
        },
        request_delay=1.5,
        site_type="api",
    ),
    "kaspa": IndependentChainConfig(
        chain_id=0,
        name="Kaspa",
        symbol="KAS",
        base_url="https://explorer.kaspa.org",
        family=CrawlerFamily.INDEPENDENT,
        api_base="https://api.kaspa.org",
        api_endpoints={
            "network": "/info/network",
            "supply": "/info/coinsupply",
            "supply_circulating": "/info/coinsupply/circulating",
            "hashrate": "/info/hashrate",
            "blockreward": "/info/blockreward",
        },
        request_delay=1.0,
        site_type="api",
    ),
    "ergo": IndependentChainConfig(
        chain_id=0,
        name="Ergo",
        symbol="ERG",
        base_url="https://explorer.ergoplatform.com",
        family=CrawlerFamily.INDEPENDENT,
        api_base="https://api.ergoplatform.com/api/v1",
        api_endpoints={
            "info": "/networkState",
            "blocks": "/blocks?limit=10",
        },
        request_delay=1.0,
        site_type="api",
    ),
    "decred": IndependentChainConfig(
        chain_id=0,
        name="Decred",
        symbol="DCR",
        base_url="https://dcrdata.decred.org",
        family=CrawlerFamily.INDEPENDENT,
        api_base="https://dcrdata.decred.org/api",
        api_endpoints={
            "status": "/status",
            "supply": "/supply",
            "best_block": "/block/best",
        },
        request_delay=1.0,
        site_type="api",
    ),
    # ── المجموعة 2: مواقع SSR بدون API (زحف HTML) ──
    "xrp": IndependentChainConfig(
        chain_id=0,
        name="XRP",
        symbol="XRP",
        base_url="https://xrpscan.com",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "ton": IndependentChainConfig(
        chain_id=0,
        name="TON",
        symbol="TON",
        base_url="https://tonscan.org",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "stellar": IndependentChainConfig(
        chain_id=0,
        name="Stellar",
        symbol="XLM",
        base_url="https://stellarchain.io",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "mina": IndependentChainConfig(
        chain_id=0,
        name="Mina",
        symbol="MINA",
        base_url="https://minaexplorer.com",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "nervos": IndependentChainConfig(
        chain_id=0,
        name="Nervos",
        symbol="CKB",
        base_url="https://explorer.nervos.org",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "wax": IndependentChainConfig(
        chain_id=0,
        name="Wax",
        symbol="WAXP",
        base_url="https://waxblock.io",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "zilliqa": IndependentChainConfig(
        chain_id=32769,
        name="Zilliqa",
        symbol="ZIL",
        base_url="https://viewblock.io/zilliqa",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "arweave": IndependentChainConfig(
        chain_id=0,
        name="Arweave",
        symbol="AR",
        base_url="https://viewblock.io/arweave",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    # ── المجموعة 3: مواقع SSR مرجعية ──
    "eos": IndependentChainConfig(
        chain_id=0,
        name="EOS",
        symbol="EOS",
        base_url="https://bloks.io",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "waves": IndependentChainConfig(
        chain_id=0,
        name="Waves",
        symbol="WAVES",
        base_url="https://wavesexplorer.com",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "neo": IndependentChainConfig(
        chain_id=0,
        name="NEO",
        symbol="NEO",
        base_url="https://neotube.io",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "ontology": IndependentChainConfig(
        chain_id=0,
        name="Ontology",
        symbol="ONT",
        base_url="https://explorer.ont.io",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "icon": IndependentChainConfig(
        chain_id=0,
        name="Icon",
        symbol="ICX",
        base_url="https://tracker.icon.community",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "flux": IndependentChainConfig(
        chain_id=0,
        name="Flux",
        symbol="FLUX",
        base_url="https://explorer.runonflux.io",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "firo": IndependentChainConfig(
        chain_id=0,
        name="Firo",
        symbol="FIRO",
        base_url="https://explorer.firo.org",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "siacoin": IndependentChainConfig(
        chain_id=0,
        name="Siacoin",
        symbol="SC",
        base_url="https://explore.sia.tech",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "opbnb": IndependentChainConfig(
        chain_id=204,
        name="opBNB",
        symbol="BNB",
        base_url="https://opbnbscan.com",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
    "cronos": IndependentChainConfig(
        chain_id=25,
        name="Cronos",
        symbol="CRO",
        base_url="https://explorer.cronos.org",
        family=CrawlerFamily.INDEPENDENT,
        request_delay=2.5,
        site_type="html",
    ),
}


# ══════════════════════════════════════════════════════════════════
# 🟣 عائلة Subscan — 6 سلاسل Substrate (POST API)
# ══════════════════════════════════════════════════════════════════

@dataclass
class SubscanChainConfig(ChainConfig):
    """إعدادات سلسلة Subscan — POST API"""
    api_subdomain: str = ""  # e.g. "polkadot" → polkadot.api.subscan.io
    token_decimals: int = 10


SUBSCAN_CHAINS: Dict[str, SubscanChainConfig] = {
    "polkadot": SubscanChainConfig(
        chain_id=19,
        name="Polkadot",
        symbol="DOT",
        base_url="https://polkadot.subscan.io",
        family=CrawlerFamily.SUBSCAN,
        api_subdomain="polkadot",
        token_decimals=10,
        request_delay=2.5,
    ),
    "kusama": SubscanChainConfig(
        chain_id=20,
        name="Kusama",
        symbol="KSM",
        base_url="https://kusama.subscan.io",
        family=CrawlerFamily.SUBSCAN,
        api_subdomain="kusama",
        token_decimals=12,
        request_delay=2.5,
    ),
    "astar": SubscanChainConfig(
        chain_id=65,
        name="Astar",
        symbol="ASTR",
        base_url="https://astar.subscan.io",
        family=CrawlerFamily.SUBSCAN,
        api_subdomain="astar",
        token_decimals=18,
        request_delay=2.5,
    ),
    "acala": SubscanChainConfig(
        chain_id=66,
        name="Acala",
        symbol="ACA",
        base_url="https://acala.subscan.io",
        family=CrawlerFamily.SUBSCAN,
        api_subdomain="acala",
        token_decimals=12,
        request_delay=2.5,
    ),
    "phala": SubscanChainConfig(
        chain_id=67,
        name="Phala",
        symbol="PHA",
        base_url="https://phala.subscan.io",
        family=CrawlerFamily.SUBSCAN,
        api_subdomain="phala",
        token_decimals=12,
        request_delay=2.5,
    ),
    "bifrost": SubscanChainConfig(
        chain_id=68,
        name="Bifrost",
        symbol="BNC",
        base_url="https://bifrost.subscan.io",
        family=CrawlerFamily.SUBSCAN,
        api_subdomain="bifrost",
        token_decimals=12,
        request_delay=2.5,
    ),
}

# نقاط API الموحدة لعائلة Subscan (POST)
SUBSCAN_API_ENDPOINTS = {
    "metadata": "/api/scan/metadata",
    "token": "/api/scan/token",
    "daily": "/api/scan/daily",
    "validators": "/api/scan/staking/validators",
}


# ══════════════════════════════════════════════════════════════════
# 🔵 عائلة Cosmos/Mintscan — 12 سلسلة (GET LCD API)
# ══════════════════════════════════════════════════════════════════

@dataclass
class CosmosChainConfig(ChainConfig):
    """إعدادات سلسلة Cosmos — LCD REST API"""
    cosmos_chain_id: str = ""     # e.g. "cosmoshub" → rest.cosmos.directory/cosmoshub
    cosmos_denom: str = ""        # e.g. "uatom"
    token_decimals: int = 6
    mintscan_path: str = ""       # e.g. "cosmos" → mintscan.io/cosmos


COSMOS_CHAINS: Dict[str, CosmosChainConfig] = {
    "cosmos": CosmosChainConfig(
        chain_id=13,
        name="Cosmos Hub",
        symbol="ATOM",
        base_url="https://mintscan.io/cosmos",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="cosmoshub",
        cosmos_denom="uatom",
        token_decimals=6,
        mintscan_path="cosmos",
        request_delay=1.5,
    ),
    "osmosis": CosmosChainConfig(
        chain_id=48,
        name="Osmosis",
        symbol="OSMO",
        base_url="https://mintscan.io/osmosis",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="osmosis",
        cosmos_denom="uosmo",
        token_decimals=6,
        mintscan_path="osmosis",
        request_delay=1.5,
    ),
    "persistence": CosmosChainConfig(
        chain_id=91,
        name="Persistence",
        symbol="XPRT",
        base_url="https://mintscan.io/persistence",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="persistence",
        cosmos_denom="uxprt",
        token_decimals=6,
        mintscan_path="persistence",
        request_delay=1.5,
    ),
    "juno": CosmosChainConfig(
        chain_id=92,
        name="Juno",
        symbol="JUNO",
        base_url="https://mintscan.io/juno",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="juno",
        cosmos_denom="ujuno",
        token_decimals=6,
        mintscan_path="juno",
        request_delay=1.5,
    ),
    "fetchai": CosmosChainConfig(
        chain_id=93,
        name="Fetch.ai",
        symbol="FET",
        base_url="https://mintscan.io/fetchai",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="fetchhub",
        cosmos_denom="afet",
        token_decimals=18,
        mintscan_path="fetchai",
        request_delay=1.5,
    ),
    "axelar": CosmosChainConfig(
        chain_id=94,
        name="Axelar",
        symbol="AXL",
        base_url="https://mintscan.io/axelar",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="axelar",
        cosmos_denom="uaxl",
        token_decimals=6,
        mintscan_path="axelar",
        request_delay=1.5,
    ),
    "band": CosmosChainConfig(
        chain_id=95,
        name="Band Protocol",
        symbol="BAND",
        base_url="https://mintscan.io/band",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="bandchain",
        cosmos_denom="uband",
        token_decimals=6,
        mintscan_path="band",
        request_delay=1.5,
    ),
    "stargaze": CosmosChainConfig(
        chain_id=96,
        name="Stargaze",
        symbol="STARS",
        base_url="https://mintscan.io/stargaze",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="stargaze",
        cosmos_denom="ustars",
        token_decimals=6,
        mintscan_path="stargaze",
        request_delay=1.5,
    ),
    "saga": CosmosChainConfig(
        chain_id=134,
        name="Saga",
        symbol="SAGA",
        base_url="https://mintscan.io/saga",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="saga",
        cosmos_denom="usaga",
        token_decimals=6,
        mintscan_path="saga",
        request_delay=1.5,
    ),
    "neutron": CosmosChainConfig(
        chain_id=135,
        name="Neutron",
        symbol="NTRN",
        base_url="https://mintscan.io/neutron",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="neutron",
        cosmos_denom="untrn",
        token_decimals=6,
        mintscan_path="neutron",
        request_delay=1.5,
    ),
    "injective": CosmosChainConfig(
        chain_id=47,
        name="Injective",
        symbol="INJ",
        base_url="https://explorer.injective.network",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="injective",
        cosmos_denom="inj",
        token_decimals=18,
        mintscan_path="injective",
        request_delay=1.5,
    ),
    "kava": CosmosChainConfig(
        chain_id=49,
        name="Kava",
        symbol="KAVA",
        base_url="https://kavascan.com",
        family=CrawlerFamily.COSMOS,
        cosmos_chain_id="kava",
        cosmos_denom="ukava",
        token_decimals=6,
        mintscan_path="kava",
        request_delay=1.5,
    ),
}

# نقاط LCD الموحدة لعائلة Cosmos
COSMOS_LCD_ENDPOINTS = {
    "blocks_latest": "/cosmos/base/tendermint/v1beta1/blocks/latest",
    "node_info": "/cosmos/base/tendermint/v1beta1/node_info",
    "staking_pool": "/cosmos/staking/v1beta1/pool",
    "staking_params": "/cosmos/staking/v1beta1/params",
    "validators": "/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=20",
}


# ══════════════════════════════════════════════════════════════════
# 🟠 مواقع Level 2 الأخرى — 10 سلاسل (APIs مختلطة)
# ══════════════════════════════════════════════════════════════════

@dataclass
class Level2ChainConfig(ChainConfig):
    """إعدادات سلسلة Level 2 أخرى مع API مخصص"""
    api_base: str = ""
    api_endpoints: Dict[str, str] = field(default_factory=dict)
    api_method: str = "GET"  # GET أو POST
    token_decimals: int = 6
    site_type: str = "api"


LEVEL2_CHAINS: Dict[str, Level2ChainConfig] = {
    "celestia": Level2ChainConfig(
        chain_id=102,
        name="Celestia",
        symbol="TIA",
        base_url="https://celenium.io",
        family=CrawlerFamily.LEVEL2,
        api_base="https://api.celenium.io/v1",
        api_endpoints={
            "head": "/head",
        },
        token_decimals=6,
        request_delay=1.5,
        site_type="api",
    ),
    "stacks": Level2ChainConfig(
        chain_id=51,
        name="Stacks",
        symbol="STX",
        base_url="https://explorer.hiro.so",
        family=CrawlerFamily.LEVEL2,
        api_base="https://api.hiro.so",
        api_endpoints={
            "info": "/v2/info",
            "extended": "/extended/v1/status",
        },
        token_decimals=6,
        request_delay=1.5,
        site_type="api",
    ),
    "litecoin": Level2ChainConfig(
        chain_id=28,
        name="Litecoin",
        symbol="LTC",
        base_url="https://litecoinspace.org",
        family=CrawlerFamily.LEVEL2,
        api_base="https://litecoinspace.org",
        api_endpoints={
            "pools": "/api/v1/mining/pools/1w",
            "difficulty": "/api/v1/difficulty-adjustment",
            "blocks_tip": "/api/blocks/tip/height",
            "hashrate": "/api/v1/mining/hashrate/1w",
        },
        token_decimals=8,
        request_delay=1.5,
        site_type="api",
    ),
    "tezos": Level2ChainConfig(
        chain_id=15,
        name="Tezos",
        symbol="XTZ",
        base_url="https://tzkt.io",
        family=CrawlerFamily.LEVEL2,
        api_base="https://api.tzkt.io/v1",
        api_endpoints={
            "head": "/head",
            "statistics": "/statistics/current",
        },
        token_decimals=6,
        request_delay=1.5,
        site_type="api",
    ),
    "hedera": Level2ChainConfig(
        chain_id=18,
        name="Hedera",
        symbol="HBAR",
        base_url="https://hashscan.io",
        family=CrawlerFamily.LEVEL2,
        api_base="https://mainnet.mirrornode.hedera.com/api/v1",
        api_endpoints={
            "supply": "/network/supply",
            "blocks": "/blocks?limit=1&order=desc",
        },
        token_decimals=8,
        request_delay=1.5,
        site_type="api",
    ),
    "aptos": Level2ChainConfig(
        chain_id=39,
        name="Aptos",
        symbol="APT",
        base_url="https://aptoscan.com",
        family=CrawlerFamily.LEVEL2,
        api_base="https://fullnode.mainnet.aptoslabs.com",
        api_endpoints={
            "ledger": "/v1",
        },
        token_decimals=8,
        request_delay=1.5,
        site_type="api",
    ),
    "iota": Level2ChainConfig(
        chain_id=37,
        name="IOTA",
        symbol="MIOTA",
        base_url="https://explorer.iota.org",
        family=CrawlerFamily.LEVEL2,
        api_base="https://api.stardust-mainnet.iotaledger.net",
        api_endpoints={
            "info": "/api/core/v2/info",
        },
        token_decimals=6,
        request_delay=1.5,
        site_type="api",
    ),
    "telos": Level2ChainConfig(
        chain_id=117,
        name="Telos",
        symbol="TLOS",
        base_url="https://teloscan.io",
        family=CrawlerFamily.LEVEL2,
        api_base="https://mainnet.telos.net",
        api_endpoints={
            "info": "/v1/chain/get_info",
        },
        token_decimals=4,
        request_delay=1.5,
        site_type="api",
    ),
    "radix": Level2ChainConfig(
        chain_id=84,
        name="Radix",
        symbol="XRD",
        base_url="https://dashboard.radixdlt.com",
        family=CrawlerFamily.LEVEL2,
        api_base="https://mainnet.radixdlt.com",
        api_endpoints={
            "status": "/status/gateway-status",
            "config": "/status/network-configuration",
        },
        api_method="POST",
        token_decimals=18,
        request_delay=1.5,
        site_type="api",
    ),
    "theta": Level2ChainConfig(
        chain_id=52,
        name="Theta",
        symbol="THETA",
        base_url="https://explorer.thetatoken.org",
        family=CrawlerFamily.LEVEL2,
        api_base="https://explorer-api.thetatoken.org/api",
        api_endpoints={
            "blocks": "/blocks/top_blocks",
        },
        token_decimals=18,
        request_delay=1.5,
        site_type="api",
    ),
    # ── Bitcoin (3 مصادر API: Blockchair + Blockchain.com + Mempool.space) ──
    "bitcoin": Level2ChainConfig(
        chain_id=0,
        name="Bitcoin",
        symbol="BTC",
        base_url="https://mempool.space",
        family=CrawlerFamily.LEVEL2,
        api_base="https://api.blockchair.com",
        api_endpoints={
            # Blockchair — المصدر الأساسي (32 حقل)
            "blockchair_stats": "/bitcoin/stats",
            # Blockchain.com — إيراد المُعدّنين + حجم التداول (URL كامل)
            "blockchain_stats": "https://api.blockchain.info/stats",
            # Mempool.space — رسوم دقيقة (URL كامل)
            "mempool_fees": "https://mempool.space/api/v1/fees/recommended",
            # Mempool.space — Mining Pools (URL كامل)
            "mempool_pools": "https://mempool.space/api/v1/mining/pools/1w",
            # Mempool.space — Lightning Network (URL كامل)
            "mempool_lightning": "https://mempool.space/api/v1/lightning/statistics/latest",
        },
        token_decimals=8,
        request_delay=3.0,
        site_type="api",
    ),
}


# ══════════════════════════════════════════════════════════════════
# 🌐 إعدادات الزاحف العامة
# ══════════════════════════════════════════════════════════════════

@dataclass
class CrawlerSettings:
    """إعدادات عامة للزاحف"""
    # تأخير بين طلبات نفس الموقع (ثواني)
    default_delay: float = 3.0
    # أقصى عدد محاولات إعادة
    max_retries: int = 5
    # مهلة الاتصال (ثواني)
    request_timeout: int = 30
    # عدد السلاسل التي تُزحف بالتوازي
    max_concurrent_chains: int = 3
    # مجلد حفظ البيانات
    data_dir: str = "crawler/data"
    # مجلد السجلات
    log_dir: str = "crawler/logs"
    # فترة التحديث (دقائق)
    update_interval_minutes: int = 60
    # فترة التحديث الكاملة (ساعات)
    full_update_interval_hours: int = 6


# قائمة User-Agents للتدوير
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
]

# الصفحات المطلوب زحفها من مواقع Etherscan
ETHERSCAN_PAGES = {
    "homepage": "/",
    "charts": "/charts",
    "accounts": "/accounts",
    "tokens": "/tokens",
    "gas_tracker": "/gastracker",
    "blocks": "/blocks",
    "supply": "/stat/supply",
    "node_tracker": "/nodetracker",
    "dex": "/dex",
}

# ══════════════════════════════════════════════════════════════════
# 📈 صفحات الرسوم البيانية — تُجلب عبر DrissionPage (browser automation)
# Etherscan chart pages are protected by Cloudflare. We use DrissionPage
# to bypass it with a real browser. Fallback: CoinGecko + DeFiLlama.
# See: crawler/browser_fetcher.py
# ══════════════════════════════════════════════════════════════════

DEFAULT_SETTINGS = CrawlerSettings()
