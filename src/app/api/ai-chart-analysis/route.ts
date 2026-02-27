import { NextRequest, NextResponse } from 'next/server';

interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DrawingLine {
  type: 'trendline' | 'support' | 'resistance' | 'pattern';
  label: string;
  points: { time: number; price: number }[];
  color: string;
  style: 'solid' | 'dashed';
  description?: string;
}

interface AnalysisResult {
  drawings: DrawingLine[];
  summary: string;
  patterns: string[];
  trend: 'bullish' | 'bearish' | 'neutral';
  keyLevels: { type: string; price: number }[];
}

interface IndicatorsData {
  rsi: number | null;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  sma20: number;
  sma50: number;
  currentPrice: number;
  rsiSignal: string;
  macdSignal2: string;
  bbPosition: string;
  maTrend: string;
}

// Helper function to get pattern name in Arabic
function getPatternName(filter: string): string {
  const names: Record<string, string> = {
    triangles: 'المثلثات (Triangles)',
    channels: 'القنوات (Channels)',
    flags: 'الأعلام (Flags)',
    pennants: 'الرايات (Pennants)',
    wedges: 'الأوتاد (Wedges)',
    continuation_wedges: 'أوتاد الاستمرارية (Continuation Wedges)',
    reversal_wedges: 'أوتاد الانعكاس (Reversal Wedges)',
    broadening: 'التوسع (Broadening)',
    double_patterns: 'الأنماط المزدوجة (Double Top/Bottom)',
    head_shoulders: 'الرأس والكتفين (Head & Shoulders)',
    ranges: 'النطاقات (Ranges)',
    trendlines: 'خطوط الاتجاه (Trendlines)',
    levels: 'الدعم والمقاومة (Support/Resistance)',
    breakouts: 'الاختراقات (Breakouts)',
    liquidity: 'السيولة (Liquidity)',
    liquidity_pools: 'تجمعات السيولة (Liquidity Pools)',
    liquidity_sweeps: 'مسح السيولة (Liquidity Sweeps)',
    scalping: 'أنماط السكالبينج (Scalping Patterns)',
  };
  return names[filter] || filter;
}

// الـ Prompt المفصّل الموحد للتحليل الفني
function buildExpertPrompt(
  symbol: string, 
  timeframe: string, 
  candles: OHLCVCandle[], 
  swingPoints: { index: number; price: number; type: 'high' | 'low' }[],
  currentPrice: number,
  highestHigh: number,
  lowestLow: number,
  indicators?: IndicatorsData | null,
  patternFilter?: string
): string {
  // قسم المؤشرات الفنية
  const indicatorsSection = indicators ? `
═══════════════════════════════════════════════════════════════
📊 المؤشرات الفنية:
═══════════════════════════════════════════════════════════════
RSI(14): ${indicators.rsi?.toFixed(1) || 'N/A'} ${indicators.rsiSignal === 'overbought' ? '⚠️تشبع شرائي' : indicators.rsiSignal === 'oversold' ? '✅تشبع بيعي' : ''}
MACD: ${indicators.macd?.toFixed(2) || 'N/A'} | Signal: ${indicators.macdSignal?.toFixed(2) || 'N/A'} → ${indicators.macdSignal2 === 'bullish' ? '🟢' : '🔴'}
MA: SMA20=${indicators.sma20?.toFixed(0)} SMA50=${indicators.sma50?.toFixed(0)} → ${indicators.maTrend === 'bullish' ? '🟢صاعد' : '🔴هابط'}
BB: Upper=${indicators.bbUpper?.toFixed(0)} Lower=${indicators.bbLower?.toFixed(0)} → ${indicators.bbPosition === 'above' ? '⬆️فوق' : indicators.bbPosition === 'below' ? '⬇️تحت' : '↔️داخل'}
` : '';

  // Pattern focus section for targeted analysis
  const patternFocusSection = patternFilter && patternFilter !== 'all' ? `
═══════════════════════════════════════════════════════════════
🎯 مهمة محددة: ركز فقط على اكتشاف ${getPatternName(patternFilter)}
═══════════════════════════════════════════════════════════════
⚠️ مهم جداً:
- ابحث فقط عن نمط ${getPatternName(patternFilter)} في هذا الشارت
- لا ترسم أي نمط آخر غير ${getPatternName(patternFilter)}
- إذا لم تجد هذا النمط بوضوح، أرجع "drawings": [] فارغ
- ركز كل انتباهك وتحليلك على هذا النمط المحدد فقط
- تأكد من دقة الرسم وصحة النمط قبل إضافته

` : '';

  return `# 🎯 أنت خبير التحليل الفني الأول - خبرة 20+ سنة
${patternFocusSection}

═══════════════════════════════════════════════════════════════
📊 بيانات ${symbol} - ${timeframe}
═══════════════════════════════════════════════════════════════
السعر: ${currentPrice.toFixed(2)} | High: ${highestHigh.toFixed(2)} | Low: ${lowestLow.toFixed(2)} | شموع: ${candles.length}
${indicatorsSection}
📍 جميع نقاط Swing Points (استخدمها للرسم):
${swingPoints.map(s => `[${s.index}]${s.type === 'high' ? 'H' : 'L'}:${s.price.toFixed(2)}`).join(' ')}

📊 بيانات الشموع الكاملة [index]O:H:L:C:
${candles.map((c, i) => `[${i}]${c.open.toFixed(1)}:${c.high.toFixed(1)}:${c.low.toFixed(1)}:${c.close.toFixed(1)}`).join(' | ')}

═══════════════════════════════════════════════════════════════
📏 قواعد الرسم الإلزامية - يجب تطبيقها
═══════════════════════════════════════════════════════════════
⚠️ إلزامي: يجب رسم 8-20 خط على الأقل شامل:
  • 2-4 خطوط ترند (صاعدة/هابطة) من Swing Points
  • 2-4 مستويات دعم ومقاومة أفقية رئيسية
  • 2-6 أنماط فنية (مثلثات، أعلام، أوتاد، قمم/قيعان) إن وُجدت بوضوح
  • 2-4 مستويات ثانوية أو خطوط مساعدة

🎨 كيفية الرسم الصحيح:
  1. استخدم index من 0 إلى ${candles.length - 1}
  2. استخدم price من الشموع: high للقمم، low للقيعان
  3. خط الترند الصاعد: من swing low → swing low لاحق
  4. خط الترند الهابط: من swing high → swing high لاحق
  5. الدعم/المقاومة: خط أفقي عند مستوى ارتد منه السعر مرتين+

📝 مثال JSON للرسم:
{
  "type": "trendline",
  "label": "خط ترند صاعد رئيسي",
  "points": [
    {"index": 15, "price": 45230.50},
    {"index": 45, "price": 46890.20}
  ],
  "color": "#10b981",
  "style": "solid",
  "description": "يربط قاعين صاعدين - دعم قوي"
}

═══════════════════════════════════════════════════════════════
📐 دليل النماذج الفنية الشامل - ارسم ما تجده فقط
═══════════════════════════════════════════════════════════════

【1. الأوتاد WEDGES】 انعكاسية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ الوتد الصاعد (Rising Wedge) 🔴 انعكاسي هبوطي:
  - خطان صاعدان يتقاربان
  - القيعان ترتفع أسرع من القمم
  - زاوية الخط السفلي > زاوية العلوي
  - 3 لمسات على الأقل لكل خط
  - الحجم يتناقص ثم ينفجر عند الكسر
  - الكسر: لأسفل من الخط السفلي
  - الهدف: أوسع نقطة في الوتد من نقطة الكسر

▸ الوتد الهابط (Falling Wedge) 🟢 انعكاسي صعودي:
  - خطان هابطان يتقاربان
  - القمم تنخفض أسرع من القيعان
  - زاوية الخط العلوي > زاوية السفلي
  - 3 لمسات على الأقل لكل خط
  - الكسر: لأعلى من الخط العلوي
  - الهدف: أوسع نقطة في الوتد من نقطة الكسر

【2. المثلثات TRIANGLES】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ المثلث المتماثل (Symmetrical) - محايد:
  - خط علوي هابط (قمم أدنى)
  - خط سفلي صاعد (قيعان أعلى)
  - زوايا متقاربة (±10°)
  - يكسر في اتجاه الترند السابق (60-70%)
  - الهدف: ارتفاع القاعدة من نقطة الكسر

▸ المثلث الصاعد (Ascending) 🟢 صعودي 70%:
  - خط مقاومة أفقي (قمم متساوية ±1%)
  - خط دعم صاعد (قيعان أعلى)
  - 2-3 لمسات لكل خط
  - الكسر: لأعلى فوق المقاومة الأفقية
  - الهدف: ارتفاع المثلث من الكسر

▸ المثلث الهابط (Descending) 🔴 هبوطي 70%:
  - خط دعم أفقي (قيعان متساوية ±1%)
  - خط مقاومة هابط (قمم أدنى)
  - الكسر: لأسفل تحت الدعم الأفقي
  - الهدف: ارتفاع المثلث من الكسر

【3. الأعلام FLAGS】 استمرارية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ العلم الصاعد (Bull Flag) 🟢:
  - عمود: صعود قوي 30-50% بزاوية 60-85°
  - العلم: قناة موازية هابطة (خطان متوازيان)
  - التصحيح: 38-50% من العمود
  - المدة: 5-21 يوم
  - الحجم: ينخفض داخل العلم
  - الكسر: لأعلى من خط المقاومة
  - الهدف: طول العمود من نقطة الكسر

▸ العلم الهابط (Bear Flag) 🔴:
  - عمود: هبوط قوي 30-50%
  - العلم: قناة موازية صاعدة
  - الكسر: لأسفل من خط الدعم
  - الهدف: طول العمود من نقطة الكسر

【4. الرايات PENNANTS】 استمرارية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ الراية الصاعدة (Bullish Pennant) 🟢:
  - عمود صاعد قوي وسريع
  - مثلث متماثل صغير جداً (ليس قناة)
  - خطان يتقاربان (ليسا متوازيين)
  - أقصر وأسرع من العلم (5-15 يوم)
  - تصحيح 30-50% فقط
  - الكسر: عند 50-66% من طول الراية
  - الهدف: طول العمود من الكسر

▸ الراية الهابطة (Bearish Pennant) 🔴:
  - عمود هابط قوي
  - مثلث متماثل صغير
  - الكسر: لأسفل

【5. القنوات CHANNELS】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ القناة الصاعدة (Ascending Channel):
  - خطان متوازيان صاعدان
  - الخط السفلي: يربط القيعان
  - الخط العلوي: يربط القمم
  - التداول بين الخطين
  - كسر السفلي = انعكاس هبوطي

▸ القناة الهابطة (Descending Channel):
  - خطان متوازيان هابطان
  - كسر العلوي = انعكاس صعودي

【6. القمة/القاع المزدوج DOUBLE】 انعكاسية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ القمة المزدوجة (Double Top) 🔴 شكل M:
  - قمتان عند نفس المستوى (±3%)
  - فاصل زمني 2-6 أسابيع بينهما
  - خط الرقبة: يربط القاع بينهما (أفقي أو مائل)
  - الكسر: تحت خط الرقبة
  - الهدف: ارتفاع النموذج من خط الرقبة للأسفل
  - الحجم: القمة الثانية بحجم أقل = أقوى

▸ القاع المزدوج (Double Bottom) 🟢 شكل W:
  - قاعان عند نفس المستوى (±3%)
  - خط الرقبة: يربط القمة بينهما
  - الكسر: فوق خط الرقبة
  - الهدف: ارتفاع النموذج من خط الرقبة للأعلى

【7. الرأس والكتفين HEAD & SHOULDERS】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ الرأس والكتفين (H&S) 🔴:
  - 3 قمم: الوسطى (رأس) أعلى من الجانبيتين (كتفين)
  - الكتفان متقاربان في الارتفاع (±5%)
  - خط العنق: يربط القاعين بين الكتفين والرأس
  - ⚠️ خط العنق يربط القيعان وليس القمم!
  - الكسر: تحت خط العنق
  - الهدف: المسافة من الرأس لخط العنق

▸ الرأس والكتفين المقلوب (Inverse H&S) 🟢:
  - 3 قيعان: الوسطى أدنى
  - خط العنق: يربط القمتين
  - الكسر: فوق خط العنق

【8. الدعم والمقاومة】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ الدعم (Support):
  - مستوى ارتد منه السعر 2+ مرات صعوداً
  - خط أفقي عند قيعان متقاربة

▸ المقاومة (Resistance):
  - مستوى ارتد منه السعر 2+ مرات هبوطاً
  - خط أفقي عند قمم متقاربة

═══════════════════════════════════════════════════════════════
🎨 الألوان:
═══════════════════════════════════════════════════════════════
#10b981 أخضر = صعودي/دعم | #ef4444 أحمر = هبوطي/مقاومة | #f59e0b برتقالي = محايد | #8b5cf6 بنفسجي = أنماط

═══════════════════════════════════════════════════════════════
⚠️ تعليمات الرسم:
═══════════════════════════════════════════════════════════════
1. index: 0 إلى ${candles.length - 1}
2. price: استخدم high للقمم و low للقيعان
3. كل خط يحتاج نقطتين [{index, price}, {index, price}]
4. ارسم فقط الأنماط الواضحة والمؤكدة
5. خط الترند الصاعد: من قاع→قاع | الهابط: من قمة→قمة
6. خط العنق في H&S العادي يربط القيعان وليس القمم

═══════════════════════════════════════════════════════════════
📤 أعد JSON فقط:
═══════════════════════════════════════════════════════════════
{
  "drawings": [{"type": "trendline|support|resistance|pattern", "label": "الاسم", "points": [{"index": N, "price": P}, {"index": N2, "price": P2}], "color": "#hex", "style": "solid|dashed", "description": "السبب"}],
  "summary": "ملخص بالعربية",
  "patterns": ["الأنماط"],
  "trend": "bullish|bearish|neutral",
  "keyLevels": [{"type": "support|resistance", "price": N}]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, timeframe, ohlcv, apiKey, provider = 'deepseek', indicators, patternFilter = 'all' } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    if (!ohlcv || !Array.isArray(ohlcv) || ohlcv.length < 20) {
      return NextResponse.json({ error: 'Need at least 20 candles' }, { status: 400 });
    }

    const candles: OHLCVCandle[] = ohlcv.slice(-100);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = candles[candles.length - 1].close;
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);

    const swingPoints = findSwingPoints(candles);
    const prompt = buildExpertPrompt(symbol, timeframe, candles, swingPoints, currentPrice, highestHigh, lowestLow, indicators, patternFilter);

    let response: Response;
    let providerName: string;

    if (provider === 'gemini') {
      // Gemini API via CometAPI (Gemini 3 Pro Preview)
      providerName = 'Gemini 3 Pro';
      response = await fetch('https://api.cometapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-3-pro-preview',
          messages: [
            { role: 'system', content: 'أنت محلل فني خبير محترف في قراءة الشارت ورسم الأنماط. أعد JSON صالح فقط بدون markdown أو كود.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });
    } else if (provider === 'claude') {
      // Claude API via CometAPI (Claude Opus 4.6)
      providerName = 'Claude Opus 4.6';
      response = await fetch('https://api.cometapi.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 4000,
          messages: [
            { 
              role: 'user', 
              content: `أنت محلل فني خبير محترف في قراءة الشارت ورسم الأنماط. أعد JSON صالح فقط بدون markdown أو كود.\n\n${prompt}` 
            }
          ],
        }),
      });
    } else if (provider === 'openai') {
      // OpenAI API (GPT-5.2)
      providerName = 'GPT-5.2';
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'أنت محلل فني خبير محترف في قراءة الشارت ورسم الأنماط. أعد JSON صالح فقط بدون markdown أو كود.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        }),
      });
    } else if (provider === 'groq') {
      // Groq API (Llama 3.3 70B)
      providerName = 'Groq';
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'أنت محلل فني خبير. أعد JSON صالح فقط بدون markdown أو كود.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        }),
      });
    } else {
      // DeepSeek API
      providerName = 'DeepSeek';
      response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'أنت محلل فني خبير. أعد JSON صالح فقط بدون markdown.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        }),
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(`${providerName} error:`, err);
      return NextResponse.json(
        { error: `${providerName}: ${response.status}`, details: err },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract content based on provider
    let content: string;
    if (provider === 'claude') {
      // Claude returns content in a different format
      content = data.content?.[0]?.text || '';
    } else {
      // OpenAI/Groq/DeepSeek format
      content = data.choices?.[0]?.message?.content || '';
    }

    let analysis: AnalysisResult;
    try {
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(clean);
    } catch (parseError) {
      console.error('Parse error:', content);
      return NextResponse.json({ error: 'Parse failed', raw: content }, { status: 500 });
    }

    // Convert index → time
    const drawings: DrawingLine[] = (analysis.drawings || []).map(d => ({
      ...d,
      points: (d.points || []).map((p: { index?: number; price: number }) => {
        const idx = Math.min(Math.max(0, p.index ?? 0), candles.length - 1);
        return { time: candles[idx]?.time || 0, price: p.price };
      })
    }));

    return NextResponse.json({
      success: true,
      provider: providerName,
      symbol,
      timeframe,
      analysis: { ...analysis, drawings },
      meta: {
        candleCount: candles.length,
        priceRange: { high: highestHigh, low: lowestLow },
        swingPoints: swingPoints.length,
      }
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function findSwingPoints(candles: OHLCVCandle[], lookback = 4): { index: number; price: number; type: 'high' | 'low' }[] {
  const swings: { index: number; price: number; type: 'high' | 'low' }[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const curr = candles[i];
    let isHigh = true;
    let isLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= curr.high || candles[i + j].high >= curr.high) isHigh = false;
      if (candles[i - j].low <= curr.low || candles[i + j].low <= curr.low) isLow = false;
    }
    
    if (isHigh) swings.push({ index: i, price: curr.high, type: 'high' });
    if (isLow) swings.push({ index: i, price: curr.low, type: 'low' });
  }
  
  return swings;
}
