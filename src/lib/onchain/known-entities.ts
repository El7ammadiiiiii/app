/**
 * Known Entities Classifier
 * Maps blockchain addresses to known entities (exchanges, protocols, exploiters, etc.)
 */

export interface KnownEntity
{
    address: string;
    name: string;
    type: 'exchange' | 'protocol' | 'exploiter' | 'bridge' | 'institution' | 'token' | 'system' | 'wallet';
    icon: string;
}

export interface EntityClassification
{
    name: string;
    type: string;
    iconUrl: string;
    color: string;
    isKnown: boolean;
}

// Entity type colors
const TYPE_COLORS: Record<string, string> = {
    exchange: '#3b82f6',      // Blue
    protocol: '#8b5cf6',      // Purple
    exploiter: '#ef4444',     // Red
    bridge: '#f97316',        // Orange
    institution: '#06b6d4',   // Cyan
    lending: '#10b981',       // Green
    dex: '#22c55e',          // Green
    token: '#fbbf24',        // Yellow
    system: '#6b7280',       // Gray
    wallet: '#64748b',       // Slate
    generic: '#475569'       // Slate 600
};

// Icon mapping
const ICON_MAPPING: Record<string, string> = {
    exchange: '/icons/entities/exchange.svg',
    protocol: '/icons/entities/protocol.svg',
    exploiter: '/icons/entities/exploiter.svg',
    bridge: '/icons/entities/bridge.svg',
    institution: '/icons/entities/institution.svg',
    lending: '/icons/entities/lending.svg',
    dex: '/icons/entities/dex.svg',
    token: '/icons/entities/token.svg',
    system: '/icons/entities/generic.svg',
    wallet: '/icons/entities/wallet.svg',
    generic: '/icons/entities/generic.svg'
};

let entitiesData: Record<string, KnownEntity[]> | null = null;
let addressMap: Map<string, KnownEntity> | null = null;

/**
 * Load entities data from JSON file
 */
async function loadEntitiesData (): Promise<void>
{
    if ( entitiesData ) return;

    try
    {
        const response = await fetch( '/data/known-entities.json' );
        entitiesData = await response.json();

        // Build address map for fast lookup
        addressMap = new Map();
        Object.values( entitiesData ).flat().forEach( entity =>
        {
            addressMap!.set( entity.address.toLowerCase(), entity );
        } );
    } catch ( error )
    {
        console.error( 'Failed to load known entities:', error );
        entitiesData = {};
        addressMap = new Map();
    }
}

/**
 * Classify an address
 */
export async function classifyAddress ( address: string ): Promise<EntityClassification>
{
    await loadEntitiesData();

    const normalized = address.toLowerCase();
    const entity = addressMap?.get( normalized );

    if ( entity )
    {
        return {
            name: entity.name,
            type: entity.type,
            iconUrl: ICON_MAPPING[ entity.icon ] || ICON_MAPPING.generic,
            color: TYPE_COLORS[ entity.type ] || TYPE_COLORS.generic,
            isKnown: true
        };
    }

    // Unknown address
    return {
        name: `Unknown ${ shortenAddress( address ) }`,
        type: 'wallet',
        iconUrl: ICON_MAPPING.wallet,
        color: TYPE_COLORS.wallet,
        isKnown: false
    };
}

/**
 * Search entities by name
 */
export async function searchEntityByName ( query: string ): Promise<KnownEntity[]>
{
    await loadEntitiesData();

    const lowerQuery = query.toLowerCase();
    const results: KnownEntity[] = [];

    Object.values( entitiesData || {} ).flat().forEach( entity =>
    {
        if ( entity.name.toLowerCase().includes( lowerQuery ) )
        {
            results.push( entity );
        }
    } );

    return results;
}

/**
 * Get all entities by type
 */
export async function getEntitiesByType ( type: string ): Promise<KnownEntity[]>
{
    await loadEntitiesData();

    const category = Object.keys( entitiesData || {} ).find( key =>
        key.toLowerCase().includes( type.toLowerCase() )
    );

    return category ? ( entitiesData?.[ category ] || [] ) : [];
}

/**
 * Shorten address for display
 */
function shortenAddress ( address: string ): string
{
    if ( !address || address.length < 10 ) return address;
    return `${ address.slice( 0, 6 ) }...${ address.slice( -4 ) }`;
}

/**
 * Get color for entity type
 */
export function getEntityColor ( type: string ): string
{
    return TYPE_COLORS[ type ] || TYPE_COLORS.generic;
}

/**
 * Get icon URL for entity type
 */
export function getEntityIcon ( type: string ): string
{
    return ICON_MAPPING[ type ] || ICON_MAPPING.generic;
}

/**
 * Preload entities data (call on app initialization)
 */
export function preloadEntities (): void
{
    loadEntitiesData();
}
