"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import
{
  TrendingUp,
  CandlestickChart,
  Activity,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Eye,
  TrendingDown,
  Zap,
  Sparkles,
  BarChart3,
  Newspaper,
  Fish,
  Crown,
  Rocket,
  Layers,
  AreaChart,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT } from "./top-header";

// Types
interface AnalysisPage
{
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  path: string;
}

interface AnalysisCategory
{
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  basePath: string;
  pages: AnalysisPage[];
}

interface SidebarRightProps
{
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

// Analysis Categories Data - الفئات الأربع الرئيسية للتحليل
const analysisCategories: AnalysisCategory[] = [
  {
    id: "scanners",
    label: "الماسحات الذكية",
    icon: <Eye className="w-5 h-5" />,
    color: "text-cyan-400",
    basePath: "/chat",
    pages: [
      {
        id: "trend-scanner",
        label: "📈 Trend Scanner",
        icon: <TrendingUp className="w-4 h-4" />,
        description: "تحليل متعدد المؤشرات",
        path: "/chat/trend-scanner"
      },
      {
        id: "divergence-scanner",
        label: "🔀 Divergence",
        icon: <TrendingDown className="w-4 h-4" />,
        description: "كشف الدايفرجنس المتقدم",
        path: "/chat/divergence-scanner"
      },
      {
        id: "levels-scanner",
        label: "📊 Levels",
        icon: <CandlestickChart className="w-4 h-4" />,
        description: "مستويات الدعم والمقاومة",
        path: "/chat/levels"
      },
      {
        id: "volume-scanner",
        label: "📊 Volume",
        icon: <BarChart3 className="w-4 h-4" />,
        description: "رصد الفوليوم غير الطبيعي",
        path: "/chat/volume-scanner"
      },
      {
        id: "pattern-scanner",
        label: "🎯 Pattern Scanner",
        icon: <CandlestickChart className="w-4 h-4" />,
        description: "ماسح الأنماط",
        path: "/chat/pattern"
      },
      {
        id: "fibonacci-scanner",
        label: "🔢 Fibonacci 0.618",
        icon: <TrendingUp className="w-4 h-4" />,
        description: "مستوى التراجع الذهبي",
        path: "/chat/fibonacci-scanner"
      },
      {
        id: "trendlines-scanner",
        label: "📐 Trendlines",
        icon: <TrendingUp className="w-4 h-4" />,
        description: "خطوط الدعم والمقاومة",
        path: "/chat/trendlines"
      },
      {
        id: "news",
        label: "📰 News",
        icon: <Newspaper className="w-4 h-4" />,
        description: "صفحة الأخبار والبحث",
        path: "/chat/news"
      },
      {
        id: "cryptocurrencies",
        label: "💰 Cryptocurrencies",
        icon: <Layers className="w-4 h-4" />,
        description: "أفضل 200 عملة",
        path: "/chat/cryptocurrencies"
      },
      {
        id: "staking-rewards",
        label: "🥩 Staking & Rewards",
        icon: <Crown className="w-4 h-4" />,
        description: "Staking assets, filters, columns",
        path: "/chat/staking-rewards"
      },
      {
        id: "whales",
        label: "🐋 Crypto Whales",
        icon: <Fish className="w-4 h-4" />,
        description: "أكبر حاملي التوكنات",
        path: "/chat/whales"
      },
      {
        id: "top-holders",
        label: "👑 Top 200 Holders",
        icon: <Crown className="w-4 h-4" />,
        description: "أكبر 200 حامل لكل عملة",
        path: "/chat/top-holders"
      },
    ],
  },
  {
    id: "onchain",
    label: "ONCHAIN",
    icon: <Activity className="w-5 h-5" />,
    color: "text-emerald-400",
    basePath: "/chat",
    pages: [
      {
        id: "chain-tracker",
        label: "⛓ Chain Tracker",
        icon: <Activity className="w-4 h-4" />,
        description: "Onchain flow tracking",
        path: "/chat/ChainTracker",
      },
      {
        id: "visualizer",
        label: "🔮 Visualizer",
        icon: <Eye className="w-4 h-4" />,
        description: "Entity & Token flow graph",
        path: "/chat/visualizer",
      },
      {
        id: "cexs-inflow-outflow",
        label: "💰 CEXs Flow",
        icon: <Activity className="w-4 h-4" />,
        description: "CEXs Total Inflow & Outflow",
        path: "/chat/cexs-inflow-outflow"
      },
      {
        id: "chain-explorer",
        label: "🔍 Chain Explorer",
        icon: <Activity className="w-4 h-4" />,
        description: "Multi-chain Analytics",
        path: "/chat/chain-explorer"
      },
      {
        id: "layer-zero",
        label: "LayerZero",
        icon: <Layers className="w-4 h-4" />,
        description: "Protocol Statistics",
        path: "/chat/layer-zero"
      },
      {
        id: "etherum-summry",
        label: "etherum summry",
        icon: <Layers className="w-4 h-4" />,
        description: "Ethereum Staking Summary",
        path: "/chat/etherum-summry"
      },
      {
        id: "stablecoins",
        label: "Stablecoins",
        icon: <Layers className="w-4 h-4" />,
        description: "Stablecoins Composition",
        path: "/chat/stablecoins"
      },
      {
        id: "charts",
        label: "Charts",
        icon: <CandlestickChart className="w-4 h-4" />,
        description: "Trading workspace",
        path: "/chat/charts"
      },
      {
        id: "cways-studio",
        label: "📈 CWAYS Studio",
        icon: <Activity className="w-4 h-4" />,
        description: "CryptoQuant Multi-Asset Analytics",
        path: "/chat/cways-studio"
      },
      {
        id: "cwtracker",
        label: "🕵️ CWTRACKER",
        icon: <Eye className="w-4 h-4" />,
        description: "Fund Flow Graph Tracer",
        path: "/chat/cwtracker"
      },
    ],
  },
  {
    id: "investor",
    label: "Investor",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-violet-400",
    basePath: "/chat",
    pages: [
      {
        id: "ico-calendar",
        label: "🚀 ICO & IDO",
        icon: <Rocket className="w-4 h-4" />,
        description: "Token sales calendar",
        path: "/chat/token-sales"
      },
    ],
  },
  {
    id: "heatmap",
    label: "heatmap",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-amber-400",
    basePath: "/chat",
    pages: [
      {
        id: "orderbook",
        label: "Order Book",
        icon: <BarChart3 className="w-4 h-4" />,
        description: "Vertical Order Book (Aggregated Look)",
        path: "/chat/orderbook"
      },
      {
        id: "rsi-heatmap",
        label: "📊 RSI Heatmap (Bybit)",
        icon: <BarChart3 className="w-4 h-4" />,
        description: "RSI Heatmap for top 200 coins",
        path: "/chat/rsi-heatmap"
      },
      {
        id: "macd-heatmap",
        label: "📈 MACD Heatmap (Bybit)",
        icon: <BarChart3 className="w-4 h-4" />,
        description: "MACD Heatmap for top 200 coins",
        path: "/chat/macd-heatmap"
      },
    ],
  },
  {
    id: "etf",
    label: "ETF",
    icon: <AreaChart className="w-5 h-5" />,
    color: "text-orange-400",
    basePath: "/chat",
    pages: [
      {
        id: "bitcoin-etf",
        label: "₿ Bitcoin ETF",
        icon: <TrendingUp className="w-4 h-4" />,
        description: "Bitcoin ETF flows, AUM & holdings",
        path: "/chat/bitcoin-etf"
      },
      {
        id: "ethereum-etf",
        label: "⟠ Ethereum ETF",
        icon: <AreaChart className="w-4 h-4" />,
        description: "Ethereum ETF flows, AUM & holdings",
        path: "/chat/ethereum-etf"
      },
    ],
  },
  {
    id: "polygon-analytics",
    label: "Polygon Analytics",
    icon: <Layers className="w-5 h-5" />,
    color: "text-purple-400",
    basePath: "/chat",
    pages: [
      {
        id: "polygon",
        label: "🟣 Polygon",
        icon: <Layers className="w-4 h-4" />,
        description: "Polygon Hub",
        path: "/chat/polygon"
      },
    ],
  },
];

export function SidebarRight ( { isOpen, onToggle, isMobile = false }: SidebarRightProps )
{
  const router = useRouter();
  const pathname = usePathname();
  const [ expandedCategories, setExpandedCategories ] = useState<string[]>( [ "investor", "heatmap", "scanners", "onchain", "etf", "polygon-analytics" ] );
  const [ activePageId, setActivePageId ] = useState<string | null>( null );
  const sidebarRef = useRef<HTMLElement>( null );
  const scrollTimerRef = useRef<number | null>( null );
  const navRef = useRef<HTMLElement | null>( null );

  // Close the sidebar when user clicks anywhere outside it (desktop & mobile)
  useEffect( () =>
  {
    const handleGlobalClick = ( event: MouseEvent ) =>
    {
      if ( !isOpen ) return;
      const target = event.target as Node;
      if ( sidebarRef.current && !sidebarRef.current.contains( target ) )
      {
        onToggle();
      }
    };

    document.addEventListener( "click", handleGlobalClick );
    return () => document.removeEventListener( "click", handleGlobalClick );
  }, [ isOpen, onToggle ] );

  useEffect( () =>
  {
    if ( typeof window === "undefined" ) return;

    const normalizedPath = pathname?.toLowerCase() || "";
    const pageFromPath = analysisCategories
      .flatMap( ( category ) => category.pages.map( ( page ) => ( { page, category } ) ) )
      .find( ( item ) =>
      {
        const basePath = item.page.path.split( "#" )[ 0 ].toLowerCase();
        // Match exact route or nested routes under the page (e.g. /chat/trend-scanner/[pair])
        return (
          basePath === normalizedPath ||
          ( normalizedPath.startsWith( basePath ) && normalizedPath.charAt( basePath.length ) === "/" )
        );
      } );

    const savedPageId = window.localStorage.getItem( "analysis.sidebar.activePageId" );
    const nextActiveId = pageFromPath?.page.id || savedPageId || null;

    setActivePageId( nextActiveId );
    if ( pageFromPath )
    {
      setExpandedCategories( ( prev ) =>
        prev.includes( pageFromPath.category.id ) ? prev : [ ...prev, pageFromPath.category.id ]
      );
    }
  }, [ pathname ] );

  useEffect( () =>
  {
    if ( !isOpen ) return;
    // Ensure all groups are visible when opening the sidebar
    navRef.current?.scrollTo( { top: 0, behavior: "instant" as ScrollBehavior } );
    setExpandedCategories( ( prev ) =>
    {
      const next = new Set( prev );
      next.add( "investor" );
      next.add( "heatmap" );
      next.add( "scanners" );
      next.add( "onchain" );
      next.add( "polygon-analytics" );
      return Array.from( next );
    } );
  }, [ isOpen ] );

  const toggleCategory = ( id: string ) =>
  {
    setExpandedCategories( ( prev ) =>
      prev.includes( id ) ? prev.filter( ( item ) => item !== id ) : [ ...prev, id ]
    );
  };

  const sidebarVariants: Variants = {
    open: {
      width: isMobile ? 260 : 260,
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    closed: {
      width: 0,
      opacity: 0,
      x: isMobile ? -260 : 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  // Clear managed timers on unmount
  useEffect( () =>
  {
    return () =>
    {
      if ( scrollTimerRef.current )
      {
        clearTimeout( scrollTimerRef.current );
        scrollTimerRef.current = null;
      }
    };
  }, [] );

  return (
    <>
      {/* Mobile Overlay Backdrop */ }
      <AnimatePresence>
        { isMobile && isOpen && (
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={ onToggle }
          />
        ) }
      </AnimatePresence>

      {/* Sidebar */ }
      <motion.aside
        ref={ sidebarRef }
        variants={ sidebarVariants }
        initial={ false }
        animate={ isOpen ? "open" : "closed" }
        className={ cn(
          "fixed left-0 z-50",
          "flex flex-col",
          "bg-[#264a46] border-r border-white/10",
          "shadow-[0_0_60px_rgba(0,0,0,0.5)]",
        ) }
        style={ isMobile
          ? { top: 0, height: '100vh' }
          : { top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT}px)` }
        }
      >
        {/* Header — matches sidebar-left design */ }
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          {/* Close / Toggle button */ }
          <motion.button
            type="button"
            whileTap={ { scale: 0.9 } }
            onClick={ onToggle }
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white 
                       hover:bg-white/[0.08] transition-colors touch-target shrink-0"
            aria-label={ isOpen ? "إغلاق أدوات التحليل" : "فتح أدوات التحليل" }
            title={ isOpen ? "إغلاق أدوات التحليل" : "فتح أدوات التحليل" }
          >
            { isMobile ? <X className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" /> }
          </motion.button>

          {/* Title + Icon */ }
          <AnimatePresence mode="wait">
            { isOpen && (
              <motion.div
                initial={ { opacity: 0, x: -20 } }
                animate={ { opacity: 1, x: 0 } }
                exit={ { opacity: 0, x: -20 } }
                className="flex items-center gap-1.5 select-none flex-1"
              >
                <div className="p-1.5 rounded-lg bg-white/[0.08] text-teal-400 border border-white/10 shadow-sm">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold tracking-[0.15em] text-white/60">أدوات التحليل</span>
              </motion.div>
            ) }
          </AnimatePresence>
        </div>

        <div className="mx-3 h-px bg-white/10" />

        {/* Categories */ }
        <nav ref={ navRef } className="flex-1 overflow-y-auto py-2 px-3 space-y-3 custom-scrollbar">
          { analysisCategories.map( ( category ) => (
            <div key={ category.id }>
              {/* Category Header — matches sidebar-left section headers */ }
              <div className="flex items-center group/cat">
                <motion.button
                  type="button"
                  title={ category.label }
                  whileTap={ { scale: 0.99 } }
                  onClick={ () => toggleCategory( category.id ) }
                  className={ cn(
                    "flex-1 flex items-center gap-2.5 py-2 px-3 rounded-lg",
                    "text-sm transition-all duration-200",
                    expandedCategories.includes( category.id )
                      ? "text-white/80"
                      : "text-white/60 hover:text-white/80 hover:bg-white/[0.04]",
                    !isOpen && "justify-center"
                  ) }
                >
                { isOpen && (
                  <>
                    <span className="w-4 h-4 shrink-0 opacity-50">{ category.icon }</span>
                    <span className="font-medium">{ category.label }</span>
                    <ChevronDown className={ cn(
                      "w-3.5 h-3.5 mr-auto transition-transform duration-200",
                      expandedCategories.includes( category.id ) && "rotate-180"
                    ) } />
                  </>
                ) }
                </motion.button>
              </div>

              {/* Category Pages */ }
              <AnimatePresence>
                { isOpen && expandedCategories.includes( category.id ) && (
                  <motion.div
                    initial={ { opacity: 0, height: 0 } }
                    animate={ { opacity: 1, height: "auto" } }
                    exit={ { opacity: 0, height: 0 } }
                    className="overflow-hidden mr-4 space-y-0.5"
                  >
                    { category.pages.map( ( page, index ) => (
                      <motion.div
                        key={ page.id }
                        initial={ { opacity: 0, x: -10 } }
                        animate={ {
                          opacity: 1,
                          x: 0,
                          transition: { delay: index * 0.02 }
                        } }
                        className="relative"
                      >
                        <button
                          type="button"
                          title={ page.label }
                          onClick={ () =>
                          {
                            setActivePageId( page.id );
                            if ( typeof window !== "undefined" )
                            {
                              window.localStorage.setItem( "analysis.sidebar.activePageId", page.id );
                            }
                            // Handle hash navigation properly
                            if ( page.path.includes( '#' ) )
                            {
                              const [ basePath, hash ] = page.path.split( '#' );
                              router.push( basePath );
                              // Wait for navigation then scroll to element (managed timer)
                              if ( scrollTimerRef.current )
                              {
                                clearTimeout( scrollTimerRef.current );
                              }
                              scrollTimerRef.current = window.setTimeout( () =>
                              {
                                const element = document.getElementById( hash );
                                if ( element )
                                {
                                  element.scrollIntoView( { behavior: 'smooth', block: 'center' } );
                                }
                                scrollTimerRef.current = null;
                              }, 300 );
                            } else
                            {
                              router.push( page.path );
                            }
                          } }
                          className={ cn(
                            "w-full flex items-center gap-3 py-2 px-3 rounded-lg",
                            "text-sm transition-all duration-150 relative",
                            activePageId === page.id
                              ? "bg-white/10 text-white/90"
                              : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                          ) }
                        >
                          { activePageId === page.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-teal-400" />
                          ) }
                          <span className="w-4 h-4 shrink-0 opacity-60">{ page.icon }</span>
                          <span className="flex-1 text-right truncate font-medium">
                            { page.label }
                          </span>
                        </button>
                      </motion.div>
                    ) ) }
                  </motion.div>
                ) }
              </AnimatePresence>
            </div>
          ) ) }
        </nav>

        {/* Footer — matches sidebar-left footer pattern */ }
        { isOpen && (
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            className="p-3 border-t border-white/[0.06]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500
                             flex items-center justify-center shadow-lg shadow-teal-500/25 ring-2 ring-white/10 shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white/90 truncate block">أدوات التحليل</span>
                <span className="text-[11px] text-white/40 truncate block">اضغط على أي صفحة للتحليل المتقدم</span>
              </div>
            </div>
          </motion.div>
        ) }
      </motion.aside>
    </>
  );
}
