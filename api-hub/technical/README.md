# 📊 NEXUS Technical Analysis API

نظام تحليل فني متقدم للعملات الرقمية مبني بـ Python + pandas-ta + FastAPI

## 🚀 التثبيت السريع

```bash
# 1. انتقل للمجلد
cd nexus-webapp/python_analysis

# 2. إنشاء بيئة افتراضية
python -m venv venv

# 3. تفعيل البيئة
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. تثبيت المتطلبات
pip install -r requirements.txt

# 5. تشغيل الخادم
python run_server.py
```

## 📁 هيكل الملفات

```
python_analysis/
├── __init__.py          # Package initialization
├── config.py            # Configuration classes
├── indicators.py        # Technical indicators (SMA, EMA, RSI, MACD, etc.)
├── patterns.py          # Chart pattern detection
├── trendlines.py        # Trendlines, S/R, Fibonacci
├── api.py               # FastAPI endpoints
├── run_server.py        # Server runner
├── requirements.txt     # Python dependencies
└── README.md            # Documentation
```

## 📈 المؤشرات المتاحة

### Overlay Indicators (على الشارت الرئيسي)

| المؤشر | الوصف | المعاملات الافتراضية |
|--------|-------|---------------------|
| **Supertrend** | مؤشر الاتجاه الفائق | length=10, multiplier=3.0 |
| **Bollinger Bands** | نطاقات بولينجر | length=20, std=2.0 |
| **SMA 10/25/50/100/200** | المتوسط المتحرك البسيط | - |
| **EMA 10/25/50/100/200** | المتوسط المتحرك الأسي | - |

### Panel Indicators (أسفل الشارت)

| المؤشر | الوصف | المعاملات الافتراضية |
|--------|-------|---------------------|
| **RSI** | مؤشر القوة النسبية | length=14 |
| **Stochastic RSI** | ستوكاستيك RSI | length=14, k=3, d=3 |
| **MACD** | ماكد | fast=12, slow=26, signal=9 |
| **ADX** | مؤشر متوسط الحركة الاتجاهية | length=14 |
| **OBV** | حجم التوازن | - |

## 📊 الأنماط المكتشفة

### 🟢 Bullish Patterns (صعودية)

- **Ascending Channel** - قناة صاعدة
- **Ascending Triangle** - مثلث صاعد
- **Bull Flag** - علم صعودي
- **Bull Pennant** - راية صعودية
- **Continuation Falling Wedge** - وتد هابط استمراري
- **Descending Broadening Wedge** - وتد متسع هابط
- **Reversal Falling Wedge** - وتد هابط انعكاسي

### 🔴 Bearish Patterns (هبوطية)

- **Ascending Broadening Wedge** - وتد متسع صاعد
- **Bear Flag** - علم هبوطي
- **Bear Pennant** - راية هبوطية
- **Continuation Rising Wedge** - وتد صاعد استمراري
- **Descending Channel** - قناة هابطة
- **Descending Triangle** - مثلث هابط
- **Reversal Rising Wedge** - وتد صاعد انعكاسي

### ⚪ Neutral Patterns (محايدة)

- **Symmetrical Triangle** - مثلث متماثل

## 📐 خطوط الاتجاه والمستويات

- **Auto Trendlines** - خطوط اتجاه تلقائية
- **Horizontal S/R Levels** - مستويات الدعم والمقاومة الأفقية
- **Fibonacci Retracements** - تصحيحات فيبوناتشي
- **Vertical Resistance/Support** - مستويات عمودية

## 🔌 API Endpoints

### POST `/analyze`
تحليل شامل مع كل المؤشرات والأنماط

```json
{
  "ohlcv": {
    "timestamp": [1699000000000, ...],
    "open": [42000.0, ...],
    "high": [42500.0, ...],
    "low": [41800.0, ...],
    "close": [42200.0, ...],
    "volume": [1000.0, ...]
  },
  "indicators": {
    "supertrend": true,
    "ema50": true,
    "rsi": true
  },
  "patterns": {
    "bull_flag": true,
    "ascending_triangle": true
  },
  "trendlines": {
    "trendlines": true,
    "fibonacci_retracements": true
  }
}
```

### GET `/live/{exchange}/{symbol}/{timeframe}`
تحليل مباشر من المنصة

```
GET /live/binance/BTCUSDT/1h?limit=200
```

## 💡 الاستخدام من Next.js

```typescript
// src/lib/analysis-api.ts

const API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function analyzeChart(
  ohlcv: OHLCVData,
  config: AnalysisConfig
) {
  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ohlcv,
      indicators: config.indicators,
      patterns: config.patterns,
      trendlines: config.trendlines
    })
  });
  
  return response.json();
}
```

## 🛠️ التخصيص

### إضافة مؤشر جديد

1. أضف الدالة في `indicators.py`:

```python
def calculate_my_indicator(df: pd.DataFrame, length: int = 14) -> IndicatorResult:
    # حساب المؤشر
    values = df['close'].rolling(length).mean()
    
    return IndicatorResult(
        name="My Indicator",
        values=pd.DataFrame({'value': values}),
        signals=[],
        metadata={'length': length}
    )
```

2. أضفه في `calculate_all_indicators()`:

```python
if config.get('my_indicator'):
    results['my_indicator'] = calculate_my_indicator(df)
```

### إضافة نمط جديد

1. أضف الدالة في `patterns.py`:

```python
def detect_my_pattern(df: pd.DataFrame) -> List[PatternResult]:
    patterns = []
    # منطق الكشف
    return patterns
```

2. أضفه في `detect_all_patterns()`:

```python
if config.get('my_pattern'):
    results['bullish'].extend(detect_my_pattern(df))
```

## 📦 المكتبات المستخدمة

- **pandas-ta** - مكتبة المؤشرات الفنية الرئيسية
- **scipy** - للحسابات العلمية (trendlines, clustering)
- **FastAPI** - إطار الـ API
- **ccxt** - جلب البيانات المباشرة (اختياري)
- **plotly** - الرسوم البيانية (اختياري)

## 🔒 ملاحظات الإنتاج

1. **CORS**: عدّل `allow_origins` في `api.py` للإنتاج
2. **Rate Limiting**: أضف middleware للحماية
3. **Caching**: استخدم Redis للـ caching
4. **Logging**: فعّل الـ logging للمراقبة

## 📄 الترخيص

MIT License - NEXUS Trading Platform
