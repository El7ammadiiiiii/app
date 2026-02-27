/**
 * 🦙 Chain Name Map: Crawler key → DeFiLlama chain name
 * ──────────────────────────────────────────────────────
 * DeFiLlama uses its own naming convention. This map lets
 * us look up TVL, protocols, DEX volume etc. from DeFiLlama
 * data using the crawler chain key.
 */

export const CRAWLER_TO_DEFILLAMA: Record<string, string> = {
    ethereum: "Ethereum",
    polygon: "Polygon",
    bsc: "BSC",
    arbitrum: "Arbitrum",
    optimism: "Optimism",
    base: "Base",
    linea: "Linea",
    scroll: "Scroll",
    mantle: "Mantle",
    blast: "Blast",
    celo: "Celo",
    gnosis: "Gnosis",
    moonbeam: "Moonbeam",
    moonriver: "Moonriver",
    polygon_zkevm: "Polygon zkEVM",
    taiko: "Taiko",
    fraxtal: "Fraxtal",
    berachain: "Berachain",
    harmony: "Harmony",
    manta_pacific: "Manta",
    zora: "Zora",
    bob: "BOB",
    bitcoin: "Bitcoin",
    litecoin: "Litecoin",
    celestia: "Celestia",
    stacks: "Stacks",
    tezos: "Tezos",
    hedera: "Hedera",
    aptos: "Aptos",
    iota: "IOTA",
    cosmos: "CosmosHub",
    polkadot: "Polkadot",
    multiversx: "MultiversX",
    kaspa: "Kaspa",
    ergo: "Ergo",
    decred: "Decred",
    radix: "Radix",
    theta: "Theta",
    telos: "Telos",
    worldcoin: "World Chain",
    core_dao: "CORE",
};

/**
 * Build a reverse map: DeFiLlama name (lowercased) → crawler key
 */
const DEFILLAMA_TO_CRAWLER: Record<string, string> = {};
for ( const [ crawlerKey, llamaName ] of Object.entries( CRAWLER_TO_DEFILLAMA ) )
{
    DEFILLAMA_TO_CRAWLER[ llamaName.toLowerCase() ] = crawlerKey;
}

/**
 * Get the DeFiLlama chain name for a given crawler key.
 * Returns undefined if not mapped.
 */
export function getLlamaName ( crawlerKey: string ): string | undefined
{
    return CRAWLER_TO_DEFILLAMA[ crawlerKey ];
}

/**
 * Get the crawler key from a DeFiLlama chain name.
 */
export function getCrawlerKey ( llamaName: string ): string | undefined
{
    return DEFILLAMA_TO_CRAWLER[ llamaName.toLowerCase() ];
}

/**
 * Extract DeFiLlama data for a specific chain from the full __defillama__.json.
 * Returns merged TVL + protocol data for the chain.
 */
export function extractLlamaChainData ( llamaData: any, crawlerKey: string ):
    {
        tvl: number | null;
        tvlChange1d: number | null;
        tvlChange7d: number | null;
        tvlChange1m: number | null;
        protocols: number;
        topProtocols: Array<{ name: string; tvl: number; category: string; }>;
        dexVolume24h: number | null;
        fees24h: number | null;
        stablecoins: number | null;
    } | null
{
    const llamaName = getLlamaName( crawlerKey );
    if ( !llamaName || !llamaData ) return null;

    const result: any = {
        tvl: null,
        tvlChange1d: null,
        tvlChange7d: null,
        tvlChange1m: null,
        protocols: 0,
        topProtocols: [],
        dexVolume24h: null,
        fees24h: null,
        stablecoins: null,
    };

    // TVL from chains section (key is "chains_tvl" in __defillama__.json)
    const tvlArray = llamaData.chains_tvl || llamaData.tvl_by_chain;
    if ( Array.isArray( tvlArray ) )
    {
        const chainTvl = tvlArray.find(
            ( c: any ) => c.name?.toLowerCase() === llamaName.toLowerCase()
        );
        if ( chainTvl )
        {
            result.tvl = chainTvl.tvl ?? null;
            result.tvlChange1d = chainTvl.change_1d ?? null;
            result.tvlChange7d = chainTvl.change_7d ?? null;
            result.tvlChange1m = chainTvl.change_1m ?? null;
        }
    }

    // Protocols (key is "top_protocols" in __defillama__.json)
    const protocolsArray = llamaData.top_protocols || llamaData.protocols;
    if ( Array.isArray( protocolsArray ) )
    {
        const chainProtocols = protocolsArray.filter( ( p: any ) =>
        {
            const chains = p.chains || [];
            return chains.some( ( ch: string ) => ch.toLowerCase() === llamaName.toLowerCase() );
        } );
        result.protocols = chainProtocols.length;
        result.topProtocols = chainProtocols
            .sort( ( a: any, b: any ) => ( b.tvl || 0 ) - ( a.tvl || 0 ) )
            .slice( 0, 10 )
            .map( ( p: any ) => ( {
                name: p.name || "Unknown",
                tvl: p.tvl || 0,
                category: p.category || "Other",
            } ) );
    }

    // DEX volumes — top_dexes are per-protocol; aggregate all DEXes operating on this chain
    const dexArray = llamaData.top_dexes || llamaData.dex_volumes;
    if ( Array.isArray( dexArray ) )
    {
        let totalDex = 0;
        for ( const d of dexArray )
        {
            const chains = d.chains || [];
            if ( chains.some( ( ch: string ) => ch.toLowerCase() === llamaName.toLowerCase() ) )
            {
                totalDex += d.total_24h ?? 0;
            }
        }
        if ( totalDex > 0 ) result.dexVolume24h = totalDex;
    }

    // Fees — top_fees are per-protocol; aggregate all that operate on this chain
    const feesArray = llamaData.top_fees || llamaData.fees;
    if ( Array.isArray( feesArray ) )
    {
        let totalFees = 0;
        for ( const f of feesArray )
        {
            const chains = f.chains || [];
            if ( chains.some( ( ch: string ) => ch.toLowerCase() === llamaName.toLowerCase() ) )
            {
                totalFees += f.total_24h ?? 0;
            }
        }
        if ( totalFees > 0 ) result.fees24h = totalFees;
    }

    // Stablecoins — sum chain_circulating across all stablecoins for this chain
    const stableArray = llamaData.top_stablecoins || llamaData.stablecoins;
    if ( Array.isArray( stableArray ) )
    {
        let totalStable = 0;
        for ( const s of stableArray )
        {
            const chainCirc = s.chain_circulating;
            if ( chainCirc && typeof chainCirc === 'object' )
            {
                // Find matching chain name in chain_circulating keys
                for ( const [ key, val ] of Object.entries( chainCirc ) )
                {
                    if ( key.toLowerCase() === llamaName.toLowerCase() )
                    {
                        totalStable += ( val as number ) || 0;
                    }
                }
            }
        }
        if ( totalStable > 0 ) result.stablecoins = totalStable;
    }

    return result;
}
