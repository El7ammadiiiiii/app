# دليل الانتقال من ECharts إلى D3.js - تصميم Glassnode

## نظرة عامة
تم إنشاء مكونات D3.js قابلة لإعادة الاستخدام مع تصميم احترافي يشبه Glassnode. هذا الدليل يشرح كيفية تطبيق هذه المكونات على صفاحاتك.

## المكونات المتاحة

### 1. LineChart
**الاستخدام:** خط واحد بسيط
```tsx
<LineChart
  data={[{ date: new Date(), value: 100 }, ...]}
  height={360}
  color="#000000"
  strokeWidth={2}
  showGrid={true}
/>
```

### 2. AreaChart
**الاستخدام:** مخطط منطقة (Area) بلون واحد
```tsx
<AreaChart
  data={[{ date: new Date(), value: 100 }, ...]}
  height={360}
  color="#ff8c42"
  fillOpacity={0.6}
  showGrid={true}
/>
```

### 3. MultiLineChart
**الاستخدام:** خطوط متعددة على نفس المخطط
```tsx
<MultiLineChart
  data={[
    { date: new Date(), "Sales": 100, "MA30": 95, "MA7": 98 }
  ]}
  series={[
    { key: "Sales", color: "#000000", label: "Sales Volume" },
    { key: "MA30", color: "#6b7280", label: "30D Moving Average" },
    { key: "MA7", color: "#9ca3af", label: "7D Moving Average" }
  ]}
  height={360}
  showLegend={true}
  showGrid={true}
/>
```

### 4. StackedAreaChart
**الاستخدام:** مناطق متراكمة (Stacked Areas)
```tsx
<StackedAreaChart
  data={[
    { date: new Date(), "BTC": 50, "ETH": 30, "Others": 20 }
  ]}
  series={[
    { key: "BTC", color: "#ff8c42", label: "Bitcoin" },
    { key: "ETH", color: "#627eea", label: "Ethereum" },
    { key: "Others", color: "#6b7280", label: "Others" }
  ]}
  height={360}
  showLegend={true}
  showGrid={true}
/>
```

### 5. BarChart
**الاستخدام:** أعمدة رأسية أو أفقية
```tsx
<BarChart
  data={[
    { label: "Binance", value: 1000000 },
    { label: "Coinbase", value: 850000 }
  ]}
  height={360}
  color="#ff8c42"
  orientation="vertical"
  showGrid={true}
/>
```

## ألوان Glassnode (الألوان الموصى بها)

```tsx
// Primary Colors (Glassnode Style)
const GLASSNODE_COLORS = {
  black: "#000000",        // خط أساسي
  orange: "#ff8c42",       // منطقة/بيانات رئيسية
  blue: "#4a90e2",         // خط ثانوي
  green: "#22c55e",        // إيجابي
  red: "#ef4444",          // سلبي
  grayLight: "#9ca3af",    // خط مساعد
  grayMedium: "#6b7280",   // خط ثانوي
  grayDark: "#374151"      // نص
};
```

## خطوات الانتقال من ECharts إلى D3

### الخطوة 1: استيراد المكونات
```tsx
// استبدل هذا:
import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// بهذا:
import { MultiLineChart, AreaChart, BarChart, StackedAreaChart, LineChart } from "@/components/charts/d3";
```

### الخطوة 2: تحويل البيانات
بدلاً من تكوين ECharts `options`، قم بإنشاء مصفوفات بيانات بسيطة:

```tsx
// ECharts (قديم):
const option = {
  xAxis: { data: ["Jan", "Feb", "Mar"] },
  series: [{ data: [100, 200, 150] }]
};

// D3 (جديد):
const data = [
  { date: new Date("2024-01-01"), value: 100 },
  { date: new Date("2024-02-01"), value: 200 },
  { date: new Date("2024-03-01"), value: 150 }
];
```

### الخطوة 3: استبدال المكون
```tsx
// ECharts (قديم):
<ReactECharts option={option} style={{ height: "400px" }} />

// D3 (جديد):
<LineChart data={data} height={400} color="#000000" />
```

## مثال كامل: تحويل مخطط المبيعات

### قبل (ECharts)
```tsx
const salesOption = useMemo(() => ({
  xAxis: { type: "category", data: dates },
  yAxis: { type: "value" },
  series: [{
    name: "Sales",
    type: "line",
    data: [100, 200, 150, 300],
    itemStyle: { color: "#8b5cf6" }
  }]
}), [dates]);

return <ReactECharts option={salesOption} />;
```

### بعد (D3)
```tsx
const salesData = useMemo(() => 
  dates.map((date, i) => ({
    date: new Date(date),
    value: [100, 200, 150, 300][i]
  }))
, [dates]);

return <LineChart data={salesData} color="#000000" />;
```

## مثال متقدم: Multi-Line Chart

### قبل (ECharts)
```tsx
const option = {
  legend: { data: ["Sales", "MA30"] },
  series: [
    { name: "Sales", type: "line", data: salesData },
    { name: "MA30", type: "line", data: ma30Data }
  ]
};
```

### بعد (D3)
```tsx
const data = dates.map((date, i) => ({
  date: new Date(date),
  "Sales": salesData[i],
  "MA30": ma30Data[i]
}));

<MultiLineChart
  data={data}
  series={[
    { key: "Sales", color: "#000000", label: "Sales Volume" },
    { key: "MA30", color: "#6b7280", label: "30D Moving Average" }
  ]}
/>
```

## نصائح مهمة

1. **التواريخ:** استخدم دائمًا `new Date()` للتواريخ، وليس strings
2. **الأسماء:** تأكد من أن `key` في `series` يطابق اسم المفتاح في `data`
3. **الألوان:** استخدم ألوان Glassnode للحصول على مظهر احترافي
4. **الارتفاع:** حدد `height` بالبيكسل (رقم)، وليس string
5. **البيانات الفارغة:** المكونات تتعامل تلقائيًا مع البيانات الفارغة

## الصفحات التي تم تحويلها

- ✅ `/chat/polygon-nft` - مكتمل (نموذج)

## الصفحات المتبقية

يجب تحويل هذه الصفحات باتباع نفس النمط:

1. `/chat/polygon`
2. `/chat/polygon-pos-payments`
3. `/chat/polygon-stablecoin`
4. `/chat/polygon-data-catalog`
5. `/chat/pol-token`
6. `/chat/agora-pos`
7. `/chat/polymarket-markets`
8. `/chat/bitcoin-etf`
9. `/chat/ethereum-etf`

## استكشاف الأخطاء

### الخطأ: "Cannot read property 'map' of undefined"
**الحل:** تأكد من أن `data` ليس `null` أو `undefined`

### الخطأ: "Invalid Date"
**الحل:** تأكد من استخدام `new Date(dateString)` عند تحويل التواريخ

### الشارت لا يظهر
**الحل:** تحقق من:
- هل `data` يحتوي على عناصر؟
- هل `height` محدد؟
- هل `className` يحتوي على `w-full`؟

## مثال تطبيقي من polygon-nft

راجع الملف: `app/chat/polygon-nft/page.tsx` للحصول على مثال كامل ومفصل.

---

**تم إنشاؤه:** 2025
**آخر تحديث:** الآن
