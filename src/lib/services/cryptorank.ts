// ─── Types ────────────────────────────────────────────

export interface ContractInfo
{
  platformName?: string;
  platform?: string | { id: number; key: string; name: string };
  address: string;
  decimals?: number;
}

export interface ProjectLink
{
  type: string;
  url: string;
}

export interface CrowdsaleInfo
{
  type: string;
  start: string;
  end: string;
  status: string;
  platformKey?: string | null;
  platformName?: string | null;
  tokensForSale?: number | null;
  lockupPeriod?: string | null;
  price?: number | null;
  raise?: number | null;
  valuation?: number | null;
  roi?: { value: string; percentChange: string } | null;
}

export interface AllocationSlice
{
  title: string;
  percent: number;
}

export interface IcoData
{
  raised?: number | null;
  raisedPublic?: number | null;
  raisedPrivate?: number | null;
  additionalLinks?: { href: string; title: string }[];
  allocationChart?: AllocationSlice[];
  description?: string | null;
  tokensForSale?: number | null;
}

export interface LaunchpadInfo
{
  key: string;
  name: string;
  image?: string | null;
}

export interface FundInfo
{
  key: string;
  name: string;
  tier?: string | null;
  image?: string | null;
  isLead?: boolean;
}

export interface TagInfo
{
  key: string;
  name: string;
}

export interface BlockchainInfo
{
  key: string;
  name: string;
  image?: string | null;
}

export interface TokenSaleProject
{
  id: number;
  key: string;
  name: string;
  symbol: string;
  lifeCycle: "scheduled" | "funding" | "crowdsale" | "traded" | "inactive";
  type?: string;
  rank?: number | null;
  categoryId?: number;
  categoryName?: string | null;
  categoryKey?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  crowdsales?: CrowdsaleInfo[];
  icoData?: IcoData | null;
  totalRaised?: number | null;
  launchpads?: LaunchpadInfo[];
  funds?: FundInfo[];
  tags?: TagInfo[];
  saleType?: string[];
  salePrice?: number | null;
  roi?: number | null;
  athRoi?: number | null;
  initialCap?: number | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  listingDate?: string | null;
  blockchains?: BlockchainInfo[];
  images?: {
    x60: string;
    x150: string;
    icon: string;
    native: string;
  };
  price?: string | null;
  marketCap?: string | null;
  volume24h?: string | null;
  fullyDilutedValuation?: string | null;
  percentChange?: {
    h24?: string | null;
    d7?: string | null;
    d30?: string | null;
  };
  hasCrowdsales?: boolean;
  hasFundingRounds?: boolean;
  hasTeam?: boolean;
  hasVesting?: boolean;
  hasNextUnlock?: boolean;
  hasLaunchpools?: boolean;
  totalSupply?: string | null;
  maxSupply?: string | null;
  circulatingSupply?: string | null;
  createdAt?: number;
  contracts?: ContractInfo[];
  links?: ProjectLink[];
  ath?: { date: number; value: string; percentChange: string };
  atl?: { date: number; value: string; percentChange: string };
}

export interface TokenSaleListResponse
{
  projects: TokenSaleProject[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectDetail
{
  id: number;
  key: string;
  symbol: string;
  name: string;
  type: string;
  rank: number | null;
  categoryId?: number;
  categoryName?: string | null;
  categoryKey?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  crowdsales?: CrowdsaleInfo[];
  icoData?: IcoData | null;
  totalRaised?: number | null;
  launchpads?: LaunchpadInfo[];
  funds?: FundInfo[];
  tags?: TagInfo[];
  saleType?: string[];
  salePrice?: number | null;
  roi?: number | null;
  athRoi?: number | null;
  initialCap?: number | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  listingDate?: string | null;
  blockchains?: BlockchainInfo[];
  lifeCycle?: string;
  totalSupply: string | null;
  maxSupply: string | null;
  circulatingSupply: string | null;
  volume24hBase?: string | null;
  percentChange: {
    h24?: string | null;
    d7?: string | null;
    d30?: string | null;
    m3?: string | null;
    m6?: string | null;
  };
  images: {
    x60: string;
    x150: string;
    icon: string;
    native: string;
  };
  price: string | null;
  high24h?: string | null;
  low24h?: string | null;
  volume24h: string | null;
  marketCap: string | null;
  fullyDilutedValuation: string | null;
  hasCrowdsales?: boolean;
  hasFundingRounds?: boolean;
  hasTeam?: boolean;
  hasVesting?: boolean;
  hasNextUnlock?: boolean;
  hasLaunchpools?: boolean;
  contracts?: ContractInfo[];
  links?: ProjectLink[];
  ath?: { date: number; value: string; percentChange: string } | null;
  atl?: { date: number; value: string; percentChange: string } | null;
  createdAt?: number;
}

// ─── API Helpers ──────────────────────────────────────

async function apiFetch<T> ( params: Record<string, string> ): Promise<T>
{
  const qs = new URLSearchParams( params ).toString();
  const res = await fetch( `/api/cryptorank?${ qs }` );
  if ( !res.ok )
  {
    const err = await res.json().catch( () => ( { error: res.statusText } ) );
    throw new Error( err.error || `API Error ${ res.status }` );
  }
  return res.json();
}

// ─── Public Functions ─────────────────────────────────

export async function getTokenSales (
  _tab: string = "all",
  page: number = 1,
  limit: number = 20,
  search: string = ""
): Promise<TokenSaleListResponse>
{
  try
  {
    return await apiFetch<TokenSaleListResponse>( {
      action: "list",
      page: page.toString(),
      limit: limit.toString(),
      ...( search ? { search } : {} ),
    } );
  } catch ( error )
  {
    console.error( "Error fetching token sales:", error );
    return { projects: [], total: 0, page, limit };
  }
}

export async function getProjectDetail (
  id: string | number
): Promise<ProjectDetail | null>
{
  try
  {
    const res = await apiFetch<{ data: ProjectDetail }>( {
      action: "detail",
      id: id.toString(),
    } );
    return res.data;
  } catch ( error )
  {
    console.error( "Error fetching project detail:", error );
    return null;
  }
}

export async function getLaunchpads (): Promise<any[]>
{
  try
  {
    const res = await apiFetch<{ data: any[] }>( { action: "launchpads" } );
    return res.data || [];
  } catch ( error )
  {
    console.error( "Error fetching launchpads:", error );
    return [];
  }
}

// ─── Utilities ────────────────────────────────────────

export function formatUSD ( val: string | number | null | undefined ): string
{
  if ( val == null || val === "" ) return "—";
  const n = typeof val === "string" ? parseFloat( val ) : val;
  if ( isNaN( n ) ) return "—";
  if ( n >= 1e9 ) return `$${ ( n / 1e9 ).toFixed( 2 ) }B`;
  if ( n >= 1e6 ) return `$${ ( n / 1e6 ).toFixed( 2 ) }M`;
  if ( n >= 1e3 ) return `$${ ( n / 1e3 ).toFixed( 2 ) }K`;
  if ( n >= 1 ) return `$${ n.toFixed( 2 ) }`;
  if ( n > 0 ) return `$${ n.toPrecision( 4 ) }`;
  return "$0";
}

export function formatPercent (
  val: string | null | undefined
): { text: string; positive: boolean }
{
  if ( val == null || val === "" ) return { text: "—", positive: true };
  const n = parseFloat( val );
  if ( isNaN( n ) ) return { text: "—", positive: true };
  return { text: `${ n >= 0 ? "+" : "" }${ n.toFixed( 2 ) }%`, positive: n >= 0 };
}

export function formatNumber (
  val: string | number | null | undefined
): string
{
  if ( val == null || val === "" ) return "—";
  const n = typeof val === "string" ? parseFloat( val ) : val;
  if ( isNaN( n ) ) return "—";
  return n.toLocaleString( undefined, { maximumFractionDigits: 0 } );
}

export function lifeCycleLabel ( lc: string ): string
{
  switch ( lc )
  {
    case "crowdsale":
      return "Public Sale";
    case "funding":
      return "Funding";
    case "scheduled":
      return "Scheduled";
    case "traded":
      return "Traded";
    case "inactive":
      return "Inactive";
    default:
      return lc;
  }
}

export function lifeCycleBadgeClass ( lc: string ): string
{
  switch ( lc )
  {
    case "crowdsale":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "funding":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "scheduled":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "traded":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-white/[0.06] text-white/60 border-white/10";
  }
}

export function getCryptoRankUrl ( key: string ): string
{
  return `https://cryptorank.io/price/${ key }`;
}

export function getCategoryUrl ( categoryKey: string ): string
{
  return `https://cryptorank.io/cryptocurrencies/category/${ categoryKey }`;
}

export function getContractPlatformName ( contract: ContractInfo ): string
{
  if ( contract.platformName ) return contract.platformName;
  if ( typeof contract.platform === "object" && contract.platform?.name )
    return contract.platform.name;
  if ( typeof contract.platform === "string" ) return contract.platform;
  return "Unknown";
}

export function formatCompactDate ( dateStr: string | null | undefined ): string
{
  if ( !dateStr ) return "—";
  const d = new Date( dateStr );
  if ( isNaN( d.getTime() ) ) return dateStr;
  return d.toLocaleDateString( "en-US", { day: "numeric", month: "short", year: "numeric" } );
}

export function getLinkLabel ( type: string ): string
{
  const map: Record<string, string> = {
    web: "Website",
    twitter: "X",
    telegram: "Telegram",
    discord: "Discord",
    github: "GitHub",
    gitbook: "Gitbook",
    medium: "Medium",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    reddit: "Reddit",
    facebook: "Facebook",
    instagram: "Instagram",
    explorer: "Explorer",
    cryptorank: "CryptoRank",
  };
  return map[ type.toLowerCase() ] || type;
}

export function getExplorerUrl ( contract: ContractInfo ): string | null
{
  const platform = getContractPlatformName( contract ).toLowerCase();
  const addr = contract.address;
  if ( !addr ) return null;

  if ( platform.includes( "ethereum" ) || platform.includes( "erc" ) )
    return `https://etherscan.io/token/${ addr }`;
  if ( platform.includes( "bsc" ) || platform.includes( "binance smart" ) )
    return `https://bscscan.com/token/${ addr }`;
  if ( platform.includes( "polygon" ) )
    return `https://polygonscan.com/token/${ addr }`;
  if ( platform.includes( "avalanche" ) )
    return `https://snowtrace.io/token/${ addr }`;
  if ( platform.includes( "fantom" ) )
    return `https://ftmscan.com/token/${ addr }`;
  if ( platform.includes( "arbitrum" ) )
    return `https://arbiscan.io/token/${ addr }`;
  if ( platform.includes( "optimism" ) )
    return `https://optimistic.etherscan.io/token/${ addr }`;
  if ( platform.includes( "solana" ) )
    return `https://solscan.io/token/${ addr }`;
  if ( platform.includes( "tron" ) )
    return `https://tronscan.org/#/token20/${ addr }`;
  if ( platform.includes( "base" ) )
    return `https://basescan.org/token/${ addr }`;
  return null;
}
