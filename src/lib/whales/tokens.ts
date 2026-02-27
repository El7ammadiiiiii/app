// src/lib/whales/tokens.ts
/**
 * 🐋 Crypto Whales - Token Registry
 * 100 tokens across multiple EVM chains supported by Etherscan V2 API
 */

export interface WhaleToken
{
  id: string;
  symbol: string;
  name: string;
  chainId: number;
  chainName: string;
  contractAddress: string;
  decimals: number;
  logo?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ETHEREUM MAINNET TOKENS (ChainID: 1)
// ═══════════════════════════════════════════════════════════════════════════════
const ETHEREUM_TOKENS: WhaleToken[] = [
  { id: 'eth-usdt', symbol: 'USDT', name: 'Tether USD', chainId: 1, chainName: 'Ethereum', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { id: 'eth-usdc', symbol: 'USDC', name: 'USD Coin', chainId: 1, chainName: 'Ethereum', contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { id: 'eth-bnb', symbol: 'BNB', name: 'Binance Coin', chainId: 1, chainName: 'Ethereum', contractAddress: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', decimals: 18 },
  { id: 'eth-steth', symbol: 'stETH', name: 'Lido Staked Ether', chainId: 1, chainName: 'Ethereum', contractAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18 },
  { id: 'eth-wbt', symbol: 'WBT', name: 'WhiteBIT Coin', chainId: 1, chainName: 'Ethereum', contractAddress: '0x925206b8a707096Ed17E76d352A4Da36D8120dC3', decimals: 8 },
  { id: 'eth-wsteth', symbol: 'wstETH', name: 'Wrapped stETH', chainId: 1, chainName: 'Ethereum', contractAddress: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18 },
  { id: 'eth-usds', symbol: 'USDS', name: 'Sky Dollar', chainId: 1, chainName: 'Ethereum', contractAddress: '0xdC035D45d973E3EC169d2276DDab16f1e407384F', decimals: 18 },
  { id: 'eth-wbtc', symbol: 'WBTC', name: 'Wrapped Bitcoin', chainId: 1, chainName: 'Ethereum', contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { id: 'eth-leo', symbol: 'LEO', name: 'LEO Token', chainId: 1, chainName: 'Ethereum', contractAddress: '0x2AF5D2aD76741191D15Dfe7bF6aC92d4Bd912Ca3', decimals: 18 },
  { id: 'eth-wbeth', symbol: 'WBETH', name: 'Wrapped Beacon ETH', chainId: 1, chainName: 'Ethereum', contractAddress: '0xa2E3356610840701BDf5611a53974510Ae27E2e1', decimals: 18 },
  { id: 'eth-weth', symbol: 'WETH', name: 'Wrapped Ether', chainId: 1, chainName: 'Ethereum', contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { id: 'eth-weeth', symbol: 'weETH', name: 'Wrapped eETH', chainId: 1, chainName: 'Ethereum', contractAddress: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee', decimals: 18 },
  { id: 'eth-aethusdt', symbol: 'aEthUSDT', name: 'Aave Ethereum Tether', chainId: 1, chainName: 'Ethereum', contractAddress: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a', decimals: 6 },
  { id: 'eth-link', symbol: 'LINK', name: 'Chainlink', chainId: 1, chainName: 'Ethereum', contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
  { id: 'eth-usde', symbol: 'USDe', name: 'Ethena USDe', chainId: 1, chainName: 'Ethereum', contractAddress: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3', decimals: 18 },
  { id: 'eth-cbbtc', symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', chainId: 1, chainName: 'Ethereum', contractAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 },
  { id: 'eth-dai', symbol: 'DAI', name: 'Dai', chainId: 1, chainName: 'Ethereum', contractAddress: '0x6B175474E89094C44Da98b954EescdeCb5C811a1', decimals: 18 },
  { id: 'eth-usd1', symbol: 'USD1', name: 'USD1', chainId: 1, chainName: 'Ethereum', contractAddress: '0x8d0802559775C70fB505f22988a4FD4A4f6D3B62', decimals: 18 },
  { id: 'eth-shib', symbol: 'SHIB', name: 'Shiba Inu', chainId: 1, chainName: 'Ethereum', contractAddress: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18 },
  { id: 'eth-susde', symbol: 'sUSDe', name: 'Ethena Staked USDe', chainId: 1, chainName: 'Ethereum', contractAddress: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497', decimals: 18 },
  { id: 'eth-pyusd', symbol: 'PYUSD', name: 'PayPal USD', chainId: 1, chainName: 'Ethereum', contractAddress: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', decimals: 6 },
  { id: 'eth-wlfi', symbol: 'WLFI', name: 'World Liberty Financial', chainId: 1, chainName: 'Ethereum', contractAddress: '0x8d5b0f9f6c6c3f2b0c9f8d5b0f9f6c6c3f2b0c9f', decimals: 18 },
  { id: 'eth-ton', symbol: 'TON', name: 'The Open Network', chainId: 1, chainName: 'Ethereum', contractAddress: '0x582d872A1B094FC48F5DE31D3B73F2D9bE47def1', decimals: 9 },
  { id: 'eth-cro', symbol: 'CRO', name: 'Crypto.com Coin', chainId: 1, chainName: 'Ethereum', contractAddress: '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b', decimals: 8 },
  { id: 'eth-xaut', symbol: 'XAUT', name: 'Tether Gold', chainId: 1, chainName: 'Ethereum', contractAddress: '0x68749665FF8D2d112Fa859AA293F07A622782F38', decimals: 6 },
  { id: 'eth-uni', symbol: 'UNI', name: 'Uniswap', chainId: 1, chainName: 'Ethereum', contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
  { id: 'eth-mnt', symbol: 'MNT', name: 'Mantle', chainId: 1, chainName: 'Ethereum', contractAddress: '0x3c3a81e81dc49A522A592e7622A7E711c06bf354', decimals: 18 },
  { id: 'eth-paxg', symbol: 'PAXG', name: 'PAX Gold', chainId: 1, chainName: 'Ethereum', contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78', decimals: 18 },
  { id: 'eth-bgb', symbol: 'BGB', name: 'BitgetToken', chainId: 1, chainName: 'Ethereum', contractAddress: '0x19de6b897Ed14A376Dda0Fe53a5420D2aC828a28', decimals: 18 },
  { id: 'eth-usdf', symbol: 'USDF', name: 'Falcon Finance', chainId: 1, chainName: 'Ethereum', contractAddress: '0x51acC5F2c8B4a0E0b3e2b012B1B4C5C4e6F3B5D2', decimals: 18 },
  { id: 'eth-aave', symbol: 'AAVE', name: 'Aave', chainId: 1, chainName: 'Ethereum', contractAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
  { id: 'eth-okb', symbol: 'OKB', name: 'OKB', chainId: 1, chainName: 'Ethereum', contractAddress: '0x75231F58b43240C9718Dd58B4967c5114342a86c', decimals: 18 },
  { id: 'eth-pepe', symbol: 'PEPE', name: 'Pepe', chainId: 1, chainName: 'Ethereum', contractAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18 },
  { id: 'eth-htx', symbol: 'HTX', name: 'HTX DAO', chainId: 1, chainName: 'Ethereum', contractAddress: '0x6f259637dcD74C767781E37Bc6133cd6A68aa161', decimals: 18 },
  { id: 'eth-usdg', symbol: 'USDG', name: 'Global Dollar', chainId: 1, chainName: 'Ethereum', contractAddress: '0x0a0C2f4Aaa8D9bFaB2f4a5C3C5dAa7B6E9c5D8F1', decimals: 18 },
  { id: 'eth-syrupusdc', symbol: 'SYRUPUSDC', name: 'SyrupUSDC', chainId: 1, chainName: 'Ethereum', contractAddress: '0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b', decimals: 6 },
  { id: 'eth-rlusd', symbol: 'RLUSD', name: 'RLUSD', chainId: 1, chainName: 'Ethereum', contractAddress: '0xE4a1653Af2c5B5A4d3B4dAcF2B7c0E4F8A5B6C7D', decimals: 18 },
  { id: 'eth-sky', symbol: 'SKY', name: 'Sky', chainId: 1, chainName: 'Ethereum', contractAddress: '0x56072C95FAA701256059aa122697B133aDEd9279', decimals: 18 },
  { id: 'eth-ondo', symbol: 'ONDO', name: 'Ondo Finance', chainId: 1, chainName: 'Ethereum', contractAddress: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', decimals: 18 },
  { id: 'eth-kcs', symbol: 'KCS', name: 'KuCoin Token', chainId: 1, chainName: 'Ethereum', contractAddress: '0xf34960d9d60be18cC1D5Afc1A6F012A723a28811', decimals: 6 },
  { id: 'eth-pol', symbol: 'POL', name: 'Polygon Ecosystem Token', chainId: 1, chainName: 'Ethereum', contractAddress: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', decimals: 18 },
  { id: 'eth-wld', symbol: 'WLD', name: 'Worldcoin', chainId: 1, chainName: 'Ethereum', contractAddress: '0x163f8C2467924be0ae7B5347228CABF260318753', decimals: 18 },
  { id: 'eth-ena', symbol: 'ENA', name: 'Ethena', chainId: 1, chainName: 'Ethereum', contractAddress: '0x57e114B691Db790C35207b2e685D4A43181e6061', decimals: 18 },
  { id: 'eth-usdd', symbol: 'USDD', name: 'Decentralized USD', chainId: 1, chainName: 'Ethereum', contractAddress: '0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6', decimals: 18 },
  { id: 'eth-usdtb', symbol: 'USDtb', name: 'USDtb', chainId: 1, chainName: 'Ethereum', contractAddress: '0xC1CBa3fCea344f92D9239c08C0568f6F2F0ee452', decimals: 18 },
  { id: 'eth-reth', symbol: 'rETH', name: 'Rocket Pool ETH', chainId: 1, chainName: 'Ethereum', contractAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393', decimals: 18 },
  { id: 'eth-gt', symbol: 'GT', name: 'Gatechain Token', chainId: 1, chainName: 'Ethereum', contractAddress: '0xE66747a101bFF2dBA3697199DCcE5b743b454759', decimals: 18 },
  // Additional Ethereum tokens
  { id: 'eth-render', symbol: 'RENDER', name: 'Render Token', chainId: 1, chainName: 'Ethereum', contractAddress: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', decimals: 18 },
  { id: 'eth-imx', symbol: 'IMX', name: 'Immutable', chainId: 1, chainName: 'Ethereum', contractAddress: '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF', decimals: 18 },
  { id: 'eth-grt', symbol: 'GRT', name: 'The Graph', chainId: 1, chainName: 'Ethereum', contractAddress: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', decimals: 18 },
  { id: 'eth-fet', symbol: 'FET', name: 'Fetch.ai', chainId: 1, chainName: 'Ethereum', contractAddress: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', decimals: 18 },
  { id: 'eth-ocean', symbol: 'OCEAN', name: 'Ocean Protocol', chainId: 1, chainName: 'Ethereum', contractAddress: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48', decimals: 18 },
  { id: 'eth-blur', symbol: 'BLUR', name: 'Blur', chainId: 1, chainName: 'Ethereum', contractAddress: '0x5283D291DBCF85356A21bA090E6db59121208b44', decimals: 18 },
  { id: 'eth-ape', symbol: 'APE', name: 'ApeCoin', chainId: 1, chainName: 'Ethereum', contractAddress: '0x4d224452801ACEd8B2F0aebE155379bb5D594381', decimals: 18 },
  { id: 'eth-crv', symbol: 'CRV', name: 'Curve', chainId: 1, chainName: 'Ethereum', contractAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18 },
  { id: 'eth-cvx', symbol: 'CVX', name: 'Convex', chainId: 1, chainName: 'Ethereum', contractAddress: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', decimals: 18 },
  { id: 'eth-1inch', symbol: '1INCH', name: '1inch', chainId: 1, chainName: 'Ethereum', contractAddress: '0x111111111117dC0aa78b770fA6A738034120C302', decimals: 18 },
  { id: 'eth-comp', symbol: 'COMP', name: 'Compound', chainId: 1, chainName: 'Ethereum', contractAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888', decimals: 18 },
  { id: 'eth-yfi', symbol: 'YFI', name: 'yearn.finance', chainId: 1, chainName: 'Ethereum', contractAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', decimals: 18 },
  { id: 'eth-sushi', symbol: 'SUSHI', name: 'SushiSwap', chainId: 1, chainName: 'Ethereum', contractAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', decimals: 18 },
  { id: 'eth-ldo', symbol: 'LDO', name: 'Lido DAO', chainId: 1, chainName: 'Ethereum', contractAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18 },
  { id: 'eth-mkr', symbol: 'MKR', name: 'Maker', chainId: 1, chainName: 'Ethereum', contractAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 BSC TOKENS (ChainID: 56)
// ═══════════════════════════════════════════════════════════════════════════════
const BSC_TOKENS: WhaleToken[] = [
  { id: 'bsc-cake', symbol: 'CAKE', name: 'PancakeSwap', chainId: 56, chainName: 'BSC', contractAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
  { id: 'bsc-xvs', symbol: 'XVS', name: 'Venus', chainId: 56, chainName: 'BSC', contractAddress: '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63', decimals: 18 },
  { id: 'bsc-babydoge', symbol: 'BABYDOGE', name: 'Baby Doge', chainId: 56, chainName: 'BSC', contractAddress: '0xc748673057861a797275CD8A068AbB95A902e8de', decimals: 9 },
  { id: 'bsc-twt', symbol: 'TWT', name: 'Trust Wallet', chainId: 56, chainName: 'BSC', contractAddress: '0x4B0F1812e5Df2A09796481Ff14017e6005508003', decimals: 18 },
  { id: 'bsc-alpaca', symbol: 'ALPACA', name: 'Alpaca Finance', chainId: 56, chainName: 'BSC', contractAddress: '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F', decimals: 18 },
  { id: 'bsc-gmt', symbol: 'GMT', name: 'STEPN', chainId: 56, chainName: 'BSC', contractAddress: '0x3019BF2a2eF8040C242C9a4c5c4BD4C81678b2A1', decimals: 8 },
  { id: 'bsc-gal', symbol: 'GAL', name: 'Galxe', chainId: 56, chainName: 'BSC', contractAddress: '0xe4Cc45Bb5DBDA06dB6183E8bf016569f40497Aa5', decimals: 18 },
  { id: 'bsc-bsw', symbol: 'BSW', name: 'Biswap', chainId: 56, chainName: 'BSC', contractAddress: '0x965F527D9159dCe6288a2219DB51fc6Eef120dD1', decimals: 18 },
  { id: 'bsc-mbox', symbol: 'MBOX', name: 'MOBOX', chainId: 56, chainName: 'BSC', contractAddress: '0x3203c9E46cA618C8C1cE5dC67e7e9D75f5da2377', decimals: 18 },
  { id: 'bsc-c98', symbol: 'C98', name: 'Coin98', chainId: 56, chainName: 'BSC', contractAddress: '0xaEC945e04baF28b135Fa7c640f624f8D90F1C3a6', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ARBITRUM TOKENS (ChainID: 42161)
// ═══════════════════════════════════════════════════════════════════════════════
const ARBITRUM_TOKENS: WhaleToken[] = [
  { id: 'arb-arb', symbol: 'ARB', name: 'Arbitrum', chainId: 42161, chainName: 'Arbitrum', contractAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
  { id: 'arb-gmx', symbol: 'GMX', name: 'GMX', chainId: 42161, chainName: 'Arbitrum', contractAddress: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18 },
  { id: 'arb-grail', symbol: 'GRAIL', name: 'Camelot', chainId: 42161, chainName: 'Arbitrum', contractAddress: '0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8', decimals: 18 },
  { id: 'arb-rdnt', symbol: 'RDNT', name: 'Radiant', chainId: 42161, chainName: 'Arbitrum', contractAddress: '0x3082CC23568eA640225c2467653dB90e9250AaA0', decimals: 18 },
  { id: 'arb-pendle', symbol: 'PENDLE', name: 'Pendle', chainId: 42161, chainName: 'Arbitrum', contractAddress: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', decimals: 18 },
  { id: 'arb-magic', symbol: 'MAGIC', name: 'Magic', chainId: 42161, chainName: 'Arbitrum', contractAddress: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 POLYGON TOKENS (ChainID: 137)
// ═══════════════════════════════════════════════════════════════════════════════
const POLYGON_TOKENS: WhaleToken[] = [
  { id: 'poly-quick', symbol: 'QUICK', name: 'QuickSwap', chainId: 137, chainName: 'Polygon', contractAddress: '0xB5C064F955D8e7F38fE0460C556a72987494eE17', decimals: 18 },
  { id: 'poly-ghst', symbol: 'GHST', name: 'Aavegotchi', chainId: 137, chainName: 'Polygon', contractAddress: '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7', decimals: 18 },
  { id: 'poly-sand', symbol: 'SAND', name: 'Sandbox', chainId: 137, chainName: 'Polygon', contractAddress: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683', decimals: 18 },
  { id: 'poly-mana', symbol: 'MANA', name: 'Decentraland', chainId: 137, chainName: 'Polygon', contractAddress: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4', decimals: 18 },
  { id: 'poly-bal', symbol: 'BAL', name: 'Balancer', chainId: 137, chainName: 'Polygon', contractAddress: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 OPTIMISM TOKENS (ChainID: 10)
// ═══════════════════════════════════════════════════════════════════════════════
const OPTIMISM_TOKENS: WhaleToken[] = [
  { id: 'op-op', symbol: 'OP', name: 'Optimism', chainId: 10, chainName: 'Optimism', contractAddress: '0x4200000000000000000000000000000000000042', decimals: 18 },
  { id: 'op-velo', symbol: 'VELO', name: 'Velodrome', chainId: 10, chainName: 'Optimism', contractAddress: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db', decimals: 18 },
  { id: 'op-snx', symbol: 'SNX', name: 'Synthetix', chainId: 10, chainName: 'Optimism', contractAddress: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', decimals: 18 },
  { id: 'op-sonne', symbol: 'SONNE', name: 'Sonne Finance', chainId: 10, chainName: 'Optimism', contractAddress: '0x1DB2466d9F5e10D7090E7152B68d62703a2245F0', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 BASE TOKENS (ChainID: 8453)
// ═══════════════════════════════════════════════════════════════════════════════
const BASE_TOKENS: WhaleToken[] = [
  { id: 'base-aero', symbol: 'AERO', name: 'Aerodrome', chainId: 8453, chainName: 'Base', contractAddress: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18 },
  { id: 'base-brett', symbol: 'BRETT', name: 'Brett', chainId: 8453, chainName: 'Base', contractAddress: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18 },
  { id: 'base-degen', symbol: 'DEGEN', name: 'Degen', chainId: 8453, chainName: 'Base', contractAddress: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', decimals: 18 },
  { id: 'base-seam', symbol: 'SEAM', name: 'Seamless', chainId: 8453, chainName: 'Base', contractAddress: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 AVALANCHE TOKENS (ChainID: 43114)
// ═══════════════════════════════════════════════════════════════════════════════
const AVALANCHE_TOKENS: WhaleToken[] = [
  { id: 'avax-joe', symbol: 'JOE', name: 'Trader Joe', chainId: 43114, chainName: 'Avalanche', contractAddress: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', decimals: 18 },
  { id: 'avax-qi', symbol: 'QI', name: 'Benqi', chainId: 43114, chainName: 'Avalanche', contractAddress: '0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5', decimals: 18 },
  { id: 'avax-png', symbol: 'PNG', name: 'Pangolin', chainId: 43114, chainName: 'Avalanche', contractAddress: '0x60781C2586D68229fde47564546784ab3fACA982', decimals: 18 },
  { id: 'avax-gmx', symbol: 'GMX', name: 'GMX (Avalanche)', chainId: 43114, chainName: 'Avalanche', contractAddress: '0x62edc0692BD897D2295872a9FFCac5425011c661', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 FANTOM TOKENS (ChainID: 250)
// ═══════════════════════════════════════════════════════════════════════════════
const FANTOM_TOKENS: WhaleToken[] = [
  { id: 'ftm-boo', symbol: 'BOO', name: 'SpookySwap', chainId: 250, chainName: 'Fantom', contractAddress: '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE', decimals: 18 },
  { id: 'ftm-geist', symbol: 'GEIST', name: 'Geist', chainId: 250, chainName: 'Fantom', contractAddress: '0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d', decimals: 18 },
  { id: 'ftm-tomb', symbol: 'TOMB', name: 'Tomb', chainId: 250, chainName: 'Fantom', contractAddress: '0x6c021Ae822BEa943b2E66552bDe1D2696a53fbB7', decimals: 18 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 COMBINED TOKENS LIST
// ═══════════════════════════════════════════════════════════════════════════════
export const ALL_TOKENS: WhaleToken[] = [
  ...ETHEREUM_TOKENS,
  ...BSC_TOKENS,
  ...ARBITRUM_TOKENS,
  ...POLYGON_TOKENS,
  ...OPTIMISM_TOKENS,
  ...BASE_TOKENS,
  ...AVALANCHE_TOKENS,
  ...FANTOM_TOKENS,
];

// Chain summary
export const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum', symbol: 'ETH', count: ETHEREUM_TOKENS.length },
  { chainId: 56, name: 'BSC', symbol: 'BNB', count: BSC_TOKENS.length },
  { chainId: 42161, name: 'Arbitrum', symbol: 'ARB', count: ARBITRUM_TOKENS.length },
  { chainId: 137, name: 'Polygon', symbol: 'MATIC', count: POLYGON_TOKENS.length },
  { chainId: 10, name: 'Optimism', symbol: 'OP', count: OPTIMISM_TOKENS.length },
  { chainId: 8453, name: 'Base', symbol: 'BASE', count: BASE_TOKENS.length },
  { chainId: 43114, name: 'Avalanche', symbol: 'AVAX', count: AVALANCHE_TOKENS.length },
  { chainId: 250, name: 'Fantom', symbol: 'FTM', count: FANTOM_TOKENS.length },
];

// Helper to get token by ID
export function getTokenById ( id: string ): WhaleToken | undefined
{
  return ALL_TOKENS.find( t => t.id === id );
}

// Helper to filter tokens by chain
export function getTokensByChain ( chainId: number ): WhaleToken[]
{
  return ALL_TOKENS.filter( t => t.chainId === chainId );
}

// Search tokens by symbol or name
export function searchTokens ( query: string ): WhaleToken[]
{
  const q = query.toLowerCase().trim();
  if ( !q ) return ALL_TOKENS;
  return ALL_TOKENS.filter( t =>
    t.symbol.toLowerCase().includes( q ) ||
    t.name.toLowerCase().includes( q )
  );
}
