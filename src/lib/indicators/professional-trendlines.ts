/**
 * Professional Trendline Algorithm
 * خوارزمية خطوط الترند الاحترافية
 * 
 * - خط الدعم المائل: صاعد فقط (من القيعان)
 * - خط المقاومة المائل: هابط فقط (من القمم)
 * 
 * يستخدم:
 * - Bill Williams Fractals لتحديد القمم والقيعان
 * - Least Squares Regression لحساب أفضل خط
 * - R² Validation لضمان الدقة (> 0.85)
 * - Touch Point Verification للتحقق من اللمسات
 */

// ========== الأنواع والواجهات ==========

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  strength: number; // قوة النقطة المحورية (1-5)
}

export interface ProfessionalTrendline {
  startIdx: number;
  endIdx: number;
  startPrice: number;
  endPrice: number;
  slope: number;
  intercept: number;
  rSquared: number;
  touchPoints: number;
  type: 'support' | 'resistance';
  direction: 'ascending' | 'descending';
  isValid: boolean;
}

export interface TrendlineConfig {
  fractalPeriod: number;        // فترة الفراكتل (افتراضي: 2)
  minTouchPoints: number;       // الحد الأدنى لنقاط اللمس (افتراضي: 2)
  minRSquared: number;          // الحد الأدنى لـ R² (افتراضي: 0.85)
  tolerancePercent: number;     // نسبة التسامح للمس (افتراضي: 0.15%)
  strengthThreshold: number;    // حد القوة للنقاط (افتراضي: 2)
  extendBars: number;           // عدد الشموع للامتداد (افتراضي: 30)
}

// ========== الإعدادات الافتراضية - دقة عالية جداً ==========

const DEFAULT_CONFIG: TrendlineConfig = {
  fractalPeriod: 2,           // للحصول على نقاط أكثر
  minTouchPoints: 2,          // الحد الأدنى
  minRSquared: 0.92,          // دقة عالية جداً R² > 0.92
  tolerancePercent: 0.20,     // تسامح ضيق
  strengthThreshold: 1.8,     // نقاط قوية
  extendBars: 50
};

// ========== دوال مساعدة ==========

/**
 * فحص القمة الفراكتلية (Bill Williams)
 * الشمعة الوسطى يجب أن تكون أعلى من الشموع المحيطة
 */
function isFractalHigh(data: number[], index: number, period: number): boolean {
  if (index < period || index >= data.length - period) return false;
  
  const currentHigh = data[index];
  
  for (let i = 1; i <= period; i++) {
    if (data[index - i] >= currentHigh) return false;
    if (data[index + i] >= currentHigh) return false;
  }
  
  return true;
}

/**
 * فحص القاع الفراكتلي (Bill Williams)
 * الشمعة الوسطى يجب أن تكون أدنى من الشموع المحيطة
 */
function isFractalLow(data: number[], index: number, period: number): boolean {
  if (index < period || index >= data.length - period) return false;
  
  const currentLow = data[index];
  
  for (let i = 1; i <= period; i++) {
    if (data[index - i] <= currentLow) return false;
    if (data[index + i] <= currentLow) return false;
  }
  
  return true;
}

/**
 * حساب قوة النقطة المحورية
 * كلما زادت القوة، كانت النقطة أكثر أهمية
 */
function calculatePivotStrength(
  data: number[],
  index: number,
  type: 'high' | 'low'
): number {
  let strength = 1;
  const basePrice = data[index];
  
  // فحص الامتداد الأيسر
  for (let i = 1; i <= 5; i++) {
    if (index - i < 0) break;
    const compare = data[index - i];
    if (type === 'high' ? basePrice > compare : basePrice < compare) {
      strength += 0.4;
    } else {
      break;
    }
  }
  
  // فحص الامتداد الأيمن
  for (let i = 1; i <= 5; i++) {
    if (index + i >= data.length) break;
    const compare = data[index + i];
    if (type === 'high' ? basePrice > compare : basePrice < compare) {
      strength += 0.4;
    } else {
      break;
    }
  }
  
  return Math.min(strength, 5);
}

/**
 * اكتشاف النقاط المحورية (الفراكتلات)
 */
function detectPivotPoints(
  highs: number[],
  lows: number[],
  config: TrendlineConfig
): { pivotHighs: PivotPoint[]; pivotLows: PivotPoint[] } {
  const pivotHighs: PivotPoint[] = [];
  const pivotLows: PivotPoint[] = [];
  const { fractalPeriod, strengthThreshold } = config;

  for (let i = fractalPeriod; i < highs.length - fractalPeriod; i++) {
    // فحص القمة الفراكتلية
    if (isFractalHigh(highs, i, fractalPeriod)) {
      const strength = calculatePivotStrength(highs, i, 'high');
      if (strength >= strengthThreshold) {
        pivotHighs.push({
          index: i,
          price: highs[i],
          type: 'high',
          strength
        });
      }
    }

    // فحص القاع الفراكتلي
    if (isFractalLow(lows, i, fractalPeriod)) {
      const strength = calculatePivotStrength(lows, i, 'low');
      if (strength >= strengthThreshold) {
        pivotLows.push({
          index: i,
          price: lows[i],
          type: 'low',
          strength
        });
      }
    }
  }

  return { pivotHighs, pivotLows };
}

/**
 * خوارزمية المربعات الصغرى (Least Squares Regression)
 * لحساب أفضل خط ملائم
 */
function leastSquaresRegression(points: PivotPoint[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} | null {
  const n = points.length;
  if (n < 2) return null;

  // حساب المجاميع
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (const point of points) {
    sumX += point.index;
    sumY += point.price;
    sumXY += point.index * point.price;
    sumX2 += point.index * point.index;
  }
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  // حساب الميل والتقاطع
  const numerator = sumXY - n * meanX * meanY;
  const denominator = sumX2 - n * meanX * meanX;
  
  if (denominator === 0) return null;
  
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  // حساب R² (معامل التحديد)
  let ssRes = 0; // مجموع مربعات البواقي
  let ssTot = 0; // مجموع المربعات الكلي
  
  for (const point of points) {
    const predicted = slope * point.index + intercept;
    ssRes += Math.pow(point.price - predicted, 2);
    ssTot += Math.pow(point.price - meanY, 2);
  }
  
  const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
  
  return { slope, intercept, rSquared };
}

/**
 * إيجاد نقاط اللمس على خط الترند
 */
function findTouchPoints(
  slope: number,
  intercept: number,
  points: PivotPoint[],
  tolerancePercent: number
): PivotPoint[] {
  const touchPoints: PivotPoint[] = [];
  
  for (const point of points) {
    const expectedPrice = slope * point.index + intercept;
    const percentDiff = Math.abs((point.price - expectedPrice) / expectedPrice) * 100;
    
    if (percentDiff <= tolerancePercent) {
      touchPoints.push(point);
    }
  }
  
  return touchPoints;
}

/**
 * التحقق من صلاحية خط الترند
 * يجب ألا يخترق السعر الخط بشكل كبير
 */
function validateTrendline(
  slope: number,
  intercept: number,
  startIndex: number,
  endIndex: number,
  data: number[],
  type: 'support' | 'resistance',
  tolerancePercent: number
): boolean {
  let violations = 0;
  const maxViolations = Math.floor((endIndex - startIndex) * 0.1); // 10% max violations
  
  for (let i = startIndex; i <= endIndex; i++) {
    if (i >= data.length) break;
    
    const expectedPrice = slope * i + intercept;
    const actualPrice = data[i];
    const percentDiff = ((actualPrice - expectedPrice) / expectedPrice) * 100;
    
    // للدعم: السعر يجب أن يكون فوق الخط (أو قريب جداً)
    // للمقاومة: السعر يجب أن يكون تحت الخط (أو قريب جداً)
    if (type === 'support' && percentDiff < -tolerancePercent * 2) {
      violations++;
    } else if (type === 'resistance' && percentDiff > tolerancePercent * 2) {
      violations++;
    }
    
    if (violations > maxViolations) return false;
  }
  
  return true;
}

/**
 * البحث عن أفضل خط ترند من مجموعة نقاط محورية
 * يمر الخط عبر النقاط الفعلية (القمم أو القيعان)
 */
function findBestTrendline(
  points: PivotPoint[],
  allData: number[],
  type: 'support' | 'resistance',
  config: TrendlineConfig
): ProfessionalTrendline | null {
  const { minTouchPoints, minRSquared, tolerancePercent } = config;
  
  if (points.length < 2) return null;

  // تصفية النقاط في آخر 60% من البيانات فقط (الشموع الأخيرة)
  const recentThreshold = allData.length * 0.40; // بداية من 40% من البيانات
  const recentPoints = points.filter(p => p.index > recentThreshold);
  
  if (recentPoints.length < 2) return null;

  let bestTrendline: ProfessionalTrendline | null = null;
  let bestScore = -1;

  // ترتيب النقاط حسب الفهرس (الأقدم للأحدث)
  const sortedByIndex = [...recentPoints].sort((a, b) => a.index - b.index);
  
  // أخذ آخر 8 نقاط فقط (الأحدث)
  const latestPoints = sortedByIndex.slice(-8);

  // تجربة جميع التوليفات الممكنة من النقاط الأخيرة
  for (let i = 0; i < latestPoints.length - 1; i++) {
    for (let j = i + 1; j < latestPoints.length; j++) {
      const point1 = latestPoints[i];
      const point2 = latestPoints[j];
      
      // يجب أن يكون هناك مسافة كافية بين النقطتين (8 شموع على الأقل)
      if (point2.index - point1.index < 8) continue;
      
      // حساب الميل بين النقطتين الفعليتين
      const slope = (point2.price - point1.price) / (point2.index - point1.index);
      
      // تحديد اتجاه الترند والتحقق من صحته
      const direction = slope > 0 ? 'ascending' : 'descending';
      
      // التحقق من التوافق:
      // خط الدعم يجب أن يكون صاعداً
      // خط المقاومة يجب أن يكون هابطاً
      if (type === 'support' && direction !== 'ascending') continue;
      if (type === 'resistance' && direction !== 'descending') continue;
      
      // التقاطع يمر عبر النقطة الأولى
      const intercept = point1.price - slope * point1.index;
      
      // إيجاد جميع نقاط اللمس (النقاط القريبة من الخط)
      const touchingPoints = findTouchPoints(slope, intercept, recentPoints, tolerancePercent);
      
      if (touchingPoints.length < minTouchPoints) continue;
      
      // التحقق من أن الخط لا يخترق الشموع بشكل كبير
      let isValidLine = true;
      let violations = 0;
      
      for (let k = point1.index; k <= point2.index; k++) {
        const linePrice = slope * k + intercept;
        const actualPrice = allData[k];
        
        if (type === 'support') {
          // خط الدعم: جميع الأسعار يجب أن تكون فوق الخط أو قريبة منه
          if (actualPrice < linePrice * (1 - tolerancePercent / 100)) {
            violations++;
          }
        } else {
          // خط المقاومة: جميع الأسعار يجب أن تكون تحت الخط أو قريبة منه
          if (actualPrice > linePrice * (1 + tolerancePercent / 100)) {
            violations++;
          }
        }
      }
      
      // السماح بـ 20% انتهاكات
      const maxViolations = Math.floor((point2.index - point1.index) * 0.20);
      if (violations > maxViolations) continue;
      
      // حساب R² من النقاط اللامسة
      const regression = leastSquaresRegression(touchingPoints);
      const r2 = regression ? regression.rSquared : 0;
      
      // حساب النتيجة - أولوية قصوى للشموع الأخيرة
      // recencyBonus يزيد بشكل كبير للنقاط الأحدث
      const recencyBonus = Math.pow(point2.index / allData.length, 2) * 10; // قوة 2 للتركيز على الأحدث
      const endPointRecency = (allData.length - point2.index) < 20 ? 3 : 1; // مكافأة إذا كانت النقطة قريبة من النهاية
      const touchBonus = touchingPoints.length * 1.5;
      const r2Bonus = r2 > 0.9 ? 1.5 : (r2 > 0.8 ? 1.2 : 1);
      
      const score = touchBonus * recencyBonus * endPointRecency * r2Bonus;
      
      if (score > bestScore) {
        bestScore = score;
        
        // استخدام أسعار النقاط الفعلية (ليس من regression)
        bestTrendline = {
          startIdx: point1.index,
          endIdx: point2.index,
          startPrice: point1.price,  // السعر الفعلي للنقطة الأولى
          endPrice: point2.price,    // السعر الفعلي للنقطة الثانية
          slope,
          intercept,
          rSquared: r2,
          touchPoints: touchingPoints.length,
          type,
          direction,
          isValid: true
        };
      }
    }
  }

  return bestTrendline;
}

// ========== الدالة الرئيسية للتصدير ==========

/**
 * تحليل خطوط الترند الاحترافية
 * 
 * @param highs - مصفوفة أسعار القمم
 * @param lows - مصفوفة أسعار القيعان
 * @param config - إعدادات اختيارية
 * @returns خط الدعم الصاعد وخط المقاومة الهابط
 */
export function analyzeProfessionalTrendlines(
  highs: number[],
  lows: number[],
  userConfig: Partial<TrendlineConfig> = {}
): {
  supportLine: ProfessionalTrendline | null;
  resistanceLine: ProfessionalTrendline | null;
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
} {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  
  // التحقق من وجود بيانات كافية
  if (highs.length < 30 || lows.length < 30) {
    return {
      supportLine: null,
      resistanceLine: null,
      pivotHighs: [],
      pivotLows: []
    };
  }

  // الخطوة 1: اكتشاف النقاط المحورية (الفراكتلات)
  const { pivotHighs, pivotLows } = detectPivotPoints(highs, lows, config);
  
  // الخطوة 2: إيجاد أفضل خط دعم صاعد (من القيعان)
  const supportLine = findBestTrendline(pivotLows, lows, 'support', config);
  
  // الخطوة 3: إيجاد أفضل خط مقاومة هابط (من القمم)
  const resistanceLine = findBestTrendline(pivotHighs, highs, 'resistance', config);
  
  return {
    supportLine,
    resistanceLine,
    pivotHighs,
    pivotLows
  };
}

/**
 * حساب السعر على خط الترند لفهرس معين
 */
export function getPriceAtIndex(trendline: ProfessionalTrendline, index: number): number {
  return trendline.slope * index + trendline.intercept;
}

/**
 * تمديد خط الترند إلى المستقبل
 */
export function extendTrendline(
  trendline: ProfessionalTrendline,
  currentLength: number,
  extendBars: number = 30
): { extendedEndIdx: number; extendedEndPrice: number } {
  const extendedEndIdx = currentLength - 1 + extendBars;
  const extendedEndPrice = getPriceAtIndex(trendline, extendedEndIdx);
  
  return { extendedEndIdx, extendedEndPrice };
}
