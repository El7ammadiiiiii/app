# Quick Guide: Adding New Patterns

## 📋 Checklist for New Pattern

When adding a new pattern to the registry, follow these 4 steps:

---

## 1️⃣ Create Pattern Definition File

**Location**: `src/lib/indicators/patterns/{category}/{pattern-slug}.ts`

**Template**:
```typescript
import { PatternDefinition } from '../common/types';

const yourPatternName: PatternDefinition = {
  id: 'category/pattern-slug',           // Format: "{category}/{slug}"
  title: 'Your Pattern Name',            // Display name for UI
  category: 'category',                  // Must match PatternCategoryId
  family: 'chart',                       // chart | level | trend | liquidity | momentum | structure
  pythonNames: ['Pattern Name'],         // EXACT name from Python detector output
  pythonCategories: ['python_category'], // Python category (snake_case)
  proOnly: false,                        // true for Pro-only patterns
  defaultEnabled: true,                  // true = enabled by default
  tags: ['tag1', 'tag2'],               // Optional: for search/filtering
};

export default yourPatternName;
```

**Example (Ascending Triangle)**:
```typescript
import { PatternDefinition } from '../common/types';

const ascendingTriangle: PatternDefinition = {
  id: 'triangles/ascending-triangle',
  title: 'Ascending Triangle',
  category: 'triangles',
  family: 'chart',
  pythonNames: ['Ascending Triangle'],
  pythonCategories: ['triangles'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'triangle'],
};

export default ascendingTriangle;
```

---

## 2️⃣ Add to Mapping Table

**File**: `src/lib/indicators/patterns/common/mapping.ts`

Add entry to `pythonNameToId`:

```typescript
export const pythonNameToId: Record<string, string> = {
  // ... existing entries ...
  
  'Your Pattern Name': 'category/pattern-slug', // Add this line
};
```

**Important**: 
- Key = EXACT Python detector output name (case-sensitive)
- Value = Pattern ID from step 1

---

## 3️⃣ Import in Registry

**File**: `src/lib/indicators/patterns/registry.ts`

### 3a. Add import at top

```typescript
// ... existing imports ...
import yourPatternName from './category/pattern-slug';
```

### 3b. Add to ALL_PATTERNS array

```typescript
const ALL_PATTERNS: PatternDefinition[] = [
  // ... existing patterns ...
  
  // Your Category
  yourPatternName,
];
```

**Pro Tip**: Keep patterns grouped by category for readability

---

## 4️⃣ Update Category Count (if new category)

**Only if adding a NEW category** (not needed for patterns in existing categories):

### 4a. Add to PatternCategoryId type

**File**: `src/lib/indicators/patterns/common/types.ts`

```typescript
export type PatternCategoryId =
  | 'triangles'
  | 'channels'
  // ... existing categories ...
  | 'your-new-category'; // Add this
```

### 4b. Add category metadata

**File**: `src/lib/indicators/patterns/registry.ts`

```typescript
const CATEGORY_META: PatternCategoryMeta[] = [
  // ... existing categories ...
  
  {
    id: 'your-new-category',
    label: 'Your Category Name',
    description: 'Description of patterns in this category',
    proOnly: false, // true if all patterns in category are Pro-only
  },
];
```

### 4c. Add Python category mapping

**File**: `src/lib/indicators/patterns/common/mapping.ts`

```typescript
export const pythonCategoryToId: Record<string, string> = {
  // ... existing mappings ...
  'your_python_category': 'your-new-category', // snake_case → kebab-case
};
```

---

## ✅ Verification Checklist

After adding pattern, verify:

- [ ] Pattern file created with all required fields
- [ ] Pattern ID follows format: `"category/slug"`
- [ ] `pythonNames` array matches EXACT Python detector output
- [ ] Entry added to `pythonNameToId` mapping
- [ ] Pattern imported in `registry.ts`
- [ ] Pattern added to `ALL_PATTERNS` array
- [ ] If new category: added to `PatternCategoryId` type
- [ ] If new category: metadata added to `CATEGORY_META`
- [ ] If new category: Python mapping added to `pythonCategoryToId`
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] Pattern appears in `/app/patterns` filters dropdown

---

## 🎯 Pro-Only Patterns

To make a pattern Pro-only:

1. Set `proOnly: true` in pattern definition
2. Choose Pro category (`breakouts`, `liquidity`, `scalping`) OR create new Pro category

**Example**:
```typescript
const liquidityPoolAbove: PatternDefinition = {
  id: 'liquidity/liquidity-pool-above',
  title: 'Liquidity Pool (Above)',
  category: 'liquidity',        // Pro category
  family: 'liquidity',
  pythonNames: ['Liquidity Pool (Above)'],
  pythonCategories: ['liquidity'],
  proOnly: true,                // Pro flag
  defaultEnabled: true,
};
```

**Result**: Free users see Lock overlay with "Upgrade to Pro" button

---

## 🔍 Testing Your Pattern

### 1. Check TypeScript compilation

```bash
cd ccways
npm run build
```

Should complete without errors.

### 2. Test in browser console

```javascript
import { getPatternById, resolvePatternFromPython } from '@/lib/indicators/patterns/registry';

// Test by ID
const pattern = getPatternById('category/pattern-slug');
console.log(pattern); // Should return PatternDefinition object

// Test Python resolution
const resolved = resolvePatternFromPython('Your Pattern Name');
console.log(resolved); // Should return same PatternDefinition
```

### 3. Test in UI

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3000/app/patterns
3. Open filters dropdown → verify category appears
4. If Pro pattern: scan and verify Lock overlay displays (when userTier='free')

---

## 📝 Common Mistakes to Avoid

### ❌ Pattern ID mismatch
```typescript
// Wrong: inconsistent formatting
id: 'Triangles/AscendingTriangle'
id: 'triangles_ascending_triangle'

// Correct: consistent kebab-case
id: 'triangles/ascending-triangle'
```

### ❌ Python name mismatch
```typescript
// Wrong: doesn't match Python detector
pythonNames: ['ascending triangle']  // lowercase
pythonNames: ['Ascending_Triangle']  // underscore

// Correct: exact match from Python
pythonNames: ['Ascending Triangle']  // Space, proper case
```

### ❌ Forgot to add to registry
```typescript
// Created file triangles/new-pattern.ts
// But didn't import in registry.ts
// Result: pattern not available in UI ❌
```

### ❌ Category mismatch
```typescript
// Pattern definition
category: 'triangle' // Wrong: no 's'

// Should be
category: 'triangles' // Must match PatternCategoryId exactly
```

---

## 🚀 Quick Add Commands

Use this checklist when adding patterns:

```bash
# 1. Create pattern file
code src/lib/indicators/patterns/category/pattern-slug.ts

# 2. Edit mapping
code src/lib/indicators/patterns/common/mapping.ts

# 3. Edit registry
code src/lib/indicators/patterns/registry.ts

# 4. Build & test
npm run build
npm run dev
```

---

## 📚 Related Documentation

- Full implementation details: [PATTERN_REGISTRY_IMPLEMENTATION.md](./PATTERN_REGISTRY_IMPLEMENTATION.md)
- Type definitions: [src/lib/indicators/patterns/common/types.ts](./src/lib/indicators/patterns/common/types.ts)
- Registry API: [src/lib/indicators/patterns/registry.ts](./src/lib/indicators/patterns/registry.ts)

---

**Ready to add patterns!** Follow the 4 steps above for each new pattern. 🎨
