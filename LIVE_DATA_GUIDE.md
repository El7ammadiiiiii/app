# 🔄 دليل تحويل الصفحات إلى بيانات حية — Live Data Guide

## 📋 ملخص البنية

```
                    External APIs (Free)
                    ┌─────────────────────┐
                    │ DeFiLlama          │
                    │ CoinGecko          │
                    │ PolygonScan        │
                    │ Polymarket CLOB    │
                    │ Farside Investors  │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │ 🕷️ Python Crawlers │
                    │ (كل 1-6 ساعات)     │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │ 💾 JSON Files      │
                    │ crawler/data/latest │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │ 🌐 Next.js API     │
                    │ /api/crawler/*     │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │ ⚛️ React Hooks     │
                    │ use-crawler-data   │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │ 📊 D3.js Charts    │
                    │ بيانات حية!        │
                    └─────────────────────┘
```

---

## 🚀 الخطوة 1: تشغيل الزواحف (مرة واحدة أو تلقائي)

### تشغيل لمرة واحدة
```powershell
# من الجذر (c:\Users\GAME\elhammadi)

# زحف Polygon Analytics (DeFi, NFT, Stablecoins, POL Token, Polymarket)
python -m crawler.runner --family polygon-analytics

# زحف ETF Data (Bitcoin + Ethereum ETFs)  
python -m crawler.runner --family etf

# زحف DeFiLlama (cross-chain data)
python -m crawler.runner --family defillama

# زحف بيانات السلسلة الأساسية (Polygon chain)
python -m crawler.runner --chain polygon

# أو تشغيل الكل مرة واحدة:
.\RUN_ANALYTICS_CRAWLERS.ps1
```

### تشغيل مستمر (auto-scheduler)
```powershell
# تحديث تلقائي كل ساعة (سريع) + كل 6 ساعات (كامل)
python -m crawler.runner --auto --family all

# أو Polygon + ETF فقط (أخف):
.\RUN_ANALYTICS_CRAWLERS.ps1 -Auto
```

### الملفات المنتجة
```
crawler/data/latest/
├── __polygon_analytics__.json    ← بيانات Polygon التحليلية
├── __etf_data__.json             ← بيانات Bitcoin & Ethereum ETF
├── __defillama__.json            ← بيانات DeFiLlama عبر-سلاسل
├── polygon.json                  ← بيانات سلسلة Polygon الأساسية
├── bitcoin.json                  ← بيانات سلسلة Bitcoin
└── ethereum.json                 ← بيانات سلسلة Ethereum
```

---

## 🚀 الخطوة 2: API Routes متوفرة

| Endpoint | الوصف | مثال |
|----------|-------|------|
| `/api/crawler/polygon-analytics` | كل بيانات Polygon التحليلية | `?section=defi` |
| `/api/crawler/polygon-analytics?section=nft` | بيانات NFT | - |
| `/api/crawler/polygon-analytics?section=stablecoins` | عملات مستقرة | - |
| `/api/crawler/polygon-analytics?section=pol_token` | بيانات POL Token | - |
| `/api/crawler/polygon-analytics?section=polymarket` | Polymarket | - |
| `/api/crawler/polygon-analytics?section=evm_comparison` | مقارنة EVM | - |
| `/api/crawler/polygon-analytics?section=pos_payments` | مدفوعات PoS | - |
| `/api/crawler/polygon-analytics?section=fx_dashboard` | أسعار FX | - |
| `/api/crawler/polygon-analytics?section=data_catalog` | كتالوج البيانات | - |
| `/api/crawler/etf?asset=bitcoin` | Bitcoin ETF | - |
| `/api/crawler/etf?asset=ethereum` | Ethereum ETF | - |
| `/api/crawler/defillama?section=tvl` | TVL عبر-سلاسل | - |
| `/api/crawler/chain?chain=polygon` | بيانات السلسلة الأساسية | - |
| `/api/crawler/history?chain=polygon&days=30` | بيانات تاريخية | - |

---

## 🚀 الخطوة 3: تحويل الصفحات — النمط العام

### ❌ قبل (بيانات وهمية)
```tsx
// ❌ القديم: Math.random() لكل شيء
const chartData = useMemo(() => {
    return dates.map((date) => ({
        date: new Date(date),
        value: Math.random() * 500000 + 200000,  // ❌ وهمي!
    }));
}, [dates]);
```

### ✅ بعد (بيانات حية)
```tsx
import {
    usePolygonAnalytics,
    useChainData,
    toPriceChartData,
} from '@/hooks/use-crawler-data';

export default function PolygonNFTPage() {
    // ✅ Hook يجلب بيانات حية كل دقيقتين
    const { data: nftData, loading, error, lastUpdated } = usePolygonAnalytics('nft');
    const { data: chainData } = useChainData('polygon');

    // ✅ تحويل البيانات الحية لتنسيق الرسم البياني
    const collectionsData = useMemo(() => {
        if (!nftData?.collections) return [];
        return nftData.collections.map((c: any) => ({
            label: c.name,
            value: c.volume_24h_usd || 0,
        }));
    }, [nftData]);

    return (
        <div>
            {/* ✅ حالة التحميل */}
            {loading && <Spinner />}
            {error && <ErrorBanner message={error} />}

            {/* ✅ آخر تحديث */}
            {lastUpdated && (
                <span>آخر تحديث: {lastUpdated.toLocaleTimeString()}</span>
            )}

            {/* ✅ بيانات حية */}
            <BarChart data={collectionsData} height={300} />
        </div>
    );
}
```

---

## 📊 مرجع التحويل لكل صفحة

### 🖼️ Polygon NFT (`polygon-nft/page.tsx`)

| المتغير الوهمي | Hook البديل | الحقل |
|----------------|------------|-------|
| `dailySalesVolumeData` | `usePolygonNFT()` | `data.collections[].volume_24h_usd` |
| `dailySalesTransactionsData` | `usePolygonNFT()` | `data.collections[].total_supply` |
| `marketplaceVolumeData` | `usePolygonNFT()` | `data.marketplaces[]` |
| `buyersPerMarketplaceData` | `usePolygonNFT()` | `data.collections[].unique_addresses` |

```tsx
// خطوة 1: إضافة الاستيراد
import { usePolygonNFT, useChainData } from '@/hooks/use-crawler-data';

// خطوة 2: استبدال useState + useEffect
const { data: nftData, loading } = usePolygonNFT();
const { data: chainData } = useChainData('polygon');

// خطوة 3: استبدال useMemo الوهمي
const collectionsBarData = useMemo(() => {
    if (!nftData?.collections) return [];
    return nftData.collections.slice(0, 10).map((c: any) => ({
        label: c.name || 'Unknown',
        value: c.volume_24h_usd || 0,
    }));
}, [nftData]);
```

---

### ₿ Bitcoin ETF (`bitcoin-etf/page.tsx`)

| المتغير الوهمي | Hook البديل | الحقل |
|----------------|------------|-------|
| `flowsUSDOption` | `useBitcoinETF()` | `data.flows[]` |
| `onchainHoldingsOption` | `useBitcoinETF()` | `data.btc_price_history[]` |
| `aumMarketshareOption` | `useBitcoinETF()` | `data.issuers[]` |
| BTC price series | `useBitcoinETF()` | `data.btc_price_history[]` → `toPriceChartData()` |
| `etfsOverviewData` | `useBitcoinETF()` | `data.issuers[]` |

```tsx
import { useBitcoinETF, toPriceChartData } from '@/hooks/use-crawler-data';

const { data: etfData, loading } = useBitcoinETF();

// سعر BTC التاريخي (حقيقي!)
const btcPriceData = useMemo(() => {
    return toPriceChartData(etfData?.btc_price_history || []);
}, [etfData]);

// ETF Flows (إن توفرت من Farside)
const flowsData = useMemo(() => {
    if (!etfData?.flows?.length) return [];
    return etfData.flows.map((f: any) => ({
        date: new Date(f.date),
        ...Object.fromEntries(
            etfData.issuers.map((iss: any) => [iss.ticker, f[iss.ticker] || 0])
        ),
    }));
}, [etfData]);
```

---

### 📈 Ethereum ETF (`ethereum-etf/page.tsx`)

```tsx
import { useEthereumETF, toPriceChartData } from '@/hooks/use-crawler-data';

const { data: etfData, loading } = useEthereumETF();

const ethPriceData = useMemo(() => {
    return toPriceChartData(etfData?.eth_price_history || []);
}, [etfData]);
```

---

### 💵 Polygon Stablecoins (`polygon-stablecoin/page.tsx`)

| المتغير الوهمي | Hook البديل | الحقل |
|----------------|------------|-------|
| `supplyOption` | `usePolygonStablecoins()` | `data.stablecoins[].circulating_polygon` |
| `volumesByCategoryOption` | `usePolygonStablecoins()` | `data.history[]` |
| Stablecoin list | `usePolygonStablecoins()` | `data.stablecoins[]` |

```tsx
import { usePolygonStablecoins, toStablecoinChartData } from '@/hooks/use-crawler-data';

const { data: stableData, loading } = usePolygonStablecoins();

// TVL تاريخي مستقرات
const stablecoinHistory = useMemo(() => {
    return toStablecoinChartData(stableData?.history || []);
}, [stableData]);

// توزيع حسب العملة
const stablecoinPieData = useMemo(() => {
    if (!stableData?.stablecoins) return [];
    return stableData.stablecoins.slice(0, 10).map((s: any) => ({
        label: s.symbol,
        value: s.circulating_polygon,
    }));
}, [stableData]);
```

---

### 📊 Polymarket (`polymarket-markets/page.tsx`)

```tsx
import { usePolymarket } from '@/hooks/use-crawler-data';

const { data: pmData, loading } = usePolymarket();

// أسواق التنبؤ الحقيقية
const marketsData = useMemo(() => {
    if (!pmData?.markets) return [];
    return pmData.markets.map((m: any) => ({
        question: m.question,
        volume_24h: m.volume_24h,
        liquidity: m.liquidity,
        category: m.category,
        outcomes: m.outcomes,
    }));
}, [pmData]);
```

---

### 🪙 POL Token (`pol-token/page.tsx`)

```tsx
import { usePolToken, toPriceChartData } from '@/hooks/use-crawler-data';

const { data: polData, loading } = usePolToken();

// سعر POL التاريخي (حقيقي من CoinGecko!)
const polPriceHistory = useMemo(() => {
    return toPriceChartData(polData?.price_history || []);
}, [polData]);

// بيانات السوق الحالية
const currentMarketData = polData?.current || {};
```

---

### 💎 Polygon DeFi (`polygon-defi/page.tsx`)

```tsx
import { usePolygonDefi, usePolygonTVLHistory, toTVLChartData } from '@/hooks/use-crawler-data';

const { data: defiData } = usePolygonDefi();
const { data: tvlData } = usePolygonTVLHistory();

// TVL التاريخي حقيقي من DeFiLlama!
const tvlHistory = useMemo(() => {
    return toTVLChartData(tvlData || []);
}, [tvlData]);

// أفضل البروتوكولات
const protocolsData = useMemo(() => {
    if (!defiData?.protocols) return [];
    return defiData.protocols.slice(0, 15).map((p: any) => ({
        label: p.name,
        value: p.tvl,
    }));
}, [defiData]);
```

---

### ⚡ EVM Comparison (`evm-comparison/page.tsx`)

```tsx
import { useEVMComparison, toComparisonBarData } from '@/hooks/use-crawler-data';

const { data: evmData } = useEVMComparison();

const tvlComparison = useMemo(() => {
    return toComparisonBarData(evmData?.chains || [], 'tvl');
}, [evmData]);
```

---

## 🔌 مصادر البيانات المجانية

| المصدر | API | بدون مفتاح؟ | معدل الطلبات | البيانات المتوفرة |
|--------|-----|-------------|-------------|-------------------|
| **DeFiLlama** | `api.llama.fi` | ✅ نعم | ~300/5min | TVL, DEX, Fees, Yields, Stablecoins, Bridges |
| **CoinGecko** | `api.coingecko.com/api/v3` | ✅ نعم | 30/min | أسعار, Market Cap, NFTs, Volume |
| **PolygonScan** | `api.polygonscan.com/api` | ❌ يحتاج مفتاح مجاني | 5/sec | Transactions, Gas, Tokens, Contracts |
| **Polymarket** | `gamma-api.polymarket.com` | ✅ نعم | غير محدد | Markets, Volumes, Liquidity |
| **Farside** | `farside.co.uk` | ✅ Web Scraping | 1/min | ETF Daily Flows |

---

## ⚠️ ملاحظات مهمة

### 1. البيانات التاريخية (Time Series)
- **DeFiLlama** يوفر TVL تاريخي جاهز (`/v2/historicalChainTvl/Polygon`)
- **CoinGecko** يوفر أسعار تاريخية (`/market_chart?days=365`)
- **بيانات السلسلة**: تتراكم من الزاحف عبر الوقت (كل لقطة تُحفظ في `history/`)
- **PolygonScan**: يوفر `dailytx` و `dailyavggasprice` APIs

### 2. Fallback عند غياب البيانات
```tsx
const chartData = useMemo(() => {
    if (!realData || realData.length === 0) {
        // Fallback: عرض رسالة بدلاً من بيانات وهمية
        return null;
    }
    return transformData(realData);
}, [realData]);

// في JSX:
{chartData ? (
    <AreaChart data={chartData} />
) : (
    <div className="text-gray-400 text-center py-8">
        ⏳ شغّل الزاحف لجلب بيانات حقيقية
        <br />
        <code>python -m crawler.runner --family polygon-analytics</code>
    </div>
)}
```

### 3. تحديث تلقائي
- كل Hook يحدّث تلقائياً كل **دقيقتين** (120 ثانية)
- الزاحف يحدّث الملفات كل **ساعة** (quick) أو **6 ساعات** (full)
- API Route يقرأ من الملفات مع **cache** لمدة 30-60 ثانية
