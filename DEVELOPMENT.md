# 📚 دليل تطوير CCCWAYS (nexus-webapp)

## 🗂️ هيكل المشروع

```
nexus-webapp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── app/               # /app route - التطبيق الرئيسي
│   │   │   ├── layout.tsx     # يستخدم AppLayout
│   │   │   └── page.tsx       # يرجع null (ChatArea يعرض من AppLayout)
│   │   ├── globals.css        # CSS العام (يستورد theme.css)
│   │   └── layout.tsx         # Root Layout
│   │
│   ├── components/
│   │   ├── layout/            # 🏗️ المكونات الهيكلية
│   │   │   ├── app-layout.tsx     # التخطيط الرئيسي (Header + Sidebars + Main)
│   │   │   ├── chat-area.tsx      # منطقة الدردشة + قالب الكتابة
│   │   │   ├── sidebar-left.tsx   # الشريط الأيسر (المحادثات)
│   │   │   └── sidebar-right.tsx  # الشريط الأيمن (الأدوات)
│   │   │
│   │   ├── chat/              # 💬 مكونات الدردشة
│   │   │   ├── canvas-message.tsx # رسالة Canvas
│   │   │   ├── deep-research-panel.tsx
│   │   │   └── web-search-panel.tsx
│   │   │
│   │   ├── projects/          # 📁 نظام المشاريع
│   │   ├── settings/          # ⚙️ الإعدادات
│   │   └── ui/                # 🎨 UI Components
│   │
│   ├── hooks/                 # 🪝 Custom Hooks
│   │   ├── useTheme.ts        # إدارة Light/Dark mode
│   │   └── useProjectShortcuts.ts
│   │
│   ├── styles/                # 🎨 الأنماط
│   │   └── theme.css          # ⭐ نظام الثيم المركزي
│   │
│   ├── store/                 # 📦 Zustand Stores
│   │   └── projectStore.ts
│   │
│   └── lib/                   # 🔧 Utilities
│       ├── utils.ts           # cn() و helper functions
│       └── sounds.ts          # Sound effects
│
├── public/                    # ملفات ثابتة
└── package.json
```

---

## 🎨 نظام الثيم (Theme System)

### الملفات الأساسية

| الملف | الوظيفة |
|-------|---------|
| `src/styles/theme.css` | **المصدر الوحيد** لكل الألوان والمتغيرات |
| `src/app/globals.css` | يستورد theme.css + أنماط عامة |
| `src/hooks/useTheme.ts` | Hook لتبديل Light/Dark mode |

### CSS Variables المتاحة

```css
/* الخلفيات */
--bg-base          /* خلفية الصفحة الرئيسية */
--bg-surface       /* الأسطح والبطاقات */
--bg-elevated      /* العناصر المرتفعة */
--bg-overlay       /* الـ overlays */

/* النصوص */
--text-primary     /* النص الرئيسي */
--text-secondary   /* النص الثانوي */
--text-muted       /* النص الخافت */
--text-accent      /* النص المميز (Teal) */

/* الحدود */
--border-default   /* الحدود العادية */
--border-subtle    /* الحدود الخفيفة */
--border-accent    /* الحدود المميزة */

/* اللون الرئيسي */
--color-primary        /* Teal #0d9488 */
--color-primary-hover  /* Teal darker */
--color-primary-light  /* Teal transparent */

/* الأزرار */
--btn-primary-bg, --btn-primary-text, --btn-primary-border
--btn-secondary-bg, --btn-secondary-text, --btn-secondary-border
--btn-ghost-bg, --btn-ghost-text

/* الـ Inputs */
--input-bg, --input-border, --input-text, --input-placeholder

/* البطاقات */
--card-bg, --card-border, --card-shadow

/* Charts */
--chart-up         /* أخضر للصعود */
--chart-down       /* أحمر للهبوط */
--chart-neutral    /* رمادي للمحايد */
--chart-grid       /* خطوط الشبكة */

/* Candlestick */
--candle-up-body, --candle-down-body
--candle-up-wick, --candle-down-wick

/* Indicators */
--indicator-ma-fast, --indicator-ma-slow
--indicator-bb-upper, --indicator-bb-lower
--indicator-rsi, --indicator-macd
```

### كيفية الاستخدام

```tsx
// ✅ الطريقة الصحيحة - استخدام CSS Variables
<div className="bg-surface border-default text-primary">

// ✅ أو استخدام theme classes
<div className="theme-card">
<div className="theme-dropdown">
<button className="btn-primary">

// ❌ خطأ - لا تستخدم ألوان hardcoded
<div className="bg-[#081820]">  // ❌
<div className="border-white/[0.08]">  // ❌
```

### تبديل الثيم

```tsx
import { useTheme } from "@/hooks/useTheme";

function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
```

---

## 🏗️ بنية Layout

### التسلسل الهرمي

```
RootLayout (app/layout.tsx)
└── AppLayout (components/layout/app-layout.tsx)
    ├── Header (fixed, h-16)
    ├── SidebarLeft (fixed)
    ├── SidebarRight (fixed)
    └── Main Content (flex-1)
        └── ChatArea
            ├── Messages (flex-1, overflow-y-auto)
            └── Input (shrink-0, fixed bottom)
```

### قواعد مهمة للـ Layout

```css
/* لضمان ظهور قالب الكتابة في الأسفل */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;  /* ⭐ ضروري للـ flex */
}

/* منطقة الرسائل */
.messages-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;  /* ⭐ ضروري */
}

/* قالب الكتابة */
.input-area {
  flex-shrink: 0;  /* لا يتقلص */
}
```

---

## 📋 Theme Classes الجاهزة

```css
/* الخلفيات */
.bg-base        /* var(--bg-base) */
.bg-surface     /* var(--bg-surface) */
.bg-elevated    /* var(--bg-elevated) */

/* النصوص */
.text-primary   /* var(--text-primary) */
.text-secondary /* var(--text-secondary) */
.text-muted     /* var(--text-muted) */
.text-accent    /* var(--text-accent) */

/* الحدود */
.border-default /* var(--border-default) */
.border-subtle  /* var(--border-subtle) */
.border-accent  /* var(--border-accent) */

/* الأزرار */
.btn-primary    /* زر رئيسي */
.btn-secondary  /* زر ثانوي */
.btn-ghost      /* زر شفاف */

/* البطاقات */
.card-base      /* بطاقة أساسية */
.glass-panel    /* لوحة زجاجية */

/* Theme containers */
.theme-bg       /* خلفية الصفحة */
.theme-surface  /* سطح */
.theme-card     /* بطاقة */
.theme-dropdown /* قائمة منسدلة */
.theme-header   /* الـ header */

/* الرسائل */
.message-user       /* رسالة المستخدم */
.message-assistant  /* رسالة المساعد */

/* Charts */
.chart-up       /* لون الصعود */
.chart-down     /* لون الهبوط */
.chart-neutral  /* لون محايد */

/* Scrollbar */
.custom-scrollbar  /* scrollbar مخصص */

/* Animations */
.shimmer           /* تأثير التحميل */
.animate-fade-in   /* ظهور تدريجي */
.animate-slide-up  /* انزلاق للأعلى */
```

---

## 🔧 تغيير الألوان

### تغيير اللون الرئيسي (Accent)

عدّل في `src/styles/theme.css`:

```css
:root {
  /* غيّر Teal إلى لون آخر */
  --teal-500: #14b8a6;  /* ← غيّر هذا */
  --teal-600: #0d9488;  /* ← وهذا */
  /* ... */
  
  --color-primary: #0d9488;  /* ← وهذا */
}
```

### تغيير ألوان Charts

```css
:root {
  --chart-up: #22c55e;      /* أخضر */
  --chart-down: #ef4444;    /* أحمر */
  --indicator-ma-fast: #3b82f6;  /* أزرق */
}
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

### 1. ❌ ألوان Hardcoded

```tsx
// ❌ خطأ
<div className="bg-[#081820]">
<div className="border-white/[0.08]">
<div className="text-gray-400">

// ✅ صحيح
<div className="bg-surface">
<div className="border-default">
<div className="text-muted">
```

### 2. ❌ نسيان min-h-0 في Flex

```tsx
// ❌ خطأ - قد يخفي المحتوى
<div className="flex flex-col h-full">
  <div className="flex-1 overflow-y-auto">

// ✅ صحيح
<div className="flex flex-col h-full min-h-0">
  <div className="flex-1 overflow-y-auto min-h-0">
```

### 3. ❌ استخدام inline styles للألوان

```tsx
// ❌ خطأ
<div style={{ backgroundColor: '#081820' }}>

// ✅ صحيح
<div style={{ backgroundColor: 'var(--bg-surface)' }}>
// أو الأفضل
<div className="bg-surface">
```

---

## 🚀 أوامر مفيدة

```bash
# تشغيل التطوير
npm run dev

# بناء للإنتاج
npm run build

# فحص الأخطاء
npm run lint

# تنظيف الـ cache
rm -rf .next && npm run dev
```

---

## 📝 ملاحظات إضافية

1. **الثيم يُحفظ في localStorage** تحت المفتاح `cccways-theme`
2. **الوضع الافتراضي** هو Dark mode
3. **RTL support** - الموقع يدعم العربية (direction: rtl)
4. **Responsive** - يتكيف مع الشاشات الصغيرة (< 1024px)

---

## 🎯 قائمة التحقق قبل الـ Commit

- [ ] لا توجد ألوان hardcoded
- [ ] كل الـ flex containers بها `min-h-0` عند الحاجة
- [ ] الـ imports نظيفة (لا توجد imports غير مستخدمة)
- [ ] الـ theme classes مستخدمة بدل inline styles
- [ ] `npm run lint` لا يُظهر أخطاء
