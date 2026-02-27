/**
 * 🔧 Chain Explorer Shared Utilities
 * ────────────────────────────────────
 * Consolidates formatters, components, and helpers
 * used across hub and detail pages.
 */

/* ══════ Formatters ══════ */

export const toNumber = ( v: any ): number | null =>
{
    if ( v === null || v === undefined ) return null;
    if ( typeof v === "number" ) return Number.isFinite( v ) ? v : null;
    if ( typeof v === "string" )
    {
        const s = v.replace( /[,$]/g, "" ).trim();
        const m = s.match( /-?\d+(?:\.\d+)?/ );
        if ( !m ) return null;
        const n = Number( m[ 0 ] );
        return Number.isFinite( n ) ? n : null;
    }
    return null;
};

export const fmt = ( n: number, decimals = 0 ): string =>
    n.toLocaleString( "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals } );

export const fmtCompact = ( n: number ): string =>
{
    const abs = Math.abs( n );
    const sign = n < 0 ? "-" : "";
    if ( abs >= 1e12 ) return `${ sign }${ ( abs / 1e12 ).toFixed( 2 ) }T`;
    if ( abs >= 1e9 ) return `${ sign }${ ( abs / 1e9 ).toFixed( 2 ) }B`;
    if ( abs >= 1e6 ) return `${ sign }${ ( abs / 1e6 ).toFixed( 2 ) }M`;
    if ( abs >= 1e3 ) return `${ sign }${ ( abs / 1e3 ).toFixed( 1 ) }K`;
    return `${ sign }${ abs.toFixed( 1 ) }`;
};

export const fmtUSD = ( n: number ): string => `$${ fmtCompact( n ) }`;

export const fmtPct = ( n: number, decimals = 2 ): string =>
    `${ n >= 0 ? "+" : "" }${ n.toFixed( decimals ) }%`;

export const fmtGwei = ( n: number ): string =>
    n < 0.01 ? `${ ( n * 1000 ).toFixed( 1 ) } Mwei` : `${ n.toFixed( 2 ) } Gwei`;

export const fmtSeconds = ( s: number ): string =>
    s < 60 ? `${ s.toFixed( 1 ) }s` : `${ Math.floor( s / 60 ) }m ${ Math.round( s % 60 ) }s`;

/* ══════ Value Checks ══════ */

export const isMissingValue = ( value: any ): boolean =>
{
    if ( value === null || value === undefined ) return true;
    if ( typeof value === "string" )
    {
        const v = value.trim().toLowerCase();
        return v === "" || v === "null" || v === "undefined" || v === "nan" || v === "n/a" || v === "na" || v === "-";
    }
    return false;
};

export const safe = ( v: any, fallback: string = "—" ): string =>
{
    if ( isMissingValue( v ) ) return fallback;
    const n = toNumber( v );
    if ( n !== null ) return fmt( n );
    return String( v );
};

export const safeUSD = ( v: any, fallback: string = "—" ): string =>
{
    const n = toNumber( v );
    return n !== null ? fmtUSD( n ) : fallback;
};

export const safePct = ( v: any, fallback: string = "—" ): string =>
{
    const n = toNumber( v );
    return n !== null ? fmtPct( n ) : fallback;
};

/* ══════ Chain Info ══════ */

export interface ChainMeta
{
    name: string;
    symbol: string;
    color: string;
    family: string;
}

export const CHAIN_REGISTRY: Record<string, ChainMeta> = {
    ethereum: { name: "Ethereum", symbol: "ETH", color: "#627eea", family: "etherscan" },
    polygon: { name: "Polygon", symbol: "MATIC", color: "#8247e5", family: "etherscan" },
    bsc: { name: "BNB Smart Chain", symbol: "BNB", color: "#f0b90b", family: "etherscan" },
    arbitrum: { name: "Arbitrum", symbol: "ETH", color: "#28a0f0", family: "etherscan" },
    optimism: { name: "Optimism", symbol: "ETH", color: "#ff0420", family: "etherscan" },
    base: { name: "Base", symbol: "ETH", color: "#0052ff", family: "etherscan" },
    linea: { name: "Linea", symbol: "ETH", color: "#61dfff", family: "etherscan" },
    scroll: { name: "Scroll", symbol: "ETH", color: "#ffeeda", family: "etherscan" },
    mantle: { name: "Mantle", symbol: "MNT", color: "#000", family: "etherscan" },
    blast: { name: "Blast", symbol: "ETH", color: "#fcfc03", family: "etherscan" },
    celo: { name: "Celo", symbol: "CELO", color: "#35d07f", family: "etherscan" },
    gnosis: { name: "Gnosis", symbol: "xDAI", color: "#04795b", family: "etherscan" },
    moonbeam: { name: "Moonbeam", symbol: "GLMR", color: "#53cbc9", family: "etherscan" },
    moonriver: { name: "Moonriver", symbol: "MOVR", color: "#f2b705", family: "etherscan" },
    polygon_zkevm: { name: "Polygon zkEVM", symbol: "ETH", color: "#7b3fe4", family: "etherscan" },
    taiko: { name: "Taiko", symbol: "ETH", color: "#e81899", family: "etherscan" },
    fraxtal: { name: "Fraxtal", symbol: "frxETH", color: "#00b3ff", family: "etherscan" },
    berachain: { name: "Berachain", symbol: "BERA", color: "#964b00", family: "etherscan" },
    worldcoin: { name: "World Chain", symbol: "WLD", color: "#191919", family: "etherscan" },
    core_dao: { name: "Core DAO", symbol: "CORE", color: "#ff9211", family: "etherscan" },
    harmony: { name: "Harmony", symbol: "ONE", color: "#00aee9", family: "blockscout" },
    manta_pacific: { name: "Manta Pacific", symbol: "ETH", color: "#1f8efa", family: "blockscout" },
    zora: { name: "Zora", symbol: "ETH", color: "#2b5af6", family: "blockscout" },
    bob: { name: "BOB", symbol: "ETH", color: "#f09242", family: "blockscout" },
    bitcoin: { name: "Bitcoin", symbol: "BTC", color: "#f7931a", family: "level2" },
    litecoin: { name: "Litecoin", symbol: "LTC", color: "#bfbbbb", family: "level2" },
    celestia: { name: "Celestia", symbol: "TIA", color: "#7b2bf9", family: "level2" },
    stacks: { name: "Stacks", symbol: "STX", color: "#5546ff", family: "level2" },
    tezos: { name: "Tezos", symbol: "XTZ", color: "#2c7df7", family: "level2" },
    hedera: { name: "Hedera", symbol: "HBAR", color: "#000", family: "level2" },
    aptos: { name: "Aptos", symbol: "APT", color: "#2ed8a4", family: "level2" },
    iota: { name: "IOTA", symbol: "IOTA", color: "#242424", family: "level2" },
    cosmos: { name: "Cosmos", symbol: "ATOM", color: "#2e3148", family: "cosmos" },
    polkadot: { name: "Polkadot", symbol: "DOT", color: "#e6007a", family: "subscan" },
    multiversx: { name: "MultiversX", symbol: "EGLD", color: "#23f7dd", family: "independent" },
    kaspa: { name: "Kaspa", symbol: "KAS", color: "#49eacb", family: "independent" },
    ergo: { name: "Ergo", symbol: "ERG", color: "#ff5722", family: "independent" },
    decred: { name: "Decred", symbol: "DCR", color: "#2ed6a1", family: "independent" },
    radix: { name: "Radix", symbol: "XRD", color: "#052cc0", family: "independent" },
    theta: { name: "Theta", symbol: "THETA", color: "#1abc9c", family: "independent" },
    telos: { name: "Telos", symbol: "TLOS", color: "#571aff", family: "independent" },
};

// Etherscan-family base URLs (for deep-linking chart pages)
export const ETHERSCAN_BASE_URLS: Record<string, string> = {
    ethereum: "https://etherscan.io",
    polygon: "https://polygonscan.com",
    bsc: "https://bscscan.com",
    arbitrum: "https://arbiscan.io",
    optimism: "https://optimistic.etherscan.io",
    base: "https://basescan.org",
    linea: "https://lineascan.build",
    scroll: "https://scrollscan.com",
    mantle: "https://mantlescan.xyz",
    polygon_zkevm: "https://zkevm.polygonscan.com",
    blast: "https://blastscan.io",
    taiko: "https://taikoscan.io",
    fraxtal: "https://fraxscan.com",
    berachain: "https://berascan.com",
    worldcoin: "https://worldscan.org",
    core_dao: "https://scan.coredao.org",
    celo: "https://celoscan.io",
    gnosis: "https://gnosisscan.io",
    moonbeam: "https://moonscan.io",
    moonriver: "https://moonriver.moonscan.io",
};

export function getChainMeta ( key: string ): ChainMeta
{
    return CHAIN_REGISTRY[ key ] || {
        name: key.charAt( 0 ).toUpperCase() + key.slice( 1 ).replace( /_/g, " " ),
        symbol: "?",
        color: "#64748b",
        family: "unknown",
    };
}

export function getExplorerBaseUrl ( chainKey: string ): string | null
{
    return ETHERSCAN_BASE_URLS[ chainKey ] || null;
}

/* ══════ Quality Badge ══════ */

export function qualityColor ( score: number ): string
{
    if ( score >= 65 ) return "text-emerald-400";
    if ( score >= 35 ) return "text-yellow-400";
    return "text-red-400";
}

export function qualityBg ( score: number ): string
{
    if ( score >= 65 ) return "bg-emerald-500/15";
    if ( score >= 35 ) return "bg-yellow-500/15";
    return "bg-red-500/15";
}

export function qualityLabel ( quality: string ): string
{
    switch ( quality )
    {
        case "good": return "Good";
        case "partial": return "Partial";
        case "empty": return "Empty";
        default: return quality;
    }
}
