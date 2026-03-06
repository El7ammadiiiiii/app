"""
📊 نماذج البيانات الموحدة للزاحف
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class ChartDataPoint:
    """نقطة بيانات في رسم بياني"""
    date: str  # YYYY-MM-DD
    value: float
    timestamp: int = 0  # Unix timestamp ms


@dataclass
class ChartTimeSeries:
    """سلسلة زمنية لرسم بياني تاريخي (30-90 يوم)"""
    metric_key: str  # e.g., 'daily_transactions'
    metric_name: str
    data: List[ChartDataPoint] = field(default_factory=list)
    unit: str = ""
    description: str = ""


@dataclass
class NetworkBasics:
    """الأساسيات الشبكية"""
    total_addresses: Optional[int] = None
    active_addresses_daily: Optional[int] = None
    total_transactions: Optional[int] = None
    tps: Optional[float] = None
    txs_per_day: Optional[int] = None
    total_blocks: Optional[int] = None
    avg_block_time_seconds: Optional[float] = None
    new_addresses_daily: Optional[int] = None
    new_addresses_pct: Optional[float] = None
    blockchain_size_gb: Optional[float] = None  # حجم البلوكتشين بالـ GB


@dataclass
class TransactionMetrics:
    """مقاييس المعاملات"""
    avg_tx_fee_usd: Optional[float] = None
    total_fees_24h: Optional[str] = None  # "267.40 ETH"
    total_fees_24h_usd: Optional[float] = None
    block_rewards_24h: Optional[float] = None  # New field
    gas_price_low: Optional[float] = None
    gas_price_avg: Optional[float] = None
    gas_price_high: Optional[float] = None
    median_tx_fee_usd: Optional[float] = None
    suggested_fee_per_byte: Optional[int] = None  # sat/vB for Bitcoin
    daily_gas_used: Optional[str] = None
    daily_burned: Optional[str] = None
    network_utilization_pct: Optional[float] = None
    pending_txs: Optional[int] = None


@dataclass
class TokenInfo:
    """معلومات توكن واحد"""
    rank: Optional[int] = None
    name: str = ""
    symbol: str = ""
    address: str = ""
    price_usd: Optional[float] = None
    price_change_pct: Optional[float] = None
    volume_24h: Optional[float] = None
    market_cap: Optional[float] = None
    onchain_market_cap: Optional[float] = None
    holders: Optional[int] = None
    holders_change_pct: Optional[float] = None


@dataclass
class TokenMetrics:
    """مقاييس التوكنات والسوق"""
    native_price_usd: Optional[float] = None
    native_price_btc: Optional[float] = None
    native_price_change_pct: Optional[float] = None
    native_market_cap: Optional[float] = None
    market_dominance_pct: Optional[float] = None  # Bitcoin dominance %
    total_token_contracts: Optional[int] = None
    erc20_daily_transfers: Optional[int] = None
    top_tokens: List[TokenInfo] = field(default_factory=list)


@dataclass
class AccountInfo:
    """معلومات حساب/محفظة"""
    rank: int = 0
    address: str = ""
    label: str = ""  # "Binance 7", "Robinhood"
    balance: Optional[float] = None
    balance_usd: Optional[float] = None
    percentage: Optional[float] = None  # % من الإجمالي
    tx_count: Optional[int] = None
    is_contract: bool = False
    is_exchange: bool = False


@dataclass
class WalletMetrics:
    """مقاييس المحافظ والحيازة"""
    top_accounts: List[AccountInfo] = field(default_factory=list)
    total_supply: Optional[float] = None
    supply_details: Dict[str, Any] = field(default_factory=dict)
    # أكبر 10 حاملين كنسبة مئوية
    top10_concentration_pct: Optional[float] = None
    exchange_balances: Dict[str, float] = field(default_factory=dict)


@dataclass
class ContractMetrics:
    """مقاييس العقود الذكية"""
    new_contracts_daily: Optional[int] = None
    verified_contracts_total: Optional[int] = None  # New field
    deployed_contracts_total: Optional[int] = None  # New field
    verified_contracts_daily: Optional[int] = None
    top_gas_guzzlers: List[Dict[str, Any]] = field(default_factory=list)
    staking_balance: Optional[float] = None
    staking_pct: Optional[float] = None


@dataclass
class GasEstimate:
    """تقدير تكلفة عملية"""
    action: str = ""
    cost_usd: Optional[float] = None
    gas_used: Optional[int] = None


@dataclass
class NetworkHealth:
    """صحة الشبكة"""
    total_nodes: Optional[int] = None
    node_growth_24h_pct: Optional[float] = None
    node_growth_7d_pct: Optional[float] = None
    node_growth_30d_pct: Optional[float] = None
    top_countries: List[Dict[str, Any]] = field(default_factory=list)
    top_clients: List[Dict[str, Any]] = field(default_factory=list)
    confirmation_time_seconds: Optional[float] = None
    last_finalized_block: Optional[int] = None
    last_safe_block: Optional[int] = None


@dataclass
class BlockInfo:
    """معلومات بلوك"""
    number: int = 0
    timestamp: str = ""
    txn_count: int = 0
    failed_txn_count: int = 0
    failed_pct: float = 0.0
    gas_used: Optional[int] = None
    gas_limit: Optional[int] = None
    gas_used_pct: float = 0.0
    reward: Optional[float] = None
    builder: str = ""


@dataclass
class LightningMetrics:
    """مقاييس شبكة Lightning (Bitcoin Layer 2)"""
    channel_count: Optional[int] = None
    node_count: Optional[int] = None
    total_capacity_btc: Optional[float] = None
    tor_nodes: Optional[int] = None
    clearnet_nodes: Optional[int] = None
    unannounced_nodes: Optional[int] = None
    avg_capacity_sat: Optional[int] = None
    avg_fee_rate: Optional[int] = None
    avg_base_fee_mtokens: Optional[int] = None
    med_capacity_sat: Optional[int] = None
    med_fee_rate: Optional[int] = None
    clearnet_tor_nodes: Optional[int] = None


@dataclass
class DexTrade:
    """صفقة DEX واحدة"""
    block: Optional[int] = None
    timestamp: str = ""
    action: str = ""  # Buy / Sell / Swap
    token_in: str = ""
    amount_in: Optional[float] = None
    token_out: str = ""
    amount_out: Optional[float] = None
    value_usd: Optional[float] = None
    dex: str = ""


@dataclass
class ChainSnapshot:
    """لقطة كاملة لسلسلة واحدة — تجمع كل المقاييس"""
    chain_name: str = ""
    chain_symbol: str = ""
    chain_id: int = 0
    timestamp: str = ""
    crawler_version: str = "1.0.0"
    
    network: NetworkBasics = field(default_factory=NetworkBasics)
    transactions: TransactionMetrics = field(default_factory=TransactionMetrics)
    tokens: TokenMetrics = field(default_factory=TokenMetrics)
    wallets: WalletMetrics = field(default_factory=WalletMetrics)
    contracts: ContractMetrics = field(default_factory=ContractMetrics)
    health: NetworkHealth = field(default_factory=NetworkHealth)
    lightning: Optional[LightningMetrics] = None  # Bitcoin Lightning Network
    
    # بلوكات حديثة
    recent_blocks: List[BlockInfo] = field(default_factory=list)
    # صفقات DEX حديثة
    recent_dex_trades: List[DexTrade] = field(default_factory=list)
    
    # سلاسل بيانات DeFiLlama (TVL, Vol, Fees, Revenue, Stablecoins)
    defillama_series: Dict[str, ChartTimeSeries] = field(default_factory=dict)
    
    # سلاسل بيانات تاريخية من صفحات الشارتات (Etherscan Charts)
    etherscan_charts: Dict[str, ChartTimeSeries] = field(default_factory=dict)

    # سلاسل بيانات Blockchain.com (Bitcoin فقط)
    blockchain_charts: Dict[str, ChartTimeSeries] = field(default_factory=dict)

    # سلاسل بيانات CryptoQuant (Bitcoin فقط)
    cryptoquant_charts: Dict[str, ChartTimeSeries] = field(default_factory=dict)

    # سلاسل بيانات CryptoQuant Studio (BTC, ETH, XRP, Stablecoins)
    cryptoquant_studio_charts: Dict[str, ChartTimeSeries] = field(default_factory=dict)
    # فئات CryptoQuant Studio (للقائمة الجانبية)
    cryptoquant_studio_categories: List[Dict[str, Any]] = field(default_factory=list)

    # تقديرات تكلفة الغاز
    gas_estimates: List[GasEstimate] = field(default_factory=list)
    
    # حالة الزحف
    pages_crawled: List[str] = field(default_factory=list)
    pages_failed: List[str] = field(default_factory=list)
    crawl_duration_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """تحويل إلى قاموس للحفظ"""
        import dataclasses
        return dataclasses.asdict(self)
