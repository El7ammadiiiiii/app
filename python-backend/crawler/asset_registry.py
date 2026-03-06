"""
🥩 سجل الأصول الثابت — Asset Registry for StakingRewards Enrichment
═══════════════════════════════════════════════════════════════════════
يحتوي على بيانات ثابتة لـ 200+ أصل قابل للستاكينغ:

  • coingecko_id   → ربط مع CoinGecko API
  • type_keys      → تصنيف (proof-of-stake, liquid-staking, ...)
  • ecosystem_keys → الشبكة الأم (ethereum, cosmos, polkadot, ...)
  • about          → وصف مختصر للأصل

يُستخدم لملء الحقول التي لا يوفرها RSC parser.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class AssetMeta:
    """بيانات ثابتة لأصل واحد."""
    coingecko_id: str = ""
    type_keys: List[str] = field(default_factory=list)
    ecosystem_keys: List[str] = field(default_factory=list)
    about: str = ""


# ═══════════════════════════════════════════════════════
#  ASSET_REGISTRY:  slug (StakingRewards) → AssetMeta
# ═══════════════════════════════════════════════════════
# slug يطابق StakingRewards slug (مثلاً "ethereum", "solana")
# coingecko_id يطابق CoinGecko API id (مثلاً "ethereum", "solana")

ASSET_REGISTRY: Dict[str, AssetMeta] = {

    # ─── Layer-1: Proof of Stake ───────────────────────────────

    "ethereum": AssetMeta(
        coingecko_id="ethereum",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Ethereum is a decentralized platform for smart contracts and dApps. After the Merge (Sep 2022), it runs on Proof-of-Stake with 32 ETH minimum to run a validator.",
    ),
    "solana": AssetMeta(
        coingecko_id="solana",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Solana is a high-performance L1 blockchain using Proof-of-History and Tower BFT consensus. Validators stake SOL to secure the network with ~400ms block times.",
    ),
    "cardano": AssetMeta(
        coingecko_id="cardano",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cardano-ecosystem"],
        about="Cardano uses Ouroboros, a peer-reviewed PoS protocol. Delegators stake ADA to stake pools without locking funds, earning rewards every 5-day epoch.",
    ),
    "polkadot": AssetMeta(
        coingecko_id="polkadot",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Polkadot is a multi-chain protocol enabling cross-chain interoperability through parachains. DOT holders nominate validators via NPoS consensus.",
    ),
    "cosmos": AssetMeta(
        coingecko_id="cosmos",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Cosmos is the Internet of Blockchains, enabling sovereign chains to communicate via IBC. ATOM stakers delegate to validators securing the Cosmos Hub.",
    ),
    "avalanche": AssetMeta(
        coingecko_id="avalanche-2",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["avalanche-ecosystem"],
        about="Avalanche is a high-throughput L1 with sub-second finality using Snowball consensus. Validators stake a minimum of 2000 AVAX to secure the network.",
    ),
    "tron": AssetMeta(
        coingecko_id="tron",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["tron-ecosystem"],
        about="TRON is a delegated PoS blockchain focused on content sharing and entertainment dApps. TRX holders vote for Super Representatives who produce blocks.",
    ),
    "near-protocol": AssetMeta(
        coingecko_id="near",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["near-ecosystem"],
        about="NEAR Protocol is a sharded PoS L1 with Nightshade sharding. Validators stake NEAR to process transactions across dynamic shards.",
    ),
    "aptos": AssetMeta(
        coingecko_id="aptos",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["aptos-ecosystem"],
        about="Aptos is a Move-based L1 blockchain focused on safety and scalability. Validators stake APT and use AptosBFT consensus for parallel transaction execution.",
    ),
    "sui": AssetMeta(
        coingecko_id="sui",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["sui-ecosystem"],
        about="Sui is a Move-based L1 using object-centric architecture for parallel execution. SUI stakers delegate to validators who participate in Mysticeti consensus.",
    ),
    "tezos": AssetMeta(
        coingecko_id="tezos",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["tezos-ecosystem"],
        about="Tezos is a self-amending blockchain with on-chain governance. XTZ holders delegate to bakers who produce blocks and earn staking rewards.",
    ),
    "injective-protocol": AssetMeta(
        coingecko_id="injective-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Injective is a DeFi-focused L1 built on Cosmos SDK. INJ stakers delegate to validators on the Injective Chain, a Tendermint-based optimized exchange layer.",
    ),
    "polygon": AssetMeta(
        coingecko_id="matic-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem", "polygon-ecosystem"],
        about="Polygon PoS is a commit-chain scaling solution for Ethereum. MATIC/POL stakers delegate to validators who checkpoint Polygon blocks to Ethereum mainnet.",
    ),
    "sei-network": AssetMeta(
        coingecko_id="sei-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem", "sei-ecosystem"],
        about="Sei is a high-speed L1 optimized for trading, with built-in order matching engine. SEI stakers secure the Tendermint-based chain with fast finality.",
    ),
    "cronos": AssetMeta(
        coingecko_id="crypto-com-chain",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Cronos (CRO) is the native token of the Crypto.com ecosystem. Validators stake CRO on the Cosmos SDK-based Crypto.org chain.",
    ),
    "bitcoin": AssetMeta(
        coingecko_id="bitcoin",
        type_keys=["bitcoin-and-others"],
        ecosystem_keys=["bitcoin-ecosystem"],
        about="Bitcoin is the original decentralized cryptocurrency using Proof-of-Work. BTC staking is available via wrapped BTC in DeFi and newer BTC staking protocols like Babylon.",
    ),
    "binance-smart-chain": AssetMeta(
        coingecko_id="binancecoin",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["binance-smart-chain-ecosystem"],
        about="BNB Chain is an EVM-compatible L1 with Proof of Staked Authority consensus. BNB holders delegate to validators to earn staking rewards.",
    ),
    "algorand": AssetMeta(
        coingecko_id="algorand",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["algorand-ecosystem"],
        about="Algorand uses Pure Proof-of-Stake (PPoS) where all ALGO holders participate in consensus proportional to their stake without lockups.",
    ),
    "celestia": AssetMeta(
        coingecko_id="celestia",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Celestia is a modular data availability layer for rollups. TIA stakers delegate to validators who ensure blob data availability for L2 chains.",
    ),
    "hedera-hashgraph": AssetMeta(
        coingecko_id="hedera-hashgraph",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["hedera-ecosystem"],
        about="Hedera is an enterprise-grade DLT using hashgraph consensus. HBAR stakers earn rewards through proxy staking to Council-run nodes.",
    ),
    "the-graph": AssetMeta(
        coingecko_id="the-graph",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="The Graph is a decentralized indexing protocol. GRT stakers delegate to Indexers who serve subgraph queries and earn indexing rewards.",
    ),
    "internet-computer": AssetMeta(
        coingecko_id="internet-computer",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["icp-ecosystem"],
        about="Internet Computer (ICP) uses chain-key cryptography for consensus. ICP is locked in the Network Nervous System (NNS) to vote on governance and earn rewards.",
    ),
    "elrond": AssetMeta(
        coingecko_id="elrond-erd-2",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["multiversx-ecosystem"],
        about="MultiversX (formerly Elrond) uses Adaptive State Sharding and SPoS. EGLD stakers delegate to validators across shards to earn staking rewards.",
    ),
    "flow": AssetMeta(
        coingecko_id="flow",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["flow-ecosystem"],
        about="Flow is a fast, developer-friendly blockchain designed for NFTs and games. FLOW stakers delegate to nodes which handle execution, verification, and consensus.",
    ),
    "mina-protocol": AssetMeta(
        coingecko_id="mina-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["mina-ecosystem"],
        about="Mina is the lightest blockchain (~22KB) using zk-SNARKs. MINA stakers delegate to block producers who earn inflationary rewards.",
    ),
    "kusama": AssetMeta(
        coingecko_id="kusama",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Kusama is Polkadot's canary network, testing features before they go live. KSM nominators stake to validators using NPoS for network security.",
    ),
    "osmosis": AssetMeta(
        coingecko_id="osmosis",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Osmosis is the largest Cosmos DEX with superfluid staking. OSMO stakers can simultaneously provide liquidity and stake via delegated validators.",
    ),
    "kava": AssetMeta(
        coingecko_id="kava",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Kava is a DeFi hub combining Cosmos (Tendermint) and EVM. KAVA stakers delegate to validators and can also earn yield through Kava Lend and Kava Swap.",
    ),
    "oasis-network": AssetMeta(
        coingecko_id="oasis-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["oasis-ecosystem"],
        about="Oasis Network is a privacy-first L1 with confidential smart contracts. ROSE stakers delegate to validators who run ParaTime compute layers.",
    ),
    "celo": AssetMeta(
        coingecko_id="celo",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Celo is a mobile-first, carbon-negative L1 focused on financial inclusion. CELO stakers vote for validators and earn epoch rewards every ~5 days.",
    ),
    "zilliqa": AssetMeta(
        coingecko_id="zilliqa",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["zilliqa-ecosystem"],
        about="Zilliqa is a sharded blockchain using pBFT consensus with PoW for sybil resistance. ZIL stakers delegate to SSN (Staked Seed Node) operators.",
    ),
    "iotex": AssetMeta(
        coingecko_id="iotex",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["iotex-ecosystem"],
        about="IoTeX is an EVM-compatible blockchain for IoT devices. IOTX stakers delegate to Roll-DPoS validators who process blocks in a round-robin fashion.",
    ),
    "secret": AssetMeta(
        coingecko_id="secret",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Secret Network enables encrypted smart contracts with privacy-preserving computation. SCRT stakers delegate to validators running TEE (Trusted Execution Environment) nodes.",
    ),
    "akash-network": AssetMeta(
        coingecko_id="akash-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Akash is a decentralized cloud computing marketplace on Cosmos. AKT stakers delegate to validators and earn staking yield plus a share of marketplace fees.",
    ),
    "band-protocol": AssetMeta(
        coingecko_id="band-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Band Protocol is a cross-chain oracle. BAND stakers delegate to validators who provide reliable off-chain data to blockchains via BandChain.",
    ),
    "persistence": AssetMeta(
        coingecko_id="persistence",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Persistence is a Cosmos-based chain enabling liquid staking and DeFi. XPRT stakers delegate to validators on the Persistence chain.",
    ),
    "juno": AssetMeta(
        coingecko_id="juno-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Juno is a permissionless Cosmos chain for CosmWasm smart contracts. JUNO stakers delegate to validators earning epoch rewards.",
    ),
    "stargaze": AssetMeta(
        coingecko_id="stargaze",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Stargaze is a Cosmos-native NFT marketplace and launchpad. STARS stakers delegate to validators and earn inflationary rewards.",
    ),
    "stride": AssetMeta(
        coingecko_id="stride",
        type_keys=["liquid-staking"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Stride is a liquid staking protocol for Cosmos chains. Users stake ATOM, OSMO, etc. for stTokens while earning staking rewards.",
    ),
    "axelar": AssetMeta(
        coingecko_id="axelar",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Axelar is a cross-chain communication network. AXL stakers delegate to validators who relay messages between 50+ connected blockchains.",
    ),
    "fetch-ai": AssetMeta(
        coingecko_id="fetch-ai",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Fetch.ai is a Cosmos SDK chain for autonomous AI agents. FET stakers delegate to validators on the Fetch network.",
    ),
    "dydx": AssetMeta(
        coingecko_id="dydx-chain",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="dYdX Chain is a sovereign Cosmos appchain for perpetual DEX trading. DYDX stakers delegate to validators who run the orderbook matching engine.",
    ),
    "sommelier": AssetMeta(
        coingecko_id="sommelier",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Sommelier is a DeFi vault management protocol on Cosmos. SOMM stakers delegate to validators who manage cross-chain yield strategies.",
    ),
    "terra-luna-2": AssetMeta(
        coingecko_id="terra-luna-2",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Terra 2.0 (LUNA) is the revived Terra blockchain post-collapse. LUNA stakers delegate to validators on the Cosmos SDK-based chain.",
    ),
    "stacks": AssetMeta(
        coingecko_id="blockstack",
        type_keys=["bitcoin-and-others"],
        ecosystem_keys=["bitcoin-ecosystem"],
        about="Stacks brings smart contracts to Bitcoin via Proof of Transfer (PoX). STX stackers lock tokens to earn BTC rewards from miners.",
    ),
    "ton": AssetMeta(
        coingecko_id="the-open-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ton-ecosystem"],
        about="TON (The Open Network) is a high-speed multi-chain platform originally designed by Telegram. TON stakers delegate to validators on the masterchain.",
    ),

    # ─── Layer-1: Additional PoS Chains ───────────────────────

    "fantom": AssetMeta(
        coingecko_id="fantom",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["fantom-ecosystem"],
        about="Fantom is a DAG-based L1 with Lachesis aBFT consensus. FTM stakers delegate to validators with a minimum lock of 1 FTM.",
    ),
    "harmony": AssetMeta(
        coingecko_id="harmony",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["harmony-ecosystem"],
        about="Harmony is a sharded PoS L1 with 2-second finality. ONE stakers delegate to validators across 4 shards.",
    ),
    "astar": AssetMeta(
        coingecko_id="astar",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Astar is Polkadot's leading smart contract hub supporting EVM and WASM. ASTR stakers can dApp stake to earn rewards for both staker and developer.",
    ),
    "moonbeam": AssetMeta(
        coingecko_id="moonbeam",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Moonbeam is an Ethereum-compatible parachain on Polkadot. GLMR stakers delegate to collators who produce blocks.",
    ),
    "moonriver": AssetMeta(
        coingecko_id="moonriver",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["kusama-ecosystem", "polkadot-ecosystem"],
        about="Moonriver is Moonbeam's companion network on Kusama. MOVR stakers delegate to collators for block production rewards.",
    ),
    "acala": AssetMeta(
        coingecko_id="acala",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Acala is the DeFi hub of Polkadot, offering DEX, liquid staking (LDOT), and aUSD stablecoin. ACA stakers participate in governance and staking.",
    ),
    "edgeware": AssetMeta(
        coingecko_id="edgeware",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Edgeware is a WASM-based smart contract chain in the Polkadot ecosystem. EDG stakers nominate validators via NPoS.",
    ),
    "radix": AssetMeta(
        coingecko_id="radix",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["radix-ecosystem"],
        about="Radix is an L1 built for DeFi with Cerberus consensus and Scrypto language. XRD stakers delegate to validator nodes to earn emission rewards.",
    ),
    "icon": AssetMeta(
        coingecko_id="icon",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["icon-ecosystem"],
        about="ICON is a cross-chain interoperability network. ICX stakers delegate to P-Reps (validators) who produce blocks and govern the network.",
    ),
    "ontology": AssetMeta(
        coingecko_id="ontology",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ontology-ecosystem"],
        about="Ontology is an enterprise L1 for decentralized identity and data. ONT stakers delegate to consensus nodes earning ONG gas rewards.",
    ),
    "theta-network": AssetMeta(
        coingecko_id="theta-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["theta-ecosystem"],
        about="Theta is a decentralized video streaming network. THETA stakers delegate to Guardian and Validator nodes, earning TFUEL as rewards.",
    ),
    "vechain": AssetMeta(
        coingecko_id="vechain",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["vechain-ecosystem"],
        about="VeChain is an enterprise L1 for supply chain and sustainability. VET holders generate VTHO through Proof of Authority staking.",
    ),
    "waves": AssetMeta(
        coingecko_id="waves",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["waves-ecosystem"],
        about="Waves uses LPoS (Leased Proof-of-Stake). WAVES holders can lease tokens to full nodes and share in transaction fee rewards.",
    ),
    "iota": AssetMeta(
        coingecko_id="iota",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["iota-ecosystem"],
        about="IOTA is a DAG-based (Tangle) protocol for IoT. With IOTA 2.0/Shimmer staking, IOTA holders can participate in delegated PoS consensus.",
    ),
    "mantle": AssetMeta(
        coingecko_id="mantle",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Mantle is an Ethereum L2 with optimistic rollup technology. MNT stakers can participate in Mantle's staking/restaking ecosystem.",
    ),
    "kaspa": AssetMeta(
        coingecko_id="kaspa",
        type_keys=["bitcoin-and-others"],
        ecosystem_keys=["kaspa-ecosystem"],
        about="Kaspa is a PoW blockchain using PHANTOM/GhostDAG protocol for parallel block processing. Unlike traditional PoW, it achieves fast finality.",
    ),
    "filecoin": AssetMeta(
        coingecko_id="filecoin",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["filecoin-ecosystem"],
        about="Filecoin is a decentralized storage network. Storage providers stake FIL as collateral to guarantee data storage and earn block rewards.",
    ),

    # ─── Liquid Staking / ReStaking ──────────────────────────

    "lido": AssetMeta(
        coingecko_id="lido-dao",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Lido is the largest liquid staking protocol. Users stake ETH and receive stETH, a liquid receipt token accruing staking rewards without locking.",
    ),
    "rocket-pool": AssetMeta(
        coingecko_id="rocket-pool",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Rocket Pool is a decentralized Ethereum staking protocol. Node operators stake 8 ETH + RPL bond. Stakers receive rETH as liquid staking receipt.",
    ),
    "coinbase-staked-ether": AssetMeta(
        coingecko_id="coinbase-wrapped-staked-eth",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Coinbase cbETH represents staked ETH on Coinbase. It accrues staking rewards automatically and can be used in DeFi.",
    ),
    "frax-ether": AssetMeta(
        coingecko_id="frax-ether",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Frax Ether is Frax Finance's liquid staking product. frxETH can be staked as sfrxETH to earn the highest validator yield.",
    ),
    "mantle-staked-ether": AssetMeta(
        coingecko_id="mantle-staked-ether",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Mantle mETH is a liquid staking token for Ethereum. Users stake ETH and receive mETH with auto-compounding staking rewards.",
    ),
    "eigenlayer": AssetMeta(
        coingecko_id="eigenlayer",
        type_keys=["liquid-staking", "actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="EigenLayer enables restaking of ETH/LSTs to secure additional services (AVSs). Restakers extend Ethereum's trust to new protocols.",
    ),
    "marinade": AssetMeta(
        coingecko_id="marinade",
        type_keys=["liquid-staking"],
        ecosystem_keys=["solana-ecosystem"],
        about="Marinade is Solana's leading liquid staking protocol. Users stake SOL for mSOL, distributed across 400+ validators for decentralization.",
    ),
    "jito": AssetMeta(
        coingecko_id="jito-governance-token",
        type_keys=["liquid-staking"],
        ecosystem_keys=["solana-ecosystem"],
        about="Jito is Solana's MEV-aware liquid staking protocol. JitoSOL captures MEV tips on top of base staking yield for higher returns.",
    ),
    "benqi-liquid-staked-avax": AssetMeta(
        coingecko_id="benqi-liquid-staked-avax",
        type_keys=["liquid-staking"],
        ecosystem_keys=["avalanche-ecosystem"],
        about="BENQI sAVAX is a liquid staking token on Avalanche. Users stake AVAX and receive sAVAX with auto-compounding validator rewards.",
    ),
    "stakewise": AssetMeta(
        coingecko_id="stakewise",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="StakeWise is a non-custodial Ethereum liquid staking protocol. Users stake ETH and receive osETH, an ERC-20 LST.",
    ),
    "ankr": AssetMeta(
        coingecko_id="ankr",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Ankr provides multi-chain liquid staking (aETHc, aBNBc, etc.) and web3 infrastructure. ANKR token is used for governance and payments.",
    ),
    "swell-network": AssetMeta(
        coingecko_id="swell",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Swell is an Ethereum liquid staking / restaking protocol. swETH accrues staking rewards via decentralized node operators.",
    ),
    "stader": AssetMeta(
        coingecko_id="stader",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Stader Labs offers multi-chain liquid staking (ETHx on Ethereum, BNBx, etc.) with validator diversification and DeFi composability.",
    ),
    "puffer-finance": AssetMeta(
        coingecko_id="puffer-finance",
        type_keys=["liquid-staking", "actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Puffer is a liquid restaking protocol on EigenLayer. pufETH enables ETH staking + restaking rewards with anti-slashing technology.",
    ),
    "ether-fi": AssetMeta(
        coingecko_id="ether-fi",
        type_keys=["liquid-staking", "actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Ether.fi is non-custodial liquid staking and restaking for Ethereum. eETH holders earn both staking and restaking rewards via EigenLayer.",
    ),
    "renzo": AssetMeta(
        coingecko_id="renzo",
        type_keys=["liquid-staking", "actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Renzo is a liquid restaking protocol built on EigenLayer. ezETH provides ETH staking + AVS restaking rewards in one receipt token.",
    ),
    "kelp-dao": AssetMeta(
        coingecko_id="kelp-dao-restaked-eth",
        type_keys=["liquid-staking", "actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Kelp DAO offers rsETH, a liquid restaking token on EigenLayer. Users deposit LSTs and earn staking + restaking + DeFi yields.",
    ),
    "stakestone": AssetMeta(
        coingecko_id="stakestone",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="StakeStone is an omnichain liquid staking protocol. STONE is a yield-bearing ETH asset deployable across multiple chains.",
    ),
    "bedrock": AssetMeta(
        coingecko_id="bedrock-defi",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Bedrock is a multi-asset liquid restaking protocol. uniBTC and uniETH provide liquid restaking for BTC and ETH respectively.",
    ),

    # ─── Actively Validated Services (AVS) ───────────────────

    "symbiotic": AssetMeta(
        coingecko_id="symbiotic",
        type_keys=["actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Symbiotic is a permissionless restaking protocol enabling any ERC-20 to secure services. It offers flexible collateral and operator delegation.",
    ),
    "babylon": AssetMeta(
        coingecko_id="babylon",
        type_keys=["actively-validated-service", "bitcoin-and-others"],
        ecosystem_keys=["bitcoin-ecosystem"],
        about="Babylon enables trustless BTC staking to secure PoS chains. Bitcoin holders can earn yield without bridging or wrapping BTC.",
    ),

    # ─── Stablecoins (yield-bearing) ─────────────────────────

    "ethena": AssetMeta(
        coingecko_id="ethena",
        type_keys=["stablecoin"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Ethena's USDe is a synthetic dollar backed by delta-neutral hedging (staked ETH + short futures). sUSDe earns yield from funding rates.",
    ),
    "maker": AssetMeta(
        coingecko_id="maker",
        type_keys=["stablecoin", "proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="MakerDAO issues DAI stablecoin backed by crypto collateral. MKR governance token holders can stake in DSR (DAI Savings Rate) for yield.",
    ),
    "usual": AssetMeta(
        coingecko_id="usual",
        type_keys=["stablecoin"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Usual is a decentralized stablecoin protocol issuing USD0, backed by real-world assets. Staking USD0++ earns yield from RWA revenue.",
    ),
    "frax": AssetMeta(
        coingecko_id="frax",
        type_keys=["stablecoin"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Frax Finance offers FRAX stablecoin with partial algorithmic stability. sFRAX and sfrxETH provide yield from DeFi and validator rewards.",
    ),
    "aave": AssetMeta(
        coingecko_id="aave",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Aave is the largest DeFi lending protocol. AAVE can be staked in the Safety Module (stkAAVE) to backstop the protocol and earn rewards.",
    ),
    "compound": AssetMeta(
        coingecko_id="compound-governance-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Compound is a DeFi lending protocol. COMP holders govern the protocol; suppliers earn interest by lending assets to borrowers.",
    ),

    # ─── Additional PoS L1s (Extended Coverage) ──────────────

    "story-protocol": AssetMeta(
        coingecko_id="story-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["story-ecosystem"],
        about="Story Protocol is an L1 for programmable IP. IP token stakers delegate to validators to secure the chain and govern IP licensing.",
    ),
    "hyperliquid": AssetMeta(
        coingecko_id="hyperliquid",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["hyperliquid-ecosystem"],
        about="Hyperliquid is a high-performance L1 DEX. HYPE stakers delegate to validators securing the HyperBFT consensus for on-chain perps and spot trading.",
    ),
    "monad": AssetMeta(
        coingecko_id="monad",
        type_keys=["proof-of-stake", "testnet"],
        ecosystem_keys=["monad-ecosystem"],
        about="Monad is an EVM-equivalent L1 with parallel execution for 10,000 TPS. MON stakers will delegate to validators on the PoS chain.",
    ),
    "berachain": AssetMeta(
        coingecko_id="berachain",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["berachain-ecosystem"],
        about="Berachain is an EVM-identical L1 using Proof of Liquidity (PoL). BGT is the governance/staking token earned by providing liquidity.",
    ),
    "sonic": AssetMeta(
        coingecko_id="sonic-3",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["fantom-ecosystem"],
        about="Sonic (formerly Fantom Opera upgrade) is a high-performance L1 with sub-second finality. S token stakers delegate to validators.",
    ),
    "wormhole": AssetMeta(
        coingecko_id="wormhole",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem", "ethereum-ecosystem"],
        about="Wormhole is a cross-chain messaging protocol connecting 30+ blockchains. W token stakers help secure the Guardian network for message validation.",
    ),
    "pyth-network": AssetMeta(
        coingecko_id="pyth-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Pyth Network is a first-party oracle delivering high-frequency price feeds. PYTH stakers participate in data governance and publisher slashing.",
    ),
    "jupiter": AssetMeta(
        coingecko_id="jupiter-exchange-solana",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Jupiter is the leading Solana DEX aggregator. JUP token holders vote in governance, with active stakers earning ASR (Active Staking Rewards).",
    ),
    "ondo-finance": AssetMeta(
        coingecko_id="ondo-finance",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Ondo Finance brings RWA tokenization on-chain. ONDO holders participate in governance of USDY and OUSG yield products.",
    ),
    "shardeum": AssetMeta(
        coingecko_id="shardeum",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["shardeum-ecosystem"],
        about="Shardeum is a dynamically sharded EVM L1. SHM stakers run validator nodes with auto-scaling shards for linear scalability.",
    ),
    "taiko": AssetMeta(
        coingecko_id="taiko",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Taiko is a decentralized Ethereum-equivalent (Type-1) zkEVM rollup. TAIKO stakers participate in proposing and proving blocks.",
    ),
    "zksync": AssetMeta(
        coingecko_id="zksync",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="zkSync Era is an Ethereum L2 using ZK-rollup technology. ZK token holders participate in governance and protocol staking.",
    ),
    "starknet": AssetMeta(
        coingecko_id="starknet",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Starknet is a ZK-rollup L2 on Ethereum using Cairo language for provable computation. STRK staking secures the decentralized sequencer network.",
    ),
    "arbitrum": AssetMeta(
        coingecko_id="arbitrum",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Arbitrum is the largest Ethereum L2 by TVL, using optimistic rollups. ARB stakers participate in governance and upcoming BOLD staking.",
    ),
    "optimism": AssetMeta(
        coingecko_id="optimism",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Optimism is an Ethereum L2 using optimistic rollup with the OP Stack. OP token is used for governance in the Optimism Collective.",
    ),
    "base": AssetMeta(
        coingecko_id="base-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Base is Coinbase's Ethereum L2 built on OP Stack. While BASE token doesn't exist, ETH staking and DeFi yields are available on the chain.",
    ),
    "blast": AssetMeta(
        coingecko_id="blast",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Blast is an Ethereum L2 offering native yield on ETH (staking) and stablecoins (T-Bill). BLAST token is used for governance.",
    ),
    "scroll": AssetMeta(
        coingecko_id="scroll",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Scroll is a zkEVM-based L2 for Ethereum. SCR token enables governance and future staking for the decentralized prover network.",
    ),
    "linea": AssetMeta(
        coingecko_id="linea",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Linea is ConsenSys' zkEVM L2 on Ethereum. It offers Ethereum-native yield and DeFi staking opportunities with EVM-equivalence.",
    ),
    "mode": AssetMeta(
        coingecko_id="mode",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Mode is an Ethereum L2 built on OP Stack focused on DeFi. MODE token enables governance and DeFi yield opportunities.",
    ),
    "mantra": AssetMeta(
        coingecko_id="mantra-dao",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="MANTRA is a Cosmos-based L1 for RWA tokenization. OM stakers delegate to validators securing the MANTRA chain.",
    ),
    "pendle": AssetMeta(
        coingecko_id="pendle",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Pendle is a yield tokenization protocol splitting yield-bearing assets into PT (principal) and YT (yield). vePENDLE stakers earn protocol fees.",
    ),
    "lido-staked-sol": AssetMeta(
        coingecko_id="lido-staked-sol",
        type_keys=["liquid-staking"],
        ecosystem_keys=["solana-ecosystem"],
        about="Lido stSOL was Solana's liquid staking token via Lido. Users stake SOL and receive stSOL for use in Solana DeFi.",
    ),
    "chia": AssetMeta(
        coingecko_id="chia",
        type_keys=["bitcoin-and-others"],
        ecosystem_keys=["chia-ecosystem"],
        about="Chia uses Proof of Space and Time (PoST) consensus. XCH farmers plot storage space and earn block rewards for farming.",
    ),

    # ─── Additional Notable Assets ───────────────────────────

    "render-token": AssetMeta(
        coingecko_id="render-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Render Network provides decentralized GPU rendering. RENDER token enables governance and staking in the compute marketplace.",
    ),
    "chainlink": AssetMeta(
        coingecko_id="chainlink",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Chainlink is the largest oracle network. LINK stakers participate in the Chainlink Staking v0.2 pool to back node operator performance.",
    ),
    "livepeer": AssetMeta(
        coingecko_id="livepeer",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Livepeer is a decentralized video transcoding network on Ethereum. LPT stakers delegate to Orchestrators who perform video transcoding tasks.",
    ),
    "pocket-network": AssetMeta(
        coingecko_id="pocket-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["pocket-ecosystem"],
        about="Pocket Network provides decentralized RPC infrastructure. POKT stakers run nodes that relay API requests for web3 applications.",
    ),
    "thorchain": AssetMeta(
        coingecko_id="thorchain",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="THORChain enables native cross-chain swaps. RUNE stakers bond to validator nodes that secure the chain and facilitate swaps.",
    ),
    "synthetix": AssetMeta(
        coingecko_id="havven",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Synthetix is a derivatives liquidity protocol. SNX stakers mint sUSD and earn trading fees + inflation rewards from the protocol.",
    ),
    "curve-dao-token": AssetMeta(
        coingecko_id="curve-dao-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Curve is the dominant stablecoin DEX. CRV can be locked as veCRV to boost LP rewards, vote on gauge weights, and earn protocol fees.",
    ),
    "uniswap": AssetMeta(
        coingecko_id="uniswap",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Uniswap is the largest DEX by volume. UNI token is used for governance with upcoming fee-switch and UNI staking proposals.",
    ),
    "convex-finance": AssetMeta(
        coingecko_id="convex-finance",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Convex boosts Curve and Frax yields without locking. CVX stakers lock as vlCVX to vote on Curve gauge weights and earn bribes.",
    ),
    "gmx": AssetMeta(
        coingecko_id="gmx",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["arbitrum-ecosystem", "avalanche-ecosystem"],
        about="GMX is a decentralized perps DEX on Arbitrum and Avalanche. GMX stakers earn 30% of protocol fees in ETH/AVAX.",
    ),
    "pancakeswap-token": AssetMeta(
        coingecko_id="pancakeswap-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["binance-smart-chain-ecosystem"],
        about="PancakeSwap is the leading BNB Chain DEX. CAKE holders can lock in veCAKE for governance voting and boosted yield farming rewards.",
    ),
    "sushiswap": AssetMeta(
        coingecko_id="sushi",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="SushiSwap is a multi-chain DEX. xSUSHI stakers earn a portion of swap fees across all deployments.",
    ),
    "raydium": AssetMeta(
        coingecko_id="raydium",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Raydium is a leading Solana AMM with concentrated liquidity. RAY stakers earn protocol fees and AcceleRaytor launchpad rewards.",
    ),
    "orca": AssetMeta(
        coingecko_id="orca",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Orca is a Solana DEX known for its user-friendly interface and concentrated liquidity Whirlpools. ORCA is used for governance.",
    ),
    "lisk": AssetMeta(
        coingecko_id="lisk",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Lisk is a blockchain application platform using DPoS. LSK holders vote for delegates who forge blocks and share rewards.",
    ),
    "neutron": AssetMeta(
        coingecko_id="neutron-3",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Neutron is a permissionless Cosmos smart contract platform secured by Cosmos Hub. NTRN staking helps govern the chain's parameters.",
    ),
    "dymension": AssetMeta(
        coingecko_id="dymension",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Dymension is a network of modular rollups (RollApps) on Cosmos. DYM stakers delegate to validators securing the settlement layer.",
    ),
    "saga": AssetMeta(
        coingecko_id="saga-2",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Saga is a protocol for automatically launching dedicated blockchains (Chainlets). SAGA stakers secure the platform for app-chain deployment.",
    ),
    "archway": AssetMeta(
        coingecko_id="archway",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Archway is a Cosmos chain rewarding developers with a share of gas fees. ARCH stakers delegate to validators and dApp developers earn revenue.",
    ),
    "nibiru": AssetMeta(
        coingecko_id="nibiru",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Nibiru is a Cosmos L1 for DeFi with built-in perps, spot DEX, and staking. NIBI stakers delegate to validators on the Tendermint chain.",
    ),
    "nillion": AssetMeta(
        coingecko_id="nillion",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["nillion-ecosystem"],
        about="Nillion is a decentralized network for secure computation on private data. NIL stakers help secure the blind computation network.",
    ),
    "worldcoin": AssetMeta(
        coingecko_id="worldcoin-wld",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Worldcoin is a digital identity and financial network. WLD token enables governance in the World ID ecosystem.",
    ),
    "ronin": AssetMeta(
        coingecko_id="ronin",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ronin-ecosystem"],
        about="Ronin is an EVM gaming sidechain known for Axie Infinity. RON stakers delegate to validators securing gaming transactions.",
    ),
    "flare": AssetMeta(
        coingecko_id="flare-networks",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["flare-ecosystem"],
        about="Flare is an EVM L1 with native oracle (FTSO) for cross-chain data. FLR stakers delegate to FTSO data providers and earn rewards.",
    ),
    "songbird": AssetMeta(
        coingecko_id="songbird",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["flare-ecosystem"],
        about="Songbird is Flare's canary network for testing. SGB stakers delegate to FTSO providers and earn participation rewards.",
    ),
    "energy-web-token": AssetMeta(
        coingecko_id="energy-web-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ewc-ecosystem"],
        about="Energy Web Chain is a blockchain for the energy sector. EWT stakers participate in Proof of Authority consensus for green energy dApps.",
    ),
    "coreum": AssetMeta(
        coingecko_id="coreum",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Coreum is an enterprise-grade L1 on Cosmos with smart tokens. CORE stakers delegate to validators with fast finality consensus.",
    ),
    "evmos": AssetMeta(
        coingecko_id="evmos",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Evmos is an EVM-compatible chain on Cosmos enabling IBC + Solidity. EVMOS stakers delegate to Tendermint validators earning daily rewards.",
    ),
    "umee": AssetMeta(
        coingecko_id="umee",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Umee (UX) is a Cosmos DeFi hub for cross-chain lending and leveraged staking. UX stakers delegate to validators on the Tendermint chain.",
    ),
    "quickswap": AssetMeta(
        coingecko_id="quickswap",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polygon-ecosystem"],
        about="QuickSwap is the leading DEX on Polygon. QUICK holders can stake in Dragon's Lair (dQUICK) or farm with veQUICK for boosted rewards.",
    ),
    "sxp": AssetMeta(
        coingecko_id="sxp",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["sxp-ecosystem"],
        about="Solar (SXP) is a community-driven DPoS blockchain. SXP stakers vote for delegates who forge blocks in 8-second rounds.",
    ),
    "neon": AssetMeta(
        coingecko_id="neon",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Neon EVM brings Ethereum dApps to Solana. NEON token enables governance and gas payments for EVM transactions on Solana.",
    ),
    "kyber-network-crystal": AssetMeta(
        coingecko_id="kyber-network-crystal",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="KyberSwap is a multi-chain DEX aggregator. KNC holders stake in KyberDAO to vote on fee distributions and earn trading fees.",
    ),
    "1inch": AssetMeta(
        coingecko_id="1inch",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="1inch is a leading DEX aggregator across multiple chains. 1INCH token holders can stake in governance for protocol revenue sharing.",
    ),
    "balancer": AssetMeta(
        coingecko_id="balancer",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Balancer is a programmable liquidity protocol with weighted pools. veBAL (locked BAL+ETH LP) holders vote on gauges and earn fees.",
    ),
    "maverick-protocol": AssetMeta(
        coingecko_id="maverick-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Maverick Protocol offers directional liquidity AMM. veMAV stakers vote on incentive allocation for concentrated liquidity pools.",
    ),
    "arweave": AssetMeta(
        coingecko_id="arweave",
        type_keys=["bitcoin-and-others"],
        ecosystem_keys=["arweave-ecosystem"],
        about="Arweave is a permanent data storage network using Proof of Access. AR token pays for data storage mining with endowment-backed permanence.",
    ),
    "amp": AssetMeta(
        coingecko_id="amp-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Amp is a digital collateral token for the Flexa payment network. AMP stakers provide collateral to guarantee instant crypto payments.",
    ),
    "ssv-network": AssetMeta(
        coingecko_id="ssv-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="SSV Network enables Distributed Validator Technology (DVT) for Ethereum. SSV stakers pay operators to run distributed validators.",
    ),
    "obol-network": AssetMeta(
        coingecko_id="obol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Obol Network provides DVT (Distributed Validator Technology) for Ethereum validators. OBOL enables governance of the multi-operator staking protocol.",
    ),
    "graph-token": AssetMeta(
        coingecko_id="the-graph",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="The Graph indexes blockchain data for querying via subgraphs. GRT delegators stake to Indexers who serve queries and earn indexing rewards.",
    ),
    "polymesh": AssetMeta(
        coingecko_id="polymesh",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polymesh-ecosystem"],
        about="Polymesh is a permissioned L1 for regulated security tokens. POLYX stakers nominate operators who run validator nodes.",
    ),
    "keep-network": AssetMeta(
        coingecko_id="keep-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Keep Network and NuCypher merged into Threshold (T). T stakers run nodes providing encryption, randomness, and tBTC services.",
    ),
    "altlayer": AssetMeta(
        coingecko_id="altlayer",
        type_keys=["actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="AltLayer provides restaked rollups with EigenLayer integration. ALT stakers help secure decentralized sequencers and DA verification.",
    ),
    "omni-network": AssetMeta(
        coingecko_id="omni-network",
        type_keys=["actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Omni Network is an EigenLayer AVS that unifies Ethereum rollups. OMNI stakers secure cross-rollup messaging and interoperability.",
    ),
    "brevis": AssetMeta(
        coingecko_id="brevis",
        type_keys=["actively-validated-service"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Brevis is a ZK coprocessor AVS that enables smart contracts to access and compute over full on-chain data trustlessly.",
    ),

    # ─── Additional Ecosystem Coverage ───────────────────────

    "eclipse": AssetMeta(
        coingecko_id="eclipse-fi",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem", "ethereum-ecosystem"],
        about="Eclipse is a modular L2 combining SVM execution on Ethereum DA. Native staking provides yield for securing the chain.",
    ),
    "gnosis": AssetMeta(
        coingecko_id="gnosis",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Gnosis Chain is an EVM sidechain using Beacon Chain-style PoS. GNO stakers run validators securing the chain, earning xDAI fees.",
    ),
    "injective": AssetMeta(
        coingecko_id="injective-protocol",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Injective is an interoperable L1 for DeFi applications. INJ stakers delegate to validators and earn protocol revenue from exchange fees.",
    ),
    "agoric": AssetMeta(
        coingecko_id="agoric",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Agoric is a Cosmos chain using hardened JavaScript for smart contracts. BLD stakers delegate to validators on the Tendermint chain.",
    ),
    "comdex": AssetMeta(
        coingecko_id="comdex",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Comdex is a DeFi infrastructure layer on Cosmos for synthetic assets. CMDX stakers validate the chain and earn staking rewards.",
    ),
    "sentinel": AssetMeta(
        coingecko_id="sentinel",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Sentinel is a decentralized VPN (dVPN) framework on Cosmos. DVPN stakers delegate to validators and earn inflationary rewards.",
    ),
    "regen-network": AssetMeta(
        coingecko_id="regen",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Regen Network tracks ecological assets and carbon credits on Cosmos. REGEN stakers delegate to validators securing climate data.",
    ),
    "cheqd": AssetMeta(
        coingecko_id="cheqd-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="cheqd is a Cosmos chain for decentralized identity (SSI). CHEQ stakers delegate to validators for verifiable credential infrastructure.",
    ),
    "crescent": AssetMeta(
        coingecko_id="crescent-network",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Crescent is a Cosmos DeFi hub for DEX and liquid staking. bCRE stakers delegate to validators while maintaining DeFi composability.",
    ),
    "mars-protocol": AssetMeta(
        coingecko_id="mars-protocol-a7fcbcfb-fd61-4017-92f0-7ee02571c40d",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Mars Protocol is an autonomous credit protocol on Cosmos. MARS stakers govern risk parameters for lending across Cosmos chains.",
    ),
    "terra-classic": AssetMeta(
        coingecko_id="terra-luna",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="Terra Classic (LUNC) is the original Terra blockchain. LUNC stakers delegate to validators earning staking rewards post-depeg recovery.",
    ),
    "umee-ux": AssetMeta(
        coingecko_id="umee",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["cosmos-ecosystem"],
        about="UX Chain (formerly Umee) offers cross-chain DeFi lending on Cosmos. UX stakers delegate to validators and earn staking yield.",
    ),
    "polkadex": AssetMeta(
        coingecko_id="polkadex",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Polkadex is a decentralized orderbook exchange on Polkadot. PDEX stakers nominate validators for the NPoS consensus.",
    ),
    "bifrost": AssetMeta(
        coingecko_id="bifrost-native-coin",
        type_keys=["liquid-staking"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Bifrost is a liquid staking parachain on Polkadot/Kusama. vTokens (vDOT, vKSM) provide staking rewards + DeFi liquidity.",
    ),
    "parallel-finance": AssetMeta(
        coingecko_id="parallel-finance",
        type_keys=["liquid-staking"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Parallel is a DeFi super-app on Polkadot offering lending, AMM, and liquid staking (sDOT). PARA enables governance.",
    ),
    "equilibrium": AssetMeta(
        coingecko_id="equilibrium-token",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["polkadot-ecosystem"],
        about="Equilibrium is a Polkadot DeFi parachain for cross-chain money markets. EQ stakers provide collateral and earn yields.",
    ),
    "solend": AssetMeta(
        coingecko_id="solend",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Solend is a lending/borrowing protocol on Solana. SLND token holders govern the protocol with staked positions earning interest.",
    ),
    "msol": AssetMeta(
        coingecko_id="msol",
        type_keys=["liquid-staking"],
        ecosystem_keys=["solana-ecosystem"],
        about="mSOL is Marinade Finance's liquid staking token on Solana. It automatically accrues staking rewards while maintaining DeFi liquidity.",
    ),
    "blze": AssetMeta(
        coingecko_id="solblaze",
        type_keys=["liquid-staking"],
        ecosystem_keys=["solana-ecosystem"],
        about="SolBlaze is a Solana liquid staking protocol. bSOL holders earn staking rewards with validator diversification and governance via BLZE.",
    ),
    "sanctum": AssetMeta(
        coingecko_id="sanctum-2",
        type_keys=["liquid-staking"],
        ecosystem_keys=["solana-ecosystem"],
        about="Sanctum is a Solana LST infrastructure protocol enabling custom LSTs and the Infinity pool for any-to-any LST swaps.",
    ),
    "step-finance": AssetMeta(
        coingecko_id="step-finance",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Step Finance is a Solana portfolio dashboard. xSTEP staking earns a share of protocol fees from aggregation and analytics.",
    ),
    "helium": AssetMeta(
        coingecko_id="helium",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["solana-ecosystem"],
        about="Helium is a decentralized wireless network on Solana. HNT stakers delegate to validators securing 5G and IoT hotspot data transfer.",
    ),
    "gitcoin": AssetMeta(
        coingecko_id="gitcoin",
        type_keys=["proof-of-stake"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="Gitcoin funds open-source public goods through quadratic funding. GTC stakers participate in governance of grant allocation.",
    ),
    "ldo": AssetMeta(
        coingecko_id="lido-dao",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="LDO is the governance token of Lido DAO. Holders vote on protocol parameters, node operator selection, and treasury management.",
    ),
    "ethx": AssetMeta(
        coingecko_id="stader-ethx",
        type_keys=["liquid-staking"],
        ecosystem_keys=["ethereum-ecosystem"],
        about="ETHx is Stader's liquid staking token on Ethereum. ETHx holders earn validator rewards with permissionless node operator set.",
    ),
}


def get_asset_meta(slug: str) -> Optional[AssetMeta]:
    """مطابقة slug مع Registry — يحاول عدة أشكال."""
    if slug in ASSET_REGISTRY:
        return ASSET_REGISTRY[slug]
    # محاولة بدون "-protocol", "-network", etc.
    for suffix in ["-protocol", "-network", "-token", "-finance", "-dao"]:
        trimmed = slug.replace(suffix, "")
        if trimmed in ASSET_REGISTRY:
            return ASSET_REGISTRY[trimmed]
    return None


def get_coingecko_ids() -> Dict[str, str]:
    """إرجاع mapping: coingecko_id → stakingrewards_slug"""
    return {
        meta.coingecko_id: slug
        for slug, meta in ASSET_REGISTRY.items()
        if meta.coingecko_id
    }


def get_all_slugs() -> List[str]:
    """كل slugs المسجلة."""
    return list(ASSET_REGISTRY.keys())


def enrich_asset(asset_dict: dict) -> dict:
    """
    إثراء أصل واحد (dict) ببيانات Registry الثابتة.
    يكتب فقط الحقول الفارغة — لا يكتب فوق بيانات crawler.
    """
    slug = asset_dict.get("slug", "")
    meta = get_asset_meta(slug)
    if not meta:
        return asset_dict

    if not asset_dict.get("type_keys"):
        asset_dict["type_keys"] = meta.type_keys
    if not asset_dict.get("ecosystem_keys"):
        asset_dict["ecosystem_keys"] = meta.ecosystem_keys
    if not asset_dict.get("about"):
        asset_dict["about"] = meta.about

    return asset_dict


# ── عدد الأصول ──
REGISTRY_SIZE = len(ASSET_REGISTRY)
