# 📊 D3.js Charts - دليل التحويل الشامل من ECharts إلى D3.js بتصميم Glassnode

## 🎯 نظرة عامة

تم إنشاء نظام متكامل من مكونات D3.js قابلة لإعادة الاستخدام مع تصميم احترافي يشبه **Glassnode.com**. هذا الدليل يغطي كل ما تحتاجه لتحويل صفحاتك من ECharts إلى D3.

---

## ✅ ما تم إنجازه

### 1. **مكونات D3.js الأساسية (5 مكونات)**

#### 📍 الموقع: `src/components/charts/d3/`

- ✅ **LineChart.tsx** - خط واحد بسيط
- ✅ **AreaChart.tsx** - منطقة مع تعبئة لون
- ✅ **MultiLineChart.tsx** - خطوط متعددة على نفس المخطط
- ✅ **StackedAreaChart.tsx** - مناطق متراكمة
- ✅ **BarChart.tsx** - أعمدة رأسية/أفقية

#### 🎨 **التصميم:**
- شبكة دقيقة مخططة (دقة Glassnode)
- خطوط سلسة مع curves
- Tooltips تفاعلية
- محاور منسقة بشكل احترافي
- دعم كامل للـ Responsive

---

### 2. **أدوات مساعدة (Utilities)**

#### 📍 الموقع: `src/lib/chart-utils.ts`

```typescript
// ألوان Glassnode
GLASSNODE_COLORS

// توليد بيانات وهمية
generateMockTimeSeries()

// تنسيق الأرقام
formatCompact(), formatUSD(), formatPercent()

// تحويل ECharts → D3
echartsToD3Format()

// إنشاء series config
createSeriesConfig()

// حساب Moving Average
calculateMovingAverage()
```

---

### 3. **صفحة نموذجية مكتملة**

✅ **`app/chat/polygon-nft/page.tsx`** - تم التحويل بالكامل

**المخططات المحولة:**
- Daily Sales Volume (MultiLineChart)
- Daily Transactions (AreaChart)
- Daily Sales Activity (AreaChart + MultiLineChart)
- Marketplace Volume (StackedAreaChart)
- Marketplace Sales (StackedAreaChart)
- Volume per Marketplace (StackedAreaChart)
- Buyers per Marketplace (StackedAreaChart)
- Sales per Marketplace (StackedAreaChart)

---

## 🚀 دليل الاستخدام السريع

### خطوة 1: استيراد المكونات

```tsx
// استبدل هذا السطر:
import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// بهذا:
import { MultiLineChart, AreaChart, BarChart, StackedAreaChart, LineChart } from "@/components/charts/d3";
import { GLASSNODE_COLORS, createSeriesConfig, echartsToD3Format } from "@/lib/chart-utils";
```

---

### خطوة 2: تحويل البيانات

#### **قبل (ECharts):**
```tsx
const option = {
  xAxis: { data: ["Jan", "Feb", "Mar"] },
  series: [
    { name: "Sales", data: [100, 200, 150] },
    { name: "MA30", data: [110, 180, 160] }
  ]
};
```

#### **بعد (D3):**
```tsx
const data = [
  { date: new Date("2024-01-01"), Sales: 100, MA30: 110 },
  { date: new Date("2024-02-01"), Sales: 200, MA30: 180 },
  { date: new Date("2024-03-01"), Sales: 150, MA30: 160 }
];

const series = createSeriesConfig(
  ["Sales", "MA30"],
  ["Sales Volume", "30D Moving Average"],
  [GLASSNODE_COLORS.primary, GLASSNODE_COLORS.grayMedium]
);
```

---

### خطوة 3: استخدام المكون

#### **قبل (ECharts):**
```tsx
<ReactECharts option={option} style={{ height: "400px" }} theme="dark" />
```

#### **بعد (D3):**
```tsx
<MultiLineChart
  data={data}
  series={series}
  height={400}
  showLegend={true}
  showGrid={true}
/>
```

---

## 📚 أمثلة لكل مكون

### 1️⃣ **LineChart** - خط واحد

```tsx
<LineChart
  data={[
    { date: new Date("2024-01-01"), value: 100 },
    { date: new Date("2024-02-01"), value: 150 },
    { date: new Date("2024-03-01"), value: 120 }
  ]}
  height={360}
  color={GLASSNODE_COLORS.primary}
  strokeWidth={2}
  showGrid={true}
  yAxisLabel="Price (USD)"
/>
```

---

### 2️⃣ **AreaChart** - منطقة مع تعبئة

```tsx
<AreaChart
  data={[
    { date: new Date("2024-01-01"), value: 1000000 },
    { date: new Date("2024-02-01"), value: 1500000 }
  ]}
  height={360}
  color={GLASSNODE_COLORS.secondary}
  fillOpacity={0.6}
  showGrid={true}
/>
```

---

### 3️⃣ **MultiLineChart** - خطوط متعددة

```tsx
const data = [
  { date: new Date("2024-01-01"), BTC: 50000, ETH: 3000, Price: 55000 },
  { date: new Date("2024-02-01"), BTC: 52000, ETH: 3200, Price: 57000 }
];

<MultiLineChart
  data={data}
  series={[
    { key: "BTC", color: GLASSNODE_COLORS.series[0], label: "Bitcoin Price" },
    { key: "ETH", color: GLASSNODE_COLORS.series[1], label: "Ethereum Price" },
    { key: "Price", color: GLASSNODE_COLORS.primary, label: "Market Price" }
  ]}
  height={400}
  showLegend={true}
  showGrid={true}
/>
```

---

### 4️⃣ **StackedAreaChart** - مناطق متراكمة

```tsx
const data = [
  { date: new Date("2024-01-01"), Binance: 50, Coinbase: 30, Kraken: 20 },
  { date: new Date("2024-02-01"), Binance: 55, Coinbase: 25, Kraken: 20 }
];

<StackedAreaChart
  data={data}
  series={[
    { key: "Binance", color: "#ff8c42", label: "Binance" },
    { key: "Coinbase", color: "#4a90e2", label: "Coinbase" },
    { key: "Kraken", color: "#22c55e", label: "Kraken" }
  ]}
  height={400}
  showLegend={true}
  showGrid={true}
/>
```

---

### 5️⃣ **BarChart** - أعمدة

```tsx
<BarChart
  data={[
    { label: "Binance", value: 1000000 },
    { label: "Coinbase", value: 850000 },
    { label: "Kraken", value: 500000 }
  ]}
  height={360}
  color={GLASSNODE_COLORS.secondary}
  orientation="vertical"
  showGrid={true}
/>
```

---

## 🎨 ألوان Glassnode الموصى بها

```typescript
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

// Primary Colors
GLASSNODE_COLORS.primary        // #000000 (أسود - خط رئيسي)
GLASSNODE_COLORS.secondary      // #ff8c42 (برتقالي - منطقة)
GLASSNODE_COLORS.tertiary       // #4a90e2 (أزرق)

// Status
GLASSNODE_COLORS.positive       // #22c55e (أخضر)
GLASSNODE_COLORS.negative       // #ef4444 (أحمر)

// Gray Scale
GLASSNODE_COLORS.grayLight      // #9ca3af
GLASSNODE_COLORS.grayMedium     // #6b7280
GLASSNODE_COLORS.grayDark       // #374151

// Multi-series (10 colors)
GLASSNODE_COLORS.series[0]      // #ff8c42
GLASSNODE_COLORS.series[1]      // #4a90e2
// ... etc
```

---

## 🔄 تحويل سريع: مثال كامل

### **قبل (ECharts):**

```tsx
const dailySalesOption = useMemo(() => ({
  backgroundColor: "transparent",
  tooltip: { trigger: "axis" },
  legend: { data: ["Sales", "MA30"] },
  xAxis: {
    type: "category",
    data: dates.map(d => d3.timeFormat("%b %d")(new Date(d)))
  },
  yAxis: { type: "value" },
  series: [
    {
      name: "Sales",
      type: "line",
      data: salesData,
      itemStyle: { color: "#8b5cf6" }
    },
    {
      name: "MA30",
      type: "line",
      data: ma30Data,
      itemStyle: { color: "#6b7280" }
    }
  ]
}), [dates, salesData, ma30Data]);

return <ReactECharts option={dailySalesOption} style={{ height: "400px" }} />;
```

---

### **بعد (D3):**

```tsx
import { MultiLineChart } from "@/components/charts/d3";
import { GLASSNODE_COLORS, createSeriesConfig } from "@/lib/chart-utils";

const data = useMemo(() => 
  dates.map((date, i) => ({
    date: new Date(date),
    Sales: salesData[i],
    MA30: ma30Data[i]
  }))
, [dates, salesData, ma30Data]);

const series = createSeriesConfig(
  ["Sales", "MA30"],
  ["Sales Volume", "30D Moving Average"],
  [GLASSNODE_COLORS.primary, GLASSNODE_COLORS.grayMedium]
);

return (
  <MultiLineChart
    data={data}
    series={series}
    height={400}
    showLegend={true}
    showGrid={true}
  />
);
```

---

## 🛠️ أدوات مساعدة إضافية

### **تحويل أوتوماتيكي من ECharts إلى D3:**

```tsx
import { echartsToD3Format } from "@/lib/chart-utils";

// ECharts format
const dates = ["2024-01-01", "2024-02-01", "2024-03-01"];
const series = [
  { name: "Sales", data: [100, 200, 150] },
  { name: "MA30", data: [110, 180, 160] }
];

// D3 format (automatically converted)
const d3Data = echartsToD3Format(dates, series);
// Result:
// [
//   { date: Date("2024-01-01"), Sales: 100, MA30: 110 },
//   { date: Date("2024-02-01"), Sales: 200, MA30: 180 },
//   ...
// ]
```

---

### **حساب Moving Average:**

```tsx
import { calculateMovingAverage } from "@/lib/chart-utils";

const prices = [100, 110, 105, 120, 115];
const ma7 = calculateMovingAverage(prices, 7);
const ma30 = calculateMovingAverage(prices, 30);
```

---

### **تنسيق الأرقام:**

```tsx
import { formatCompact, formatUSD, formatPercent } from "@/lib/chart-utils";

formatCompact(1500000)    // "1.5M"
formatCompact(2500000000) // "2.5B"
formatUSD(1500000)        // "$1.5M"
formatPercent(15.5)       // "15.50%"
```

---

## 📋 قائمة الصفحات

### ✅ **مكتملة:**
1. ✅ `/chat/polygon-nft` - نموذج كامل ومفصل

### 🔄 **قيد التحويل:**
1. 🔄 `/chat/bitcoin-etf` - بدأ التحويل
2. ⏳ `/chat/ethereum-etf` - لم يبدأ
3. ⏳ `/chat/polygon` - لم يبدأ
4. ⏳ `/chat/polygon-pos-payments` - لم يبدأ
5. ⏳ `/chat/polygon-stablecoin` - لم يبدأ
6. ⏳ `/chat/polygon-data-catalog` - لم يبدأ
7. ⏳ `/chat/pol-token` - لم يبدأ
8. ⏳ `/chat/agora-pos` - لم يبدأ
9. ⏳ `/chat/polymarket-markets` - لم يبدأ

---

## 🐛 استكشاف الأخطاء

### ❌ **الخطأ:** "Cannot read property 'map' of undefined"
✅ **الحل:** تأكد من أن `data` ليس `null` أو `undefined`

```tsx
const data = useMemo(() => {
  if (!sales || sales.length === 0) return [];
  return sales.map(/* ... */);
}, [sales]);

// في المكون:
{data.length > 0 && <LineChart data={data} />}
```

---

### ❌ **الخطأ:** "Invalid Date"
✅ **الحل:** تأكد من استخدام `new Date()` بشكل صحيح

```tsx
// ❌ خطأ:
{ date: "2024-01-01", value: 100 }

// ✅ صحيح:
{ date: new Date("2024-01-01"), value: 100 }
```

---

### ❌ **الشارت لا يظهر**
✅ **الحل:** تحقق من:
1. هل `data` يحتوي على عناصر؟
2. هل `height` محدد بشكل صحيح؟
3. هل المكون داخل container بعرض كامل (`w-full`)?

```tsx
<div className="w-full">
  <LineChart data={data} height={400} />
</div>
```

---

## 📖 مراجع إضافية

- **D3.js Documentation:** <https://d3js.org/>
- **Glassnode:** <https://glassnode.com/> (مرجع التصميم)
- **صفحة نموذجية:** `app/chat/polygon-nft/page.tsx`
- **دليل الهجرة:** `D3_MIGRATION_GUIDE.md`
- **أدوات مساعدة:** `src/lib/chart-utils.ts`

---

## 💡 نصائح مهمة

1. **استخدم `useMemo`** لتجنب إعادة حساب البيانات
2. **استخدم ألوان Glassnode** للحصول على مظهر احترافي
3. **اختبر على أحجام الشاشات المختلفة** - المكونات responsive
4. **راجع polygon-nft** كمثال شامل
5. **استخدم الأدوات المساعدة** في `chart-utils.ts` لتوفير الوقت

---

## 🎯 الخطوات التالية

1. راجع `/chat/polygon-nft` للتعلم من المثال الكامل
2. ابدأ بتحويل صفحة واحدة في كل مرة
3. استخدم `echartsToD3Format()` لتحويل البيانات بسرعة
4. اختبر كل مخطط بعد التحويل
5. استمر في باقي الصفحات

---

**تم إنشاؤه:** فبراير 2025  
**آخر تحديث:** الآن  
**الإصدار:** 1.0  
**الحالة:** ✅ جاهز للاستخدام
