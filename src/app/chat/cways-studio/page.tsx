"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import
{
    BarChart3, LineChart, Activity, TrendingUp, Wallet, ArrowUpDown,
    Layers, Database, DollarSign, Users, Zap, Hash, GitBranch, Search,
    Sparkles, X, Loader2, RefreshCw, ChevronDown, Maximize2, Minimize2,
    Star, Share2, Bell, Camera, Table as TableIcon, Download,
} from "lucide-react";
import { useCryptoQuantStudio } from "@/hooks/use-crawler-data";
import { compactNum } from "@/lib/pro-chart-builders";

const ProChart = dynamic( () => import( "@/components/charts/ProChart" ), { ssr: false } );

// ══════════════════════════════════════════════════════════════════
// 🎨 ألوان الأصول — Ethereum Family
// ══════════════════════════════════════════════════════════════════

const ASSET_COLORS: Record<string, { primary: string; bg: string; border: string; gradient: [ string, string ] }> = {
    btc: {
        primary: "#f7931a",
        bg: "rgba(247,147,26,0.06)",
        border: "rgba(247,147,26,0.2)",
        gradient: [ "#f7931a", "#f7931a15" ],
    },
    eth: {
        primary: "#627eea",
        bg: "rgba(98,126,234,0.06)",
        border: "rgba(98,126,234,0.2)",
        gradient: [ "#627eea", "#627eea15" ],
    },
    xrp: {
        primary: "#00aae4",
        bg: "rgba(0,170,228,0.06)",
        border: "rgba(0,170,228,0.2)",
        gradient: [ "#00aae4", "#00aae415" ],
    },
    "usdt-eth": {
        primary: "#26a17b",
        bg: "rgba(38,161,123,0.06)",
        border: "rgba(38,161,123,0.2)",
        gradient: [ "#26a17b", "#26a17b15" ],
    },
    usdc: {
        primary: "#2775ca",
        bg: "rgba(39,117,202,0.06)",
        border: "rgba(39,117,202,0.2)",
        gradient: [ "#2775ca", "#2775ca15" ],
    },
};

const ASSET_NAMES: Record<string, string> = {
    btc: "Bitcoin",
    eth: "Ethereum",
    xrp: "XRP",
    "usdt-eth": "USDT (ERC20)",
    usdc: "USDC",
};

// ─── أيقونات الفئات
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    "exchange-flows": <ArrowUpDown className="w-3.5 h-3.5" />,
    "flow-indicator": <TrendingUp className="w-3.5 h-3.5" />,
    "market-indicator": <BarChart3 className="w-3.5 h-3.5" />,
    "network-indicator": <Activity className="w-3.5 h-3.5" />,
    "miner-flows": <Layers className="w-3.5 h-3.5" />,
    derivatives: <LineChart className="w-3.5 h-3.5" />,
    "fund-data": <DollarSign className="w-3.5 h-3.5" />,
    "market-data": <BarChart3 className="w-3.5 h-3.5" />,
    addresses: <Users className="w-3.5 h-3.5" />,
    "fees-and-revenue": <Zap className="w-3.5 h-3.5" />,
    "network-stats": <Hash className="w-3.5 h-3.5" />,
    supply: <Database className="w-3.5 h-3.5" />,
    transactions: <GitBranch className="w-3.5 h-3.5" />,
    "inter-entity-flows": <ArrowUpDown className="w-3.5 h-3.5" />,
    "eth-2-0": <Sparkles className="w-3.5 h-3.5" />,
    "dex-data": <Wallet className="w-3.5 h-3.5" />,
};

// ─── نوع الرسم الافتراضي لكل فئة
const DEFAULT_CHART_TYPE: Record<string, "bar" | "line"> = {
    "exchange-flows": "bar",
    "miner-flows": "bar",
    "fund-data": "bar",
    "fees-and-revenue": "bar",
    "inter-entity-flows": "bar",
    supply: "bar",
    "dex-data": "bar",
};

// ─── فترات الزمن
const TIME_RANGES = [
    { key: "1W", label: "1W", days: 7 },
    { key: "1M", label: "1M", days: 30 },
    { key: "3M", label: "3M", days: 90 },
    { key: "1Y", label: "1Y", days: 365 },
    { key: "ALL", label: "All", days: 99999 },
] as const;

// ══════════════════════════════════════════════════════════════════
// 📊 بناء شارت احترافي — بأسلوب CryptoQuant
// ══════════════════════════════════════════════════════════════════

function buildProfessionalChart (
    series: any,
    chartType: "bar" | "line",
    accentColor: string,
    gradient: [ string, string ],
    timeRange: string,
)
{
    const data = series?.data;
    if ( !data || !Array.isArray( data ) || data.length < 2 ) return null;

    // فلترة بالفترة الزمنية
    const range = TIME_RANGES.find( ( r ) => r.key === timeRange );
    const maxDays = range?.days || 99999;
    const filtered = maxDays < data.length ? data.slice( -maxDays ) : data;

    const dates = filtered.map( ( p: any ) => p.date );
    const values = filtered.map( ( p: any ) =>
        typeof p.value === "number" ? p.value : parseFloat( p.value )
    );

    const validValues = values.filter( ( v: number ) => !isNaN( v ) );
    const minVal = Math.min( ...validValues );
    const maxVal = Math.max( ...validValues );
    const lastVal = validValues[ validValues.length - 1 ];

    // ─── Tooltip
    const tooltip: any = {
        trigger: "axis",
        backgroundColor: "rgba(15,25,22,0.95)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        axisPointer: {
            type: chartType === "bar" ? "shadow" : "cross",
            crossStyle: { color: accentColor + "50" },
            shadowStyle: { color: accentColor + "08" },
            lineStyle: { color: accentColor + "40", type: "dashed" },
            label: {
                backgroundColor: accentColor + "dd",
                color: "#fff",
                fontSize: 10,
                formatter: ( p: any ) =>
                {
                    if ( p.axisDimension === "y" ) return compactNum( p.value );
                    return p.value;
                },
            },
        },
        formatter: ( params: any ) =>
        {
            const p = Array.isArray( params ) ? params[ 0 ] : params;
            const val = typeof p.value === "number" ? p.value : parseFloat( p.value );
            const color = p.color?.colorStops?.[ 0 ]?.color || p.color || accentColor;
            return `
                <div style="font-size:11px;line-height:1.8;min-width:140px">
                    <div style="color:rgba(255,255,255,0.45);margin-bottom:2px;font-size:10px">${ p.name }</div>
                    <div style="display:flex;align-items:center;gap:6px">
                        <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${ accentColor }"></span>
                        <span style="flex:1;color:rgba(255,255,255,0.6)">${ series?.metric_name || "" }</span>
                        <span style="font-weight:700;color:#fff;font-size:12px">${ compactNum( val, 2 ) }</span>
                    </div>
                </div>
            `;
        },
    };

    // ─── المحور X
    const xAxis: any = {
        type: "category",
        data: dates,
        boundaryGap: chartType === "bar",
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisTick: { show: false },
        axisLabel: {
            color: "rgba(255,255,255,0.3)",
            fontSize: 10,
            margin: 14,
            formatter: ( val: string ) =>
            {
                if ( !val ) return "";
                const parts = val.split( "-" );
                if ( parts.length >= 3 )
                {
                    const months = [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                    ];
                    const m = parseInt( parts[ 1 ] ) - 1;
                    return `${ parts[ 0 ] } ${ months[ m ] || parts[ 1 ] }`;
                }
                return val;
            },
        },
        splitLine: { show: false },
    };

    // ─── المحور Y (auto-scale مثل CryptoQuant — لا يبدأ من 0)
    const dataRange = maxVal - minVal;
    const padding = dataRange * 0.1 || Math.abs( minVal * 0.05 ) || 1;
    const yMin = minVal >= 0 && minVal - padding < 0 ? 0 : Math.floor( ( minVal - padding ) * 100 ) / 100;
    const yMax = Math.ceil( ( maxVal + padding ) * 100 ) / 100;

    const yAxis: any = {
        type: "value",
        position: "left",
        min: yMin,
        max: yMax,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
            lineStyle: { color: "rgba(255,255,255,0.04)", type: "dashed" },
        },
        axisLabel: {
            color: "rgba(255,255,255,0.3)",
            fontSize: 10,
            formatter: ( v: number ) => compactNum( v ),
        },
    };

    // ─── markPoint لآخر قيمة (بادج مثل CryptoQuant)
    const markPoint: any = {
        symbol: "roundRect",
        symbolSize: [ 56, 20 ],
        symbolOffset: [ 32, 0 ],
        data: [
            {
                coord: [ dates.length - 1, lastVal ],
                value: compactNum( lastVal, 1 ),
                itemStyle: { color: accentColor },
                label: {
                    show: true,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: "bold",
                    formatter: "{c}",
                },
            },
        ],
        animation: false,
    };

    // ─── markLine (خط أفقي لآخر قيمة)
    const markLine: any = {
        silent: true,
        symbol: "none",
        lineStyle: { color: accentColor + "25", type: "dashed", width: 1 },
        label: { show: false },
        data: [ { yAxis: lastVal } ],
    };

    // ─── السلسلة
    let seriesConfig: any;

    if ( chartType === "bar" )
    {
        seriesConfig = [
            {
                type: "bar",
                data: values,
                barMaxWidth: filtered.length > 90 ? 4 : filtered.length > 60 ? 6 : filtered.length > 30 ? 10 : 18,
                barMinWidth: 1,
                itemStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: accentColor },
                            { offset: 1, color: accentColor + "50" },
                        ],
                    },
                    borderRadius: [ 2, 2, 0, 0 ],
                },
                emphasis: {
                    itemStyle: {
                        color: accentColor,
                        shadowColor: accentColor + "40",
                        shadowBlur: 10,
                    },
                },
                markPoint,
                markLine,
            },
        ];
    } else
    {
        seriesConfig = [
            {
                type: "line",
                data: values,
                smooth: 0.3,
                symbol: "none",
                lineStyle: { color: accentColor, width: 2 },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: accentColor + "25" },
                            { offset: 0.7, color: accentColor + "06" },
                            { offset: 1, color: "transparent" },
                        ],
                    },
                },
                emphasis: { lineStyle: { width: 2.5 } },
                markPoint,
                markLine,
            },
        ];
    }

    // ─── dataZoom (شريط تمرير سفلي مثل CryptoQuant)
    const dataZoom: any[] = [
        {
            type: "inside",
            xAxisIndex: 0,
            start: 0,
            end: 100,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
        },
        {
            type: "slider",
            xAxisIndex: 0,
            height: 24,
            bottom: 6,
            borderColor: "rgba(255,255,255,0.04)",
            backgroundColor: "rgba(255,255,255,0.02)",
            fillerColor: accentColor + "12",
            handleIcon:
                "M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z",
            handleSize: "60%",
            handleStyle: { color: accentColor + "80", borderColor: accentColor },
            textStyle: { color: "rgba(255,255,255,0.25)", fontSize: 9 },
            dataBackground: {
                lineStyle: { color: accentColor + "25" },
                areaStyle: { color: accentColor + "08" },
            },
            selectedDataBackground: {
                lineStyle: { color: accentColor + "50" },
                areaStyle: { color: accentColor + "18" },
            },
        },
    ];

    return {
        backgroundColor: "transparent",
        animation: true,
        animationDuration: 500,
        animationEasing: "cubicOut",
        grid: { top: 24, right: 72, bottom: 52, left: 10, containLabel: true },
        tooltip,
        xAxis,
        yAxis,
        series: seriesConfig,
        dataZoom,
    };
}

// ══════════════════════════════════════════════════════════════════
// 📄 الصفحة الرئيسية — تصميم CryptoQuant
// ══════════════════════════════════════════════════════════════════

export default function CwaysStudioPage ()
{
    const { data, loading, error, refresh } = useCryptoQuantStudio();
    const [ selectedAsset, setSelectedAsset ] = useState( "btc" );
    const [ selectedCategory, setSelectedCategory ] = useState<string | null>( null );
    const [ selectedMetric, setSelectedMetric ] = useState<string | null>( null );
    const [ chartType, setChartType ] = useState<"bar" | "line">( "bar" ); const [ viewMode, setViewMode ] = useState<"chart" | "table">( "chart" ); const [ timeRange, setTimeRange ] = useState( "ALL" );
    const [ isFullscreen, setIsFullscreen ] = useState( false );
    const chartContainerRef = useRef<HTMLDivElement>( null );

    // بيانات الأصل المحدد
    const assetData = useMemo( () =>
    {
        if ( !data?.assets ) return null;
        return data.assets[ selectedAsset ] || null;
    }, [ data, selectedAsset ] );

    // الفئات
    const categories = useMemo( () =>
    {
        if ( !assetData?.categoriesMap ) return [];
        return Object.entries( assetData.categoriesMap ).map( ( [ slug, cat ]: [ string, any ] ) => ( {
            slug,
            name: cat.name || slug,
            count: cat.count || 0,
            metrics: cat.metrics || [],
        } ) );
    }, [ assetData ] );

    // اختيار أول فئة تلقائياً
    useEffect( () =>
    {
        if ( categories.length > 0 && !selectedCategory )
        {
            setSelectedCategory( categories[ 0 ].slug );
        }
    }, [ categories, selectedCategory ] );

    // مقاييس الفئة المحددة
    const currentCategoryMetrics = useMemo( () =>
    {
        if ( !selectedCategory || !assetData?.charts ) return [];
        const catData = assetData.categoriesMap?.[ selectedCategory ];
        if ( !catData?.metrics ) return [];

        return catData.metrics
            .filter( ( k: string ) => assetData.charts[ k ] )
            .map( ( k: string ) => ( {
                key: k,
                series: assetData.charts[ k ],
                name:
                    assetData.charts[ k ]?.metric_name ||
                    k
                        .split( "__" )
                        .pop()
                        ?.replace( /[-_]/g, " " ) ||
                    k,
            } ) );
    }, [ selectedCategory, assetData ] );

    // اختيار أول مقياس تلقائياً عند تغيير الفئة
    useEffect( () =>
    {
        if ( currentCategoryMetrics.length > 0 )
        {
            setSelectedMetric( currentCategoryMetrics[ 0 ].key );
            const defaultType = DEFAULT_CHART_TYPE[ selectedCategory || "" ] || "line";
            setChartType( defaultType );
        } else
        {
            setSelectedMetric( null );
        }
    }, [ selectedCategory, currentCategoryMetrics.length ] );

    // بيانات المقياس المحدد
    const activeMetric = useMemo( () =>
    {
        if ( !selectedMetric || !assetData?.charts ) return null;
        return {
            key: selectedMetric,
            series: assetData.charts[ selectedMetric ],
            name:
                assetData.charts[ selectedMetric ]?.metric_name ||
                selectedMetric
                    .split( "__" )
                    .pop()
                    ?.replace( /[-_]/g, " " ) ||
                selectedMetric,
        };
    }, [ selectedMetric, assetData ] );

    // بناء الشارت
    const accent = ASSET_COLORS[ selectedAsset ] || ASSET_COLORS.btc;
    const chartOption = useMemo( () =>
    {
        if ( !activeMetric?.series ) return null;
        return buildProfessionalChart(
            activeMetric.series,
            chartType,
            accent.primary,
            accent.gradient,
            timeRange
        );
    }, [ activeMetric, chartType, accent, timeRange ] );

    // معلومات القيمة الأخيرة
    const seriesData = activeMetric?.series?.data;
    const lastValue = seriesData?.[ seriesData.length - 1 ]?.value;
    const prevValue = seriesData?.[ Math.max( 0, ( seriesData?.length || 0 ) - 2 ) ]?.value;
    const changePercent =
        lastValue && prevValue ? ( ( lastValue - prevValue ) / Math.abs( prevValue ) ) * 100 : 0;

    // تغيير الأصل
    const handleAssetChange = useCallback( ( symbol: string ) =>
    {
        setSelectedAsset( symbol );
        setSelectedCategory( null );
        setSelectedMetric( null );
    }, [] );

    // تغيير الفئة
    const handleCategoryChange = useCallback( ( slug: string ) =>
    {
        setSelectedCategory( slug );
        setSelectedMetric( null );
    }, [] );

    // Fullscreen toggle
    const toggleFullscreen = useCallback( () =>
    {
        if ( !chartContainerRef.current ) return;
        if ( !isFullscreen )
        {
            chartContainerRef.current.requestFullscreen?.();
            setIsFullscreen( true );
        } else
        {
            document.exitFullscreen?.();
            setIsFullscreen( false );
        }
    }, [ isFullscreen ] );

    useEffect( () =>
    {
        const handler = () => setIsFullscreen( !!document.fullscreenElement );
        document.addEventListener( "fullscreenchange", handler );
        return () => document.removeEventListener( "fullscreenchange", handler );
    }, [] );

    const downloadCSV = () =>
    {
        if ( !activeMetric?.series?.data ) return;
        const data = activeMetric.series.data;
        const headers = [ "Date", `Value (${ activeMetric.series.unit || "" })`, "Timestamp" ];
        const rows = data.map( ( d: any ) => [ d.date, d.value, d.timestamp ].join( "," ) );
        const csvContent = [ headers.join( "," ), ...rows ].join( "\n" );

        const blob = new Blob( [ csvContent ], { type: "text/csv;charset=utf-8;" } );
        const url = URL.createObjectURL( blob );
        const link = document.createElement( "a" );
        link.setAttribute( "href", url );
        link.setAttribute( "download", `${ activeMetric.name.replace( /\s+/g, "_" ) }_${ selectedAsset }.csv` );
        link.style.visibility = "hidden";
        document.body.appendChild( link );
        link.click();
        document.body.removeChild( link );
    };

    // ─── Loading
    if ( loading && !data )
    {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
        );
    }

    if ( error && !data )
    {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-red-400 text-sm">{ error }</p>
                <button
                    onClick={ refresh }
                    className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-sm hover:bg-teal-500/30"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    const assetName = ASSET_NAMES[ selectedAsset ] || selectedAsset.toUpperCase();
    const catName = categories.find( ( c ) => c.slug === selectedCategory )?.name || "";

    return (
        <div className="flex flex-col min-h-screen bg-[#0b1210]">
            {/* ═══════════ HEADER ═══════════ */ }
            <header className="border-b border-white/[0.06] bg-[#0f1a17]/90 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
                    {/* Row 1: Title + Asset Selector + Refresh */ }
                    <div className="flex items-center gap-3 py-2.5">
                        <h1 className="text-sm sm:text-base font-bold text-white tracking-wide flex-shrink-0">
                            <span className="text-teal-400">CWAYS</span>{ " " }
                            <span className="hidden sm:inline">Studio</span>
                        </h1>

                        {/* ─── Asset Tabs ─── */ }
                        <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide mr-3">
                            { Object.entries( ASSET_NAMES ).map( ( [ sym, name ] ) =>
                            {
                                const c = ASSET_COLORS[ sym ];
                                const isActive = selectedAsset === sym;
                                const count = data?.assets?.[ sym ]?.count || 0;
                                return (
                                    <button
                                        key={ sym }
                                        onClick={ () => handleAssetChange( sym ) }
                                        className={ `flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium 
                                            transition-all duration-200 border ${ isActive
                                                ? "text-white shadow-md"
                                                : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.04]"
                                            }` }
                                        style={
                                            isActive
                                                ? {
                                                    backgroundColor: c.bg,
                                                    borderColor: c.border,
                                                    boxShadow: `0 0 12px ${ c.primary }10`,
                                                }
                                                : undefined
                                        }
                                    >
                                        <span style={ isActive ? { color: c.primary } : undefined }>
                                            { name }
                                        </span>
                                        { count > 0 && (
                                            <span className="mr-1 text-[9px] opacity-50">({ count })</span>
                                        ) }
                                    </button>
                                );
                            } ) }
                        </div>

                        <button
                            onClick={ refresh }
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-teal-400 transition-colors flex-shrink-0"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Row 2: Category Tabs — scrollable */ }
                    { categories.length > 0 && (
                        <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
                            { categories.map( ( cat ) =>
                            {
                                const isActive = selectedCategory === cat.slug;
                                return (
                                    <button
                                        key={ cat.slug }
                                        onClick={ () => handleCategoryChange( cat.slug ) }
                                        className={ `flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 
                                            text-[10px] sm:text-[11px] font-medium transition-all border-b-2 ${ isActive
                                                ? "border-current"
                                                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
                                            }` }
                                        style={ isActive ? { color: accent.primary } : undefined }
                                    >
                                        { CATEGORY_ICONS[ cat.slug ] || (
                                            <BarChart3 className="w-3 h-3" />
                                        ) }
                                        <span className="whitespace-nowrap">{ cat.name }</span>
                                        <span className="text-[9px] opacity-40">
                                            { cat.count }
                                        </span>
                                    </button>
                                );
                            } ) }
                        </div>
                    ) }
                </div>
            </header>

            {/* ═══════════ MAIN ═══════════ */ }
            <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full">
                {/* ─── Metrics List (Left/Top Panel) ─── */ }
                <aside
                    className="lg:w-56 xl:w-64 border-b lg:border-b-0 lg:border-l border-white/[0.06] 
                    bg-[#0d1512]/60 flex-shrink-0 overflow-hidden"
                >
                    <div
                        className="flex lg:flex-col gap-0 overflow-x-auto lg:overflow-y-auto 
                        lg:max-h-[calc(100vh-120px)] scrollbar-hide"
                    >
                        { currentCategoryMetrics.length > 0 ? (
                            currentCategoryMetrics.map( ( m ) =>
                            {
                                const isActive = selectedMetric === m.key;
                                const val =
                                    m.series?.data?.[ m.series.data.length - 1 ]?.value;
                                return (
                                    <button
                                        key={ m.key }
                                        onClick={ () => setSelectedMetric( m.key ) }
                                        className={ `flex-shrink-0 w-48 sm:w-52 lg:w-full text-right px-3 py-3
                                            border-b border-white/[0.04] transition-all duration-150
                                            ${ isActive
                                                ? "bg-white/[0.06]"
                                                : "hover:bg-white/[0.03]"
                                            }` }
                                        style={
                                            isActive
                                                ? {
                                                    borderRight: `3px solid ${ accent.primary }`,
                                                }
                                                : { borderRight: "3px solid transparent" }
                                        }
                                    >
                                        <div
                                            className={ `text-[11px] sm:text-xs font-medium leading-snug ${ isActive ? "text-white" : "text-slate-400"
                                                }` }
                                        >
                                            { m.name }
                                        </div>
                                        { val != null && (
                                            <div
                                                className="text-[10px] mt-0.5 font-mono"
                                                style={ {
                                                    color: isActive
                                                        ? accent.primary
                                                        : "rgba(255,255,255,0.2)",
                                                } }
                                            >
                                                { compactNum( val ) }
                                            </div>
                                        ) }
                                    </button>
                                );
                            } )
                        ) : (
                            <div className="p-6 text-center text-xs text-slate-600">
                                { loading ? (
                                    <Loader2 className="w-5 h-5 mx-auto animate-spin text-slate-600" />
                                ) : (
                                    "لا توجد مقاييس"
                                ) }
                            </div>
                        ) }
                    </div>
                </aside>

                {/* ─── Chart Area ─── */ }
                <main
                    className="flex-1 min-w-0 flex flex-col"
                    ref={ chartContainerRef }
                    style={ isFullscreen ? { backgroundColor: "#0b1210" } : undefined }
                >
                    { activeMetric ? (
                        <>
                            {/* ─── Chart Header ─── */ }
                            <div className="border-b border-white/[0.06]">
                                {/* Title Bar */ }
                                <div className="flex items-center justify-between px-3 sm:px-5 py-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={ { backgroundColor: accent.primary } }
                                        />
                                        <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                                            { assetName }: { activeMetric.name }
                                        </h2>
                                        { lastValue != null && (
                                            <span
                                                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold 
                                                    px-2.5 py-0.5 rounded-md"
                                                style={ {
                                                    color: accent.primary,
                                                    backgroundColor: accent.bg,
                                                } }
                                            >
                                                { compactNum( lastValue ) }
                                                { changePercent !== 0 && (
                                                    <span
                                                        className={
                                                            changePercent > 0
                                                                ? "text-emerald-400"
                                                                : "text-red-400"
                                                        }
                                                    >
                                                        { changePercent > 0 ? "▲" : "▼" }
                                                        { Math.abs( changePercent ).toFixed( 1 ) }%
                                                    </span>
                                                ) }
                                            </span>
                                        ) }
                                    </div>

                                    {/* Actions */ }
                                    <div className="hidden sm:flex items-center gap-0.5 text-slate-500">
                                        <button
                                            className="p-1.5 hover:bg-white/[0.06] rounded-lg hover:text-amber-400 transition-colors"
                                            title="المفضلة"
                                        >
                                            <Star className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            className="p-1.5 hover:bg-white/[0.06] rounded-lg hover:text-blue-400 transition-colors"
                                            title="مشاركة"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={ toggleFullscreen }
                                            className="p-1.5 hover:bg-white/[0.06] rounded-lg hover:text-teal-400 transition-colors"
                                            title="شاشة كاملة"
                                        >
                                            { isFullscreen ? (
                                                <Minimize2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            ) }
                                        </button>
                                    </div>
                                </div>

                                {/* Controls Bar */ }
                                <div className="flex items-center justify-between px-3 sm:px-5 pb-2.5 gap-3 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        {/* View Mode Toggle */ }
                                        <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
                                            <button
                                                onClick={ () => setViewMode( "chart" ) }
                                                className={ `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs 
                                                font-medium transition-all ${ viewMode === "chart"
                                                        ? "bg-white/[0.1] text-white shadow-sm"
                                                        : "text-slate-500 hover:text-slate-300"
                                                    }` }
                                            >
                                                <Activity className="w-3 h-3" />
                                                <span className="hidden sm:inline">Chart</span>
                                            </button>
                                            <button
                                                onClick={ () => setViewMode( "table" ) }
                                                className={ `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs 
                                                font-medium transition-all ${ viewMode === "table"
                                                        ? "bg-white/[0.1] text-white shadow-sm"
                                                        : "text-slate-500 hover:text-slate-300"
                                                    }` }
                                            >
                                                <TableIcon className="w-3 h-3" />
                                                <span className="hidden sm:inline">Data</span>
                                            </button>

                                            {/* Download CSV */ }
                                            { viewMode === "table" && (
                                                <button
                                                    onClick={ downloadCSV }
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs 
                                                    font-medium text-slate-500 hover:text-teal-400 hover:bg-white/[0.04] transition-all"
                                                    title="Download CSV"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                            ) }
                                        </div>

                                        {/* Chart Type Toggle */ }
                                        { viewMode === "chart" && (
                                            <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
                                                <button
                                                    onClick={ () => setChartType( "bar" ) }
                                                    className={ `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs 
                                                font-medium transition-all ${ chartType === "bar"
                                                            ? "bg-white/[0.1] text-white shadow-sm"
                                                            : "text-slate-500 hover:text-slate-300"
                                                        }` }
                                                >
                                                    <BarChart3 className="w-3 h-3" />
                                                    <span className="hidden sm:inline">Bar</span>
                                                </button>
                                                <button
                                                    onClick={ () => setChartType( "line" ) }
                                                    className={ `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs 
                                                font-medium transition-all ${ chartType === "line"
                                                            ? "bg-white/[0.1] text-white shadow-sm"
                                                            : "text-slate-500 hover:text-slate-300"
                                                        }` }
                                                >
                                                    <LineChart className="w-3 h-3" />
                                                    <span className="hidden sm:inline">Line</span>
                                                </button>
                                            </div>
                                        ) }
                                    </div>

                                    {/* Time Range */ }
                                    <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
                                        { TIME_RANGES.map( ( r ) => (
                                            <button
                                                key={ r.key }
                                                onClick={ () => setTimeRange( r.key ) }
                                                className={ `px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium 
                                                    transition-all ${ timeRange === r.key
                                                        ? "text-white shadow-sm"
                                                        : "text-slate-500 hover:text-slate-300"
                                                    }` }
                                                style={
                                                    timeRange === r.key
                                                        ? {
                                                            backgroundColor:
                                                                accent.primary + "20",
                                                            color: accent.primary,
                                                        }
                                                        : undefined
                                                }
                                            >
                                                { r.label }
                                            </button>
                                        ) ) }
                                    </div>
                                </div>
                            </div>

                            {/* ─── Content Area (Chart OR Table) ─── */ }
                            <div className="flex-1 min-h-0 p-1.5 sm:p-3 lg:p-4">
                                { viewMode === "table" ? (
                                    <div className="h-full overflow-hidden bg-white/[0.02] rounded-lg border border-white/[0.06]">
                                        <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-[#0f1a17] z-10 border-b border-white/[0.06] shadow-sm">
                                                    <tr>
                                                        <th className="px-4 py-3 text-[10px] sm:text-xs font-medium text-slate-400 text-right">Date</th>
                                                        <th className="px-4 py-3 text-[10px] sm:text-xs font-medium text-slate-400 text-left" dir="ltr">Value ({ activeMetric.series?.unit })</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.04]">
                                                    { ( () =>
                                                    {
                                                        const data = activeMetric.series?.data || [];
                                                        const sorted = [ ...data ].reverse();
                                                        return sorted.length > 0 ? sorted.map( ( row: any, i: number ) => (
                                                            <tr key={ i } className="hover:bg-white/[0.04] transition-colors group">
                                                                <td className="px-4 py-2.5 text-[11px] sm:text-xs text-slate-300 font-mono text-right">
                                                                    { row.date }
                                                                </td>
                                                                <td className="px-4 py-2.5 text-[11px] sm:text-xs font-bold font-mono text-left" dir="ltr" style={ { color: accent.primary } }>
                                                                    { compactNum( row.value ) }
                                                                </td>
                                                            </tr>
                                                        ) ) : (
                                                            <tr>
                                                                <td colSpan={ 2 } className="px-4 py-8 text-center text-xs text-slate-600">
                                                                    No data available
                                                                </td>
                                                            </tr>
                                                        );
                                                    } )() }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={ selectedMetric + chartType + timeRange }
                                            initial={ { opacity: 0 } }
                                            animate={ { opacity: 1 } }
                                            exit={ { opacity: 0 } }
                                            transition={ { duration: 0.15 } }
                                            className="h-full"
                                        >
                                            { chartOption ? (
                                                <ProChart
                                                    option={ chartOption }
                                                    height={
                                                        isFullscreen
                                                            ? "calc(100vh - 140px)"
                                                            : "calc(100vh - 250px)"
                                                    }
                                                    bare
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full min-h-[300px] text-slate-600 text-xs">
                                                    لا توجد بيانات كافية لعرض الشارت
                                                </div>
                                            ) }
                                        </motion.div>
                                    </AnimatePresence>
                                ) }
                            </div>

                            {/* ─── Legend ─── */ }
                            <div className="flex items-center justify-center gap-6 pb-2 text-[10px] sm:text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="w-3 h-2.5 rounded-sm"
                                        style={ { backgroundColor: accent.primary } }
                                    />
                                    <span>{ activeMetric.name }</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ─── Empty State ─── */
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center py-20 text-slate-600">
                                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-15" />
                                <p className="text-sm mb-1">
                                    { loading
                                        ? "جاري التحميل..."
                                        : "لا توجد بيانات بعد" }
                                </p>
                                <p className="text-[10px] text-slate-700 font-mono direction-ltr mt-2">
                                    python -m crawler.cryptoquant.pipeline --asset{ " " }
                                    { selectedAsset }
                                </p>
                            </div>
                        </div>
                    ) }
                </main>
            </div>
        </div>
    );
}
