# Pattern Registry Implementation

**Status**: ✅ Complete  
**Date**: 2024  
**Target**: `/app/patterns` page at http://localhost:3000/app/patterns

---

## 🎯 Overview

Built comprehensive pattern registry system with 27 technical analysis patterns organized into 12 categories. System enables:

- **One file per pattern** for easy maintenance and extension
- **Python → TypeScript mapping** for reliable API response resolution
- **Pro/Free tier gating** with Locked display for Free users
- **Historical pattern display** with 500-candle lookback (increased from 200)
- **Draft/Applied state** for filter selections (apply only on Scan button press)

---

## 📁 File Structure Created

```
src/lib/indicators/patterns/
├── common/
│   ├── types.ts           # Core type definitions
│   └── mapping.ts         # Python ↔ PatternId bidirectional mapping
├── registry.ts            # Central export + helper functions
├── triangles/             # 4 patterns
│   ├── ascending-triangle.ts
│   ├── descending-triangle.ts
│   ├── symmetrical-triangle.ts
│   └── expanding-triangle.ts
├── channels/              # 3 patterns
│   ├── ascending-channel.ts
│   ├── descending-channel.ts
│   └── horizontal-channel.ts
├── flags/                 # 2 patterns
│   ├── bull-flag.ts
│   └── bear-flag.ts
├── wedges/                # 2 patterns
│   ├── rising-wedge.ts
│   └── falling-wedge.ts
├── double-patterns/       # 2 patterns
│   ├── double-top.ts
│   └── double-bottom.ts
├── head-shoulders/        # 2 patterns
│   ├── head-and-shoulders.ts
│   └── inverse-head-and-shoulders.ts
├── ranges/                # 1 pattern
│   └── trading-range.ts
├── trendlines/            # 2 patterns
│   ├── support-trendline.ts
│   └── resistance-trendline.ts
├── levels/                # 2 patterns
│   ├── support-level.ts
│   └── resistance-level.ts
├── breakouts/             # 2 patterns (Pro)
│   ├── bullish-breakout.ts
│   └── bearish-breakout.ts
├── liquidity/             # 3 patterns (Pro)
│   ├── liquidity-pool-above.ts
│   ├── liquidity-pool-below.ts
│   └── liquidity-sweep-bullish.ts
└── scalping/              # 4 patterns (Pro)
    ├── bullish-momentum.ts
    ├── bearish-momentum.ts
    ├── hammer.ts
    └── shooting-star.ts
```

**Total**: 27 patterns across 12 categories

---

## 🔑 Key Design Decisions

### Pattern Organization

- **Pattern ID format**: `"category/slug"` (e.g., `"triangles/ascending-triangle"`)
- **Category naming**: kebab-case for TypeScript, snake_case for Python (mapped automatically)
- **Pro-only categories**: `breakouts`, `liquidity`, `scalping`
- **Free categories**: All others (triangles, channels, flags, wedges, double-patterns, head-shoulders, ranges, trendlines, levels)

### Pattern Definition Structure

```typescript
const ascendingTriangle: PatternDefinition = {
  id: 'triangles/ascending-triangle',       // Unique identifier
  title: 'Ascending Triangle',              // Display name
  category: 'triangles',                    // Category group
  family: 'chart',                          // Pattern family (chart, level, trend, liquidity, momentum, structure)
  pythonNames: ['Ascending Triangle'],      // Mapping to Python detector output
  pythonCategories: ['triangles'],          // Python category names
  proOnly: false,                           // Pro gating flag
  defaultEnabled: true,                     // Default visibility
  tags: ['continuation', 'triangle'],       // Search/filter tags
};
```

### Pro Tier Gating

**Strategy**: "Locked Display" (show card but disable interaction for Free users)

**Implementation**:
- Free users see Pro pattern cards with Lock icon overlay
- "Upgrade to Pro" CTA displayed
- Card opacity reduced (60%) for visual distinction
- All interactions disabled until upgrade

**Pro-only patterns** (9 total):
- Breakouts: bullish-breakout, bearish-breakout
- Liquidity: liquidity-pool-above, liquidity-pool-below, liquidity-sweep-bullish
- Scalping: bullish-momentum, bearish-momentum, hammer, shooting-star

### Historical Display First

**Lookback**: Increased from 200 → **500 candles** for better historical pattern visibility

**Workflow**:
1. User loads page → sees all patterns on 500-candle historical chart
2. User adjusts filters in Draft state (UI controls)
3. User presses "Scan Patterns" → filters apply (Applied state)
4. Results update based on Applied config snapshot

**No auto-filtering**: Filter changes don't immediately update results (prevents confusion during exploration)

---

## 📝 Files Modified

### 1. PatternFilters.tsx

**Changes**:
- ✅ Replaced 68+ hardcoded categories with registry-derived 12 categories
- ✅ Added Pro lock emoji (🔒) to Pro-only categories
- ✅ Wired to Draft state (filters don't apply until Scan pressed)

**Before**: Hardcoded array of 100+ pattern types  
**After**: Dynamic categories from `getCategories()` registry function

```typescript
// New implementation
import { getCategories } from '../../lib/indicators/patterns/registry';
const CATEGORY_META = getCategories();
const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  ...CATEGORY_META.map(cat => ({
    value: cat.id,
    label: `${cat.label}${cat.proOnly ? ' 🔒' : ''}`,
  }))
];
```

### 2. PatternScanner.tsx

**Changes**:
- ✅ Separated Draft state (user selections) from Applied state (active filters)
- ✅ Increased OHLCV fetch limit: `200` → `500`
- ✅ Removed auto-filtering on config change
- ✅ Filters apply only when Scan button pressed

**Before**: Live filtering (config change → immediate result update)  
**After**: Draft/Applied pattern (config changes are "staged" until Scan)

```typescript
// State structure
const [draftConfig, setDraftConfig] = useState<ScannerConfig>({ ... }); // User editing
const [appliedConfig, setAppliedConfig] = useState<ScannerConfig>(draftConfig); // Active filters

// On Scan button press
const scanPatterns = async () => {
  setAppliedConfig(draftConfig); // Snapshot current selections
  // ... fetch and filter with draftConfig
};
```

### 3. PatternCard.tsx

**Changes**:
- ✅ Added Pro gating logic with pattern registry lookup
- ✅ Added Lock overlay for Pro patterns when user is Free tier
- ✅ Added `userTier` prop (defaults to 'free')
- ✅ Resolved pattern definition from Python name

**Implementation**:
```typescript
// Resolve pattern from registry
const patternDef = useMemo(() => resolvePatternFromPython(pattern.name), [pattern.name]);
const isProOnly = patternDef?.proOnly || false;
const isLocked = isProOnly && userTier === 'free';

// Lock overlay (renders when isLocked === true)
{isLocked && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
    <Lock className="w-12 h-12 text-yellow-500" />
    <p className="text-lg font-bold">Pro Feature</p>
    <button>Upgrade to Pro</button>
  </div>
)}
```

---

## 🔧 Registry API

### Core Functions

```typescript
// Get all patterns
const allPatterns = getPatterns(); // PatternDefinition[]

// Get categories with metadata
const categories = getCategories(); // PatternCategoryMeta[]

// Lookup pattern by ID
const pattern = getPatternById('triangles/ascending-triangle'); // PatternDefinition | undefined

// Get patterns in category
const trianglePatterns = getPatternsByCategory('triangles'); // PatternDefinition[]

// Resolve Python API response
const pattern = resolvePatternFromPython('Ascending Triangle'); // PatternDefinition | undefined

// Filter by tier
const freePatterns = getFreePatterns(); // PatternDefinition[]
const proPatterns = getProPatterns(); // PatternDefinition[]

// Check category tier
const isPro = isCategoryPro('liquidity'); // boolean
```

### Type Definitions

```typescript
export type PatternCategoryId = 
  | 'triangles' | 'channels' | 'flags' | 'wedges'
  | 'double-patterns' | 'head-shoulders' | 'ranges'
  | 'trendlines' | 'levels' | 'breakouts' 
  | 'liquidity' | 'scalping';

export type PatternFamily = 
  | 'chart' | 'level' | 'trend' 
  | 'liquidity' | 'momentum' | 'structure';

export interface PatternDefinition {
  id: string;                    // "category/slug"
  title: string;                 // "Ascending Triangle"
  category: PatternCategoryId;   // "triangles"
  family: PatternFamily;         // "chart"
  pythonNames: string[];         // ["Ascending Triangle"]
  pythonCategories: string[];    // ["triangles"]
  proOnly: boolean;              // false
  defaultEnabled: boolean;       // true
  tags?: string[];               // ["continuation", "triangle"]
}

export interface PatternCategoryMeta {
  id: PatternCategoryId;
  label: string;              // "Triangles"
  description: string;        // "Triangle chart patterns (ascending, descending, symmetrical)"
  proOnly: boolean;           // false
  icon?: string;              // Optional icon
}
```

---

## 🗺️ Python ↔ TypeScript Mapping

### Mapping Table (common/mapping.ts)

**Handles**:
- Case variations (Python detector names → stable PatternIds)
- Category name conventions (snake_case → kebab-case)
- Bidirectional lookup (name → id, id → name)

**Example mappings**:
```typescript
pythonNameToId = {
  'Ascending Triangle': 'triangles/ascending-triangle',
  'Double Top': 'double-patterns/double-top',
  'Liquidity Pool (Above)': 'liquidity/liquidity-pool-above',
  // ... 27 total
};

pythonCategoryToId = {
  'triangles': 'triangles',
  'double_patterns': 'double-patterns',  // snake_case → kebab-case
  'head_shoulders': 'head-shoulders',
  // ... 12 total
};
```

**Usage in scanner**:
```typescript
// Python API returns: { name: "Ascending Triangle", category: "triangles" }
const patternDef = resolvePatternFromPython(pythonResponse.name);
// Returns: { id: "triangles/ascending-triangle", title: "Ascending Triangle", ... }
```

---

## ✅ Implementation Status

### Completed

- ✅ 27 pattern definition files created
- ✅ Registry with all helper functions
- ✅ Bidirectional Python ↔ PatternId mapping
- ✅ 12 category metadata definitions
- ✅ PatternFilters updated to use registry categories
- ✅ PatternScanner Draft/Applied state implemented
- ✅ Lookback increased to 500 candles
- ✅ PatternCard Pro gating with Lock overlay
- ✅ All files compile without errors

### Testing Required

- ⏳ Test pattern scanner with registry at http://localhost:3000/app/patterns
- ⏳ Verify Python API mapping resolves correctly
- ⏳ Confirm Pro lock overlay displays for Free users
- ⏳ Validate filter Draft/Applied workflow
- ⏳ Check 500-candle historical display

### Future Enhancements

- ⏳ Elliott Wave Top-N implementation (separate large task)
- ⏳ Evidence schema definitions (SR, Retest, Liquidity zones with v1.0.0)
- ⏳ Chart precision improvements (timeMs unification, snap-to-pivots)
- ⏳ User tier management (connect to auth/subscription system)
- ⏳ Pattern search by tags
- ⏳ Pattern favorites/bookmarking
- ⏳ Export pattern reports

---

## 🚀 Next Steps

1. **Test the implementation**:
   ```bash
   # Start Python API (port 8001)
   cd python_analysis
   python run_server.py
   
   # Start Next.js dev server
   cd nexus-webapp
   npm run dev
   
   # Visit: http://localhost:3000/app/patterns
   ```

2. **Verify registry integration**:
   - Open browser console
   - Check if categories dropdown shows 12 categories (not 68+)
   - Verify Pro categories show 🔒 icon
   - Test Draft/Applied: change filters, observe no immediate update until Scan pressed

3. **Test Pro gating**:
   - Scan for patterns
   - If any Liquidity/Breakout/Scalping patterns detected, verify Lock overlay appears
   - Test userTier prop by passing `userTier="pro"` to PatternCard

4. **Validate Python mapping**:
   - Console log pattern resolution: `resolvePatternFromPython("Ascending Triangle")`
   - Should return full PatternDefinition object
   - Check network tab for API response format

---

## 📚 Documentation References

- Pattern definitions: `src/lib/indicators/patterns/{category}/{pattern}.ts`
- Registry API: `src/lib/indicators/patterns/registry.ts`
- Python mapping: `src/lib/indicators/patterns/common/mapping.ts`
- Type definitions: `src/lib/indicators/patterns/common/types.ts`
- Scanner component: `src/components/patterns/PatternScanner.tsx`
- Filter component: `src/components/patterns/PatternFilters.tsx`
- Card component: `src/components/patterns/PatternCard.tsx`

---

## 🎨 UI Changes Summary

### Before

- 68+ hardcoded pattern "types" in dropdown (mixture of categories and individual patterns)
- 200-candle lookback
- Live filtering (config change → immediate result update)
- No Pro gating

### After

- 12 clean category groups from Python backend
- 500-candle lookback for historical patterns
- Draft/Applied state (filters apply only on Scan button)
- Pro categories marked with 🔒
- Lock overlay on Pro patterns for Free users

---

**Implementation Complete** ✅  
Ready for testing and validation.
