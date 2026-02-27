"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import
{
    getProjectDetail,
    ProjectDetail,
    ContractInfo,
    CrowdsaleInfo,
    formatUSD,
    formatPercent,
    formatNumber,
    formatCompactDate,
    getCryptoRankUrl,
    getLinkLabel,
    getContractPlatformName,
    getExplorerUrl,
} from "@/lib/services/cryptorank";
import
{
    ArrowLeft,
    Globe,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    Copy,
    CheckCircle2,
    BarChart3,
    Layers,
    Shield,
    Coins,
    Tag,
    Calendar,
    Link as LinkIcon,
    DollarSign,
    PieChart,
    Lock,
    Rocket,
    Users,
    BookOpen,
    MessageCircle,
    Github,
} from "lucide-react";

/* ─── helpers ──────────────────────────────────────── */
const linkIcon = ( type: string ) =>
{
    const t = type.toLowerCase();
    if ( t === "web" ) return <Globe className="w-3.5 h-3.5" />;
    if ( t === "twitter" ) return <span className="text-[11px] font-black leading-none">𝕏</span>;
    if ( t === "telegram" ) return <MessageCircle className="w-3.5 h-3.5" />;
    if ( t === "github" ) return <Github className="w-3.5 h-3.5" />;
    if ( t === "gitbook" ) return <BookOpen className="w-3.5 h-3.5" />;
    if ( t === "discord" ) return <Users className="w-3.5 h-3.5" />;
    if ( t === "explorer" ) return <BarChart3 className="w-3.5 h-3.5" />;
    if ( t === "cryptorank" ) return <Globe className="w-3.5 h-3.5" />;
    return <ExternalLink className="w-3.5 h-3.5" />;
};

const chainFromContracts = ( contracts?: ContractInfo[] ): string | null =>
{
    if ( !contracts || contracts.length === 0 ) return null;
    return getContractPlatformName( contracts[ 0 ] );
};

interface ICODetailsProps { id: string; }

export function ICODetails ( { id }: ICODetailsProps )
{
    const router = useRouter();
    const [ project, setProject ] = useState<ProjectDetail | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ activeTab, setActiveTab ] = useState( "overview" );

    useEffect( () =>
    {
        ( async () =>
        {
            setLoading( true );
            try { setProject( await getProjectDetail( id ) ); }
            catch ( e ) { console.error( e ); }
            finally { setLoading( false ); }
        } )();
    }, [ id ] );

    if ( loading ) return (
        <div className="min-h-screen flex items-center justify-center text-white/50">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
            Loading Project Details...
        </div>
    );

    if ( !project ) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white/50 gap-4">
            <p>Project not found or unavailable.</p>
            <button onClick={ () => router.back() } className="text-cyan-400 hover:underline">Go Back</button>
        </div>
    );

    const crowdsales = project.crowdsales || [];
    const icoData = project.icoData;
    const hasFundingData = crowdsales.length > 0 || ( icoData && ( icoData.raised || ( icoData.allocationChart && icoData.allocationChart.length > 0 ) ) ) || project.totalRaised;
    const webLinks = ( project.links || [] ).filter( l => ![ "explorer", "cryptorank" ].includes( l.type ) );
    const explorerLinks = ( project.links || [] ).filter( l => l.type === "explorer" );
    const chain = chainFromContracts( project.contracts ) || project.blockchains?.[ 0 ]?.name || null;
    const firstCrowdsale = crowdsales[ 0 ] || null;
    const catName = typeof project.category === "string" ? project.category : ( project.category as any )?.name || project.categoryName || null;
    const mainLaunchpad = project.launchpads?.[ 0 ]?.name || firstCrowdsale?.platformName || firstCrowdsale?.platformKey || null;

    const tabs = [
        { id: "overview", label: "Overview" },
        ...( hasFundingData ? [ { id: "funding", label: "Funding & ICO" } ] : [] ),
        { id: "market", label: "Market Data" },
        { id: "supply", label: "Supply & Contracts" },
    ];

    return (
        <div className="min-h-screen text-white">
            {/* ─── Sticky Header ─── */ }
            <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
                <div className="max-w-[1800px] mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={ () => router.back() } className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
                                    { project.images?.native
                                        ? <img src={ project.images.native } alt={ project.name } className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">{ project.symbol?.[ 0 ] }</div> }
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                        { project.name }
                                        <span className="text-xs font-mono font-normal text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">{ project.symbol }</span>
                                    </h1>
                                    <p className="text-xs text-white/60">
                                        { project.rank ? `Rank #${ project.rank }` : project.type }
                                        { catName && ` • ${ catName }` }
                                    </p>
                                </div>
                            </div>
                        </div>
                        { project.price && (
                            <div className="text-right">
                                <div className="text-xl font-bold text-white font-mono">{ formatUSD( project.price ) }</div>
                                { project.percentChange?.h24 && <PercentBadge val={ project.percentChange.h24 } label="24h" /> }
                            </div>
                        ) }
                    </div>
                </div>
            </header>

            <main className="max-w-[1800px] mx-auto px-4 py-6">
                {/* ─── Hero Card ─── */ }
                <div className="glass-panel p-5 lg:p-6 mb-5">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl border border-white/10 bg-white/[0.04] p-0.5 overflow-hidden">
                                { project.images?.native
                                    ? <img src={ project.images.native } alt={ project.name } className="w-full h-full object-cover rounded-lg" />
                                    : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white/40">{ project.symbol?.[ 0 ] }</div> }
                            </div>
                            <div>
                                <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
                                    { project.name }
                                    <span className="text-sm font-mono font-normal text-white/60 bg-white/[0.06] px-2 py-0.5 rounded">{ project.symbol }</span>
                                </h2>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    { project.rank && <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/80 text-xs font-mono">Rank #{ project.rank }</span> }
                                    { crowdsales.length > 0 && crowdsales.map( ( cs, i ) => (
                                        <span key={ i } className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 text-xs font-bold uppercase">{ cs.type }</span>
                                    ) ) }
                                    { firstCrowdsale?.status && (
                                        <span className={ `px-2 py-0.5 rounded text-xs font-bold uppercase ${ firstCrowdsale.status === "upcoming" || firstCrowdsale.status === "Active" ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                            : firstCrowdsale.status === "active" ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                : "bg-white/[0.06] text-white/60"
                                            }` }>{ firstCrowdsale.status }</span>
                                    ) }
                                    { catName && (
                                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            { catName }
                                        </span>
                                    ) }
                                    { project.createdAt && (
                                        <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/60 text-xs flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Listed { new Date( project.createdAt * 1000 ).toLocaleDateString( "en-US", { month: "short", year: "numeric" } ) }
                                        </span>
                                    ) }
                                    { project.saleStart && !project.createdAt && (
                                        <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/60 text-xs flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Sale { new Date( project.saleStart ).toLocaleDateString( "en-US", { month: "short", day: "numeric", year: "numeric" } ) }
                                        </span>
                                    ) }
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */ }
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
                            <MiniStat label="Market Cap" value={ formatUSD( project.marketCap ) } />
                            <MiniStat label="24h Volume" value={ formatUSD( project.volume24h ) } />
                            <MiniStat label="FDV" value={ formatUSD( project.fullyDilutedValuation ) } />
                            <MiniStat label="Circ. Supply" value={ formatNumber( project.circulatingSupply ) } />
                        </div>
                    </div>
                </div>

                {/* ─── About ─── */ }
                { project.shortDescription && (
                    <div className="glass-panel p-5 lg:p-6 mb-5">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-cyan-400" /> About { project.name }
                        </h3>
                        <p className="text-sm text-white/70 leading-relaxed">{ project.shortDescription }</p>
                    </div>
                ) }

                {/* ─── Key Info Card (sidebar style) ─── */ }
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                    {/* Info Card */ }
                    <div className="glass-panel p-5 lg:p-6">
                        <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-white/[0.08]">Project Info</h3>
                        <div className="space-y-2.5">
                            <MetricRow label="Category" value={ catName || "—" } />
                            <MetricRow label="Chain" value={ chain || "—" } />
                            { crowdsales.length > 0 && (
                                <MetricRow label="Type" value={ crowdsales.map( cs => cs.type ).join( ", " ) || "—" } />
                            ) }
                            { project.initialCap != null && <MetricRow label="Initial Cap" value={ formatUSD( project.initialCap ) } /> }
                            { firstCrowdsale?.raise != null && <MetricRow label="Raise" value={ formatUSD( firstCrowdsale.raise ) } /> }
                            <MetricRow label="Launchpad" value={ mainLaunchpad || "—" } />
                            <MetricRow label="Total Raised" value={ project.totalRaised ? formatUSD( project.totalRaised ) : "—" } />
                            { project.salePrice != null && <MetricRow label="Sale Price" value={ `$${ project.salePrice }` } /> }
                            { project.roi != null && project.roi > 0 && (
                                <MetricRow label="ROI" value={ `${ project.roi.toFixed( 2 ) }x` } />
                            ) }
                            { project.athRoi != null && project.athRoi > 0 && (
                                <MetricRow label="ATH ROI" value={ `${ project.athRoi.toFixed( 2 ) }x` } />
                            ) }
                        </div>
                    </div>

                    {/* Links Card */ }
                    <div className="glass-panel p-5 lg:p-6">
                        <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-white/[0.08] flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-cyan-400" /> Links
                        </h3>
                        { ( webLinks.length > 0 || project.key ) ? (
                            <div className="flex flex-wrap gap-2">
                                { project.key && (
                                    <LinkBtn href={ getCryptoRankUrl( project.key ) } icon={ <Globe className="w-3.5 h-3.5" /> } label="CryptoRank" accent />
                                ) }
                                { webLinks.map( ( l, i ) => (
                                    <LinkBtn key={ i } href={ l.url } icon={ linkIcon( l.type ) } label={ getLinkLabel( l.type ) } />
                                ) ) }
                                { explorerLinks.slice( 0, 2 ).map( ( l, i ) =>
                                {
                                    const domain = ( () => { try { return new URL( l.url ).hostname.replace( "www.", "" ); } catch { return "Explorer"; } } )();
                                    return <LinkBtn key={ `exp-${ i }` } href={ l.url } icon={ <BarChart3 className="w-3.5 h-3.5" /> } label={ domain } />;
                                } ) }
                            </div>
                        ) : (
                            <p className="text-white/40 text-sm">No links available.</p>
                        ) }
                    </div>

                    {/* Funding Summary Card */ }
                    { hasFundingData && (
                        <div className="glass-panel p-5 lg:p-6">
                            <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-white/[0.08] flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-400" /> Fundraising Info
                            </h3>
                            <div className="space-y-2.5">
                                <MetricRow label="Total Raised" value={ project.totalRaised ? formatUSD( project.totalRaised ) : icoData?.raised ? formatUSD( icoData.raised ) : "—" } />
                                { icoData?.raisedPublic != null && <MetricRow label="Public Sale" value={ formatUSD( icoData.raisedPublic ) } /> }
                                { icoData?.raisedPrivate != null && <MetricRow label="Funding Rounds" value={ formatUSD( icoData.raisedPrivate ) } /> }
                                { crowdsales.length > 0 && <MetricRow label="Rounds" value={ `${ crowdsales.length }` } /> }
                                { firstCrowdsale?.valuation != null && <MetricRow label="Valuation" value={ formatUSD( firstCrowdsale.valuation ) } /> }
                            </div>
                        </div>
                    ) }
                </div>

                {/* Launchpads & Investors row */ }
                { ( ( project.launchpads && project.launchpads.length > 0 ) || ( project.funds && project.funds.length > 0 ) ) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        {/* Launchpads */ }
                        { project.launchpads && project.launchpads.length > 0 && (
                            <div className="glass-panel p-5 lg:p-6">
                                <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-white/[0.08] flex items-center gap-2">
                                    <Rocket className="w-4 h-4 text-orange-400" /> Launchpads
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    { project.launchpads.map( ( lp, i ) => (
                                        <a key={ i } href={ `https://cryptorank.io/ido-platforms/${ lp.key }` }
                                            target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                                            { lp.image && <img src={ lp.image } alt={ lp.name } className="w-5 h-5 rounded-full" /> }
                                            <span className="text-xs text-white/80">{ lp.name }</span>
                                            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
                                        </a>
                                    ) ) }
                                </div>
                            </div>
                        ) }

                        {/* Investors / Funds */ }
                        { project.funds && project.funds.length > 0 && (
                            <div className="glass-panel p-5 lg:p-6">
                                <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-white/[0.08] flex items-center gap-2">
                                    <Users className="w-4 h-4 text-cyan-400" /> Investors ({ project.funds.length })
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    { project.funds.slice( 0, 12 ).map( ( f, i ) => (
                                        <a key={ i } href={ `https://cryptorank.io/funds/${ f.key }` }
                                            target="_blank" rel="noopener noreferrer"
                                            className={ `inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${ f.isLead
                                                ? "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10"
                                                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                                                }` }>
                                            { f.image && <img src={ f.image } alt={ f.name } className="w-5 h-5 rounded-full" /> }
                                            <span className="text-xs text-white/80">{ f.name }</span>
                                            { f.isLead && <span className="text-[9px] text-yellow-400 font-bold">LEAD</span> }
                                        </a>
                                    ) ) }
                                    { project.funds.length > 12 && (
                                        <span className="inline-flex items-center px-3 py-2 text-xs text-white/40">+{ project.funds.length - 12 } more</span>
                                    ) }
                                </div>
                            </div>
                        ) }
                    </div>
                ) }

                {/* ─── Tabs ─── */ }
                <div className="flex items-center gap-6 border-b border-white/[0.08] mb-6 overflow-x-auto">
                    { tabs.map( ( tab ) => (
                        <button
                            key={ tab.id }
                            onClick={ () => setActiveTab( tab.id ) }
                            className={ `pb-3 px-1 font-medium text-sm transition-all relative whitespace-nowrap ${ activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/70" }` }
                        >
                            { tab.label }
                            { activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 rounded-full" /> }
                        </button>
                    ) ) }
                </div>

                {/* ─── Tab Content ─── */ }
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    { activeTab === "overview" && <OverviewTab project={ project } /> }
                    { activeTab === "funding" && <FundingTab project={ project } /> }
                    { activeTab === "market" && <MarketTab project={ project } /> }
                    { activeTab === "supply" && <SupplyTab project={ project } /> }
                </div>
            </main>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════ */

function OverviewTab ( { project }: { project: ProjectDetail } )
{
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
                {/* Price Range */ }
                { project.high24h && project.low24h && (
                    <Card title="24h Price Range">
                        <div className="flex items-center gap-4">
                            <span className="text-red-400 font-mono text-sm">{ formatUSD( project.low24h ) }</span>
                            <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                { ( () =>
                                {
                                    const low = parseFloat( project.low24h! ), high = parseFloat( project.high24h! ), cur = parseFloat( project.price || "0" );
                                    const pct = high > low ? ( ( cur - low ) / ( high - low ) ) * 100 : 50;
                                    return <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" style={ { width: `${ Math.min( 100, Math.max( 0, pct ) ) }%` } } />;
                                } )() }
                            </div>
                            <span className="text-green-400 font-mono text-sm">{ formatUSD( project.high24h ) }</span>
                        </div>
                    </Card>
                ) }

                {/* Price Performance */ }
                <Card title="Price Performance">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        { [
                            { label: "24h", val: project.percentChange?.h24 },
                            { label: "7d", val: project.percentChange?.d7 },
                            { label: "30d", val: project.percentChange?.d30 },
                            { label: "3m", val: project.percentChange?.m3 },
                            { label: "6m", val: project.percentChange?.m6 },
                        ].map( ( p ) => (
                            <div key={ p.label } className="text-center">
                                <div className="text-xs text-white/40 mb-1">{ p.label }</div>
                                <PercentBadge val={ p.val } />
                            </div>
                        ) ) }
                    </div>
                </Card>

                {/* Features */ }
                <Card title="Project Features">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <FlagCard icon={ <Coins className="w-4 h-4" /> } label="Token Sale" active={ project.hasCrowdsales } />
                        <FlagCard icon={ <BarChart3 className="w-4 h-4" /> } label="Funding Rounds" active={ project.hasFundingRounds } />
                        <FlagCard icon={ <Layers className="w-4 h-4" /> } label="Launchpools" active={ project.hasLaunchpools } />
                        <FlagCard icon={ <Shield className="w-4 h-4" /> } label="Vesting" active={ project.hasVesting } />
                    </div>
                </Card>
            </div>

            {/* Sidebar */ }
            <div className="space-y-5">
                <Card title="All-Time Records">
                    <div className="space-y-4">
                        { project.ath && (
                            <div>
                                <div className="text-xs text-white/40 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> All-Time High</div>
                                <div className="font-mono text-white text-lg">{ formatUSD( project.ath.value ) }</div>
                                <div className="text-xs text-white/40">{ new Date( project.ath.date ).toLocaleDateString() }
                                    <span className="ml-2 text-red-400">{ formatPercent( project.ath.percentChange ).text } from ATH</span>
                                </div>
                            </div>
                        ) }
                        { project.atl && (
                            <div>
                                <div className="text-xs text-white/40 mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> All-Time Low</div>
                                <div className="font-mono text-white text-lg">{ formatUSD( project.atl.value ) }</div>
                                <div className="text-xs text-white/40">{ new Date( project.atl.date ).toLocaleDateString() }
                                    <span className="ml-2 text-green-400">{ formatPercent( project.atl.percentChange ).text } from ATL</span>
                                </div>
                            </div>
                        ) }
                        { !project.ath && !project.atl && <p className="text-white/40 text-sm">No ATH/ATL data available.</p> }
                    </div>
                </Card>

                <Card title="Project Info">
                    <div className="space-y-2.5">
                        <MetricRow label="Type" value={ project.type || "—" } />
                        <MetricRow label="Category" value={ typeof project.category === 'string' ? project.category : ( project.category as any )?.name || project.categoryName || "—" } />
                        <MetricRow label="Rank" value={ project.rank ? `#${ project.rank }` : "—" } />
                        <MetricRow label="Life Cycle" value={ project.lifeCycle || "—" } />
                        { project.createdAt && <MetricRow label="Listed" value={ new Date( project.createdAt * 1000 ).toLocaleDateString() } /> }
                        { project.saleStart && <MetricRow label="Sale Start" value={ new Date( project.saleStart ).toLocaleDateString() } /> }
                        { project.listingDate && <MetricRow label="Listing Date" value={ new Date( project.listingDate ).toLocaleDateString() } /> }
                    </div>
                </Card>
            </div>
        </div>
    );
}

/* ─── Funding Tab ─── */
function FundingTab ( { project }: { project: ProjectDetail } )
{
    const crowdsales = project.crowdsales || [];
    const icoData = project.icoData;
    const allocation = icoData?.allocationChart || [];

    return (
        <div className="space-y-5">
            {/* Crowdsale Rounds */ }
            { crowdsales.length > 0 && (
                <Card title={ `${ project.name } Funding Rounds & IDO` }>
                    <div className="space-y-4">
                        { crowdsales.map( ( cs, i ) => (
                            <CrowdsaleRoundCard key={ i } cs={ cs } />
                        ) ) }
                    </div>
                </Card>
            ) }

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Allocation Chart */ }
                { allocation.length > 0 && (
                    <Card title="Allocation Breakdown">
                        <div className="space-y-3">
                            { allocation.map( ( slice, i ) =>
                            {
                                const colors = [ "bg-cyan-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-yellow-500", "bg-blue-500", "bg-red-500" ];
                                return (
                                    <div key={ i }>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-white/70">{ slice.title }</span>
                                            <span className="text-white font-mono">{ slice.percent.toFixed( 1 ) }%</span>
                                        </div>
                                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div className={ `h-full ${ colors[ i % colors.length ] } rounded-full` } style={ { width: `${ Math.min( 100, slice.percent ) }%` } } />
                                        </div>
                                    </div>
                                );
                            } ) }
                        </div>
                    </Card>
                ) }

                {/* ICO Additional Links */ }
                { icoData?.additionalLinks && icoData.additionalLinks.length > 0 && (
                    <Card title="Additional Links">
                        <div className="space-y-2">
                            { icoData.additionalLinks.map( ( l, i ) => (
                                <a key={ i } href={ l.href } target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-sm text-cyan-200/90 hover:text-cyan-100">
                                    <span className="flex items-center gap-2"><LinkIcon className="w-4 h-4" />{ l.title }</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-white/30" />
                                </a>
                            ) ) }
                        </div>
                    </Card>
                ) }

                {/* ICO Description */ }
                { icoData?.description && (
                    <Card title="ICO Notes" className="lg:col-span-2">
                        <div className="text-sm text-white/70 leading-relaxed" dangerouslySetInnerHTML={ { __html: icoData.description } } />
                    </Card>
                ) }
            </div>
        </div>
    );
}

/* ─── Market Tab ─── */
function MarketTab ( { project }: { project: ProjectDetail } )
{
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Price Information">
                <div className="space-y-3">
                    <MetricRow label="Current Price" value={ formatUSD( project.price ) } />
                    <MetricRow label="24h High" value={ formatUSD( project.high24h ) } />
                    <MetricRow label="24h Low" value={ formatUSD( project.low24h ) } />
                    <MetricRow label="Market Cap" value={ formatUSD( project.marketCap ) } />
                    <MetricRow label="FDV" value={ formatUSD( project.fullyDilutedValuation ) } />
                </div>
            </Card>
            <Card title="Volume & Rank">
                <div className="space-y-3">
                    <MetricRow label="24h Volume (USD)" value={ formatUSD( project.volume24h ) } />
                    <MetricRow label="24h Volume (Base)" value={ formatUSD( project.volume24hBase ) } />
                    <MetricRow label="Rank" value={ project.rank ? `#${ project.rank }` : "—" } />
                    <MetricRow label="Category" value={ typeof project.category === 'string' ? project.category : ( project.category as any )?.name || project.categoryName || "—" } />
                </div>
            </Card>
            <Card title="Percent Changes" className="md:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    { [
                        { label: "24 Hours", val: project.percentChange?.h24 },
                        { label: "7 Days", val: project.percentChange?.d7 },
                        { label: "30 Days", val: project.percentChange?.d30 },
                        { label: "3 Months", val: project.percentChange?.m3 },
                        { label: "6 Months", val: project.percentChange?.m6 },
                    ].map( ( p ) =>
                    {
                        const pct = formatPercent( p.val );
                        return (
                            <div key={ p.label } className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                                <div className="text-xs text-white/40 mb-2">{ p.label }</div>
                                <div className={ `text-lg font-mono font-bold ${ pct.positive ? "text-green-400" : "text-red-400" }` }>{ pct.text }</div>
                            </div>
                        );
                    } ) }
                </div>
            </Card>
        </div>
    );
}

/* ─── Supply Tab ─── */
function SupplyTab ( { project }: { project: ProjectDetail } )
{
    const [ copied, setCopied ] = useState<string | null>( null );
    const copyAddr = ( a: string ) => { navigator.clipboard.writeText( a ); setCopied( a ); setTimeout( () => setCopied( null ), 2000 ); };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Supply Metrics">
                <div className="space-y-3">
                    <MetricRow label="Total Supply" value={ formatNumber( project.totalSupply ) } />
                    <MetricRow label="Max Supply" value={ formatNumber( project.maxSupply ) } />
                    <MetricRow label="Circulating Supply" value={ formatNumber( project.circulatingSupply ) } />
                    { project.totalSupply && project.circulatingSupply && ( () =>
                    {
                        const ratio = ( parseFloat( project.circulatingSupply! ) / parseFloat( project.totalSupply! ) ) * 100;
                        return (
                            <div className="pt-3">
                                <div className="text-xs text-white/40 mb-2">Circulation Ratio</div>
                                <div className="flex justify-between text-xs mb-1"><span className="text-white/60">{ ratio.toFixed( 1 ) }%</span></div>
                                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 rounded-full" style={ { width: `${ Math.min( 100, ratio ) }%` } } />
                                </div>
                            </div>
                        );
                    } )() }
                </div>
            </Card>
            <Card title="Contracts">
                { project.contracts && project.contracts.length > 0 ? (
                    <div className="space-y-3">
                        { project.contracts.map( ( c, i ) =>
                        {
                            const url = getExplorerUrl( c );
                            return (
                                <div key={ i } className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs text-white/40 mb-0.5 flex items-center gap-1.5">
                                            { getContractPlatformName( c ) }
                                            { url && <a href={ url } target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300"><ExternalLink className="w-3 h-3" /></a> }
                                        </div>
                                        <div className="text-xs font-mono text-white/70 truncate max-w-[200px]" title={ c.address }>{ c.address }</div>
                                    </div>
                                    <button onClick={ () => copyAddr( c.address ) } className="p-1.5 rounded hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors flex-shrink-0">
                                        { copied === c.address ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" /> }
                                    </button>
                                </div>
                            );
                        } ) }
                    </div>
                ) : <p className="text-white/40 text-sm">No contract data available.</p> }
            </Card>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════ */

function Card ( { title, children, className = "" }: { title: string; children: React.ReactNode; className?: string } )
{
    return (
        <div className={ `glass-panel p-5 lg:p-6 ${ className }` }>
            <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-white/[0.08]">{ title }</h3>
            { children }
        </div>
    );
}

function MiniStat ( { label, value }: { label: string; value: string } )
{
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-[10px] text-white/40 mb-0.5">{ label }</div>
            <div className="text-sm font-mono font-semibold text-white">{ value }</div>
        </div>
    );
}

function MetricRow ( { label, value }: { label: string; value: string } )
{
    return (
        <div className="flex justify-between items-center py-2 border-b border-white/[0.06] last:border-0">
            <span className="text-sm text-white/50">{ label }</span>
            <span className="font-mono text-sm text-white/90">{ value }</span>
        </div>
    );
}

function PercentBadge ( { val, label }: { val?: string | null; label?: string } )
{
    const pct = formatPercent( val );
    return (
        <span className={ `inline-flex items-center gap-1 text-sm font-mono ${ pct.positive ? "text-green-400" : "text-red-400" }` }>
            { pct.text !== "—" && ( pct.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" /> ) }
            { pct.text }
            { label && <span className="text-white/40 text-xs ml-1">{ label }</span> }
        </span>
    );
}

function FlagCard ( { icon, label, active }: { icon: React.ReactNode; label: string; active: boolean } )
{
    return (
        <div className={ `rounded-xl border p-3 text-center ${ active ? "border-cyan-500/20 bg-cyan-500/5" : "border-white/[0.06] bg-white/[0.02]" }` }>
            <div className={ `flex items-center justify-center gap-1.5 text-sm ${ active ? "text-cyan-300" : "text-white/30" }` }>
                { icon }<span className="text-xs">{ label }</span>
            </div>
            <div className={ `text-[10px] mt-1 font-medium ${ active ? "text-green-400" : "text-white/20" }` }>{ active ? "Available" : "N/A" }</div>
        </div>
    );
}

function LinkBtn ( { href, icon, label, accent }: { href: string; icon: React.ReactNode; label: string; accent?: boolean } )
{
    return (
        <a href={ href } target="_blank" rel="noopener noreferrer"
            className={ `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${ accent
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200 hover:bg-cyan-500/20"
                : "bg-white/[0.04] border-white/10 text-white/80 hover:bg-white/[0.08]"
                }` }>
            { icon }{ label }<ExternalLink className="w-2.5 h-2.5 text-white/30" />
        </a>
    );
}

function CrowdsaleRoundCard ( { cs }: { cs: CrowdsaleInfo } )
{
    const statusColor = cs.status === "upcoming" ? "border-l-yellow-500" : cs.status === "active" ? "border-l-green-500" : "border-l-white/20";
    return (
        <div className={ `rounded-xl border border-white/10 bg-white/[0.04] p-4 border-l-4 ${ statusColor }` }>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{ cs.type }</span>
                    <span className={ `px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ cs.status === "upcoming" ? "bg-yellow-500/10 text-yellow-400"
                        : cs.status === "active" ? "bg-green-500/10 text-green-400"
                            : "bg-white/[0.06] text-white/50"
                        }` }>{ cs.status || "Past" }</span>
                </div>
                { cs.raise != null && (
                    <span className="text-sm font-mono text-green-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Raised { formatUSD( cs.raise ) }
                    </span>
                ) }
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-white/40 block mb-0.5">Dates</span><span className="text-white/80">{ formatCompactDate( cs.start ) } — { formatCompactDate( cs.end ) }</span></div>
                <div><span className="text-white/40 block mb-0.5">Price</span><span className="text-white/80 font-mono">{ cs.price != null ? `$${ cs.price }` : "—" }</span></div>
                <div><span className="text-white/40 block mb-0.5">Platform</span><span className="text-white/80">{ cs.platformName || cs.platformKey || "—" }</span></div>
                { cs.valuation != null && <div><span className="text-white/40 block mb-0.5">Valuation</span><span className="text-white/80 font-mono">{ formatUSD( cs.valuation ) }</span></div> }
                { cs.tokensForSale != null && <div><span className="text-white/40 block mb-0.5">Tokens For Sale</span><span className="text-white/80 font-mono">{ formatNumber( cs.tokensForSale ) }</span></div> }
                { cs.lockupPeriod && <div className="md:col-span-2"><span className="text-white/40 block mb-0.5"><Lock className="w-3 h-3 inline mr-1" />Lock-up</span><span className="text-white/80">{ cs.lockupPeriod }</span></div> }
                { cs.roi && <div><span className="text-white/40 block mb-0.5">ROI</span><span className="text-white/80 font-mono">{ cs.roi.value } ({ cs.roi.percentChange })</span></div> }
            </div>
        </div>
    );
}
