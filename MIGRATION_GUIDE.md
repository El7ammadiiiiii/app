# 🔄 Migration Guide: Making Existing Components Responsive

This guide shows you how to update your existing components to be fully responsive.

## Migration Pattern

### Before & After Examples

#### Example 1: Basic Page Layout

##### Before (Fixed Width)

```tsx
export function MyPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h1>My Page</h1>
      <div>{content}</div>
    </div>
  );
}
```

##### After (Responsive)

```tsx
import { ResponsiveContainer } from '@/components/layout';

export function MyPage() {
  return (
    <ResponsiveContainer size="xl" padding="lg">
      <h1 className="text-responsive-xl">My Page</h1>
      <div>{content}</div>
    </ResponsiveContainer>
  );
}
```

---

#### Example 2: Grid of Cards

##### Before (Fixed Columns)

```tsx
export function CardGrid({ items }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20 
    }}>
      {items.map(item => <Card key={item.id} {...item} />)}
    </div>
  );
}
```

##### After (Responsive Grid)

```tsx from '@/components/layout';

export function CardGrid({ items }) {
  return (
    <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 3 }} gap="md">
      {items.map(item => <Card key={item.id} {...item} />)}
    </ResponsiveGrid>
  );
}
```

---

#### Example 3: Header with Logo and Nav

##### Before (No Mobile Support)

```tsx
export function Header() {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', padding: 20 }}>
      <Logo />
      <nav style={{ display: 'flex', gap: 20 }}>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
  );
}
```

##### After (Responsive with Mobile Menu)

```tsx
import { ResponsiveNav, ResponsiveNavItem } from '@/components/layout';

export function Header() {
  return (
    <ResponsiveNav logo={<Logo />}>
      <ResponsiveNavItem href="/">Home</ResponsiveNavItem>
      <ResponsiveNavItem href="/about">About</ResponsiveNavItem>
      <ResponsiveNavItem href="/contact">Contact</ResponsiveNavItem>
    </ResponsiveNav>
  );
}
```

---

#### Example 4: Hero Section

##### Before (Side by Side)

```tsx
export function Hero() {
  return (
    <div style={{ display: 'flex', gap: 40 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 48 }}>Welcome</h1>
        <p style={{ fontSize: 18 }}>Description</p>
        <button>Get Started</button>
      </div>
      <div style={{ flex: 1 }}>
        <img src="/hero.jpg" />
      </div>
    </div>
  );
}
```

##### After (Responsive Stack)

```tsx
import { ResponsiveContainer, ResponsiveStack } from '@/components/layout';

export function Hero() {
  return (
    <ResponsiveContainer>
      <ResponsiveStack direction="responsive" spacing="lg" align="center">
        <div className="flex-1">
          <h1 className="text-responsive-xl font-bold mb-4">Welcome</h1>
          <p className="text-responsive-base mb-6">Description</p>
          <button className="touch-target px-6 py-3 bg-accent-primary rounded-lg">
            Get Started
          </button>
        </div>
        <div className="flex-1">
          <img src="/hero.jpg" className="w-full h-auto rounded-lg" />
        </div>
      </ResponsiveStack>
    </ResponsiveContainer>
  );
}
```

---

#### Example 5: Dashboard Stats

##### Before (Fixed 4 Columns)

```tsx
export function DashboardStats() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      <StatCard title="Users" value="1,234" />
      <StatCard title="Revenue" value="$56K" />
      <StatCard title="Orders" value="789" />
      <StatCard title="Growth" value="+12%" />
    </div>
  );
}
```

##### After (Responsive Columns)

```tsx
import { ResponsiveGrid } from '@/components/layout';

export function DashboardStats() {
  return (
    <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md">
      <StatCard title="Users" value="1,234" />
      <StatCard title="Revenue" value="$56K" />
      <StatCard title="Orders" value="789" />
      <StatCard title="Growth" value="+12%" />
    </ResponsiveGrid>
  );
}
```

---

#### Example 6: Form Layout

##### Before (No Touch Optimization)

```tsx
export function LoginForm() {
  return (
    <form style={{ maxWidth: 400, margin: '0 auto' }}>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

##### After (Touch-Optimized)

```tsx
import { ResponsiveContainer, ResponsiveStack } from '@/components/layout';

export function LoginForm() {
  return (
    <ResponsiveContainer size="sm">
      <form className="glass-card p-6">
        <ResponsiveStack direction="vertical" spacing="md">
          <input 
            type="email" 
            placeholder="Email"
            className="w-full touch-target px-4 py-3 rounded-lg bg-bg-surface border border-white/10"
          />
          <input 
            type="password" 
            placeholder="Password"
            className="w-full touch-target px-4 py-3 rounded-lg bg-bg-surface border border-white/10"
          />
          <button 
            type="submit"
            className="w-full touch-target px-6 py-3 bg-accent-primary rounded-lg font-medium"
          >
            Login
          </button>
        </ResponsiveStack>
      </form>
    </ResponsiveContainer>
  );
}
```

---

#### Example 7: Sidebar Layout

##### Before (Always Side by Side)

```tsx
export function PageWithSidebar() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <aside style={{ width: 250 }}>
        <Sidebar />
      </aside>
      <main style={{ flex: 1 }}>
        <Content />
      </main>
    </div>
  );
}
```

##### After (Responsive Layout)

```tsx
import { ResponsiveContainer, ResponsiveStack } from '@/components/layout';

export function PageWithSidebar() {
  return (
    <ResponsiveContainer>
      <ResponsiveStack direction="responsive" spacing="lg" align="start">
        <aside className="w-full lg:w-64">
          <Sidebar />
        </aside>
        <main className="flex-1 min-w-0">
          <Content />
        </main>
      </ResponsiveStack>
    </ResponsiveContainer>
  );
}
```

---

#### Example 8: Product Card

##### Before (Fixed Size)

```tsx
export function ProductCard({ product }) {
  return (
    <div style={{ width: 300, padding: 20, border: '1px solid #ccc' }}>
      <img src={product.image} style={{ width: '100%', height: 200 }} />
      <h3 style={{ fontSize: 24 }}>{product.name}</h3>
      <p style={{ fontSize: 16 }}>{product.price}</p>
      <button>Add to Cart</button>
    </div>
  );
}
```

##### After (Responsive Card)

```tsx
export function ProductCard({ product }) {
  return (
    <div className="glass-card p-4 md:p-6 hover:bg-bg-card-hover transition-all">
      <img 
        src={product.image} 
        className="w-full h-48 md:h-56 object-cover rounded-lg mb-4" 
        alt={product.name}
      />
      <h3 className="text-responsive-lg font-bold mb-2">{product.name}</h3>
      <p className="text-responsive-base text-accent-primary mb-4">{product.price}</p>
      <button className="w-full touch-target px-6 py-3 bg-accent-primary rounded-lg">
        Add to Cart
      </button>
    </div>
  );
}
```

---

## Common Migration Patterns

### 1. Replace Fixed Widths
```tsx
// ❌ Before
style={{ maxWidth: 1200 }}

// ✅ After
<ResponsiveContainer size="xl">
```

### 2. Replace Fixed Grids
```tsx
// ❌ Before
style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}

// ✅ After
<ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 3 }}>
```

### 3. Replace Flex Layouts
```tsx
// ❌ Before
style={{ display: 'flex', flexDirection: 'row', gap: 20 }}

// ✅ After
<ResponsiveStack direction="responsive" spacing="md">
```

### 4. Replace Fixed Font Sizes
```tsx
// ❌ Before
style={{ fontSize: 48 }}

// ✅ After
className="text-responsive-xl"
```

### 5. Add Touch Targets
```tsx
// ❌ Before
<button style={{ padding: 10 }}>Click</button>

// ✅ After
<button className="touch-target px-6 py-3">Click</button>
```

### 6. Make Images Responsive
```tsx
// ❌ Before
<img src="/image.jpg" style={{ width: 500 }} />

// ✅ After
<img src="/image.jpg" className="w-full h-auto" />
```

---

## Step-by-Step Migration Process

### Step 1: Identify Components to Update
Look for:
- Fixed widths (`maxWidth`, `width` in pixels)
- Fixed grids (`gridTemplateColumns`)
- Fixed flex layouts (`flexDirection: 'row'`)
- Fixed font sizes (`fontSize` in pixels)
- Small buttons/links (< 44px height)

### Step 2: Import Responsive Components
```tsx
import {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
} from '@/components/layout';
```

### Step 3: Replace Fixed Layouts
- Wrap content in `ResponsiveContainer`
- Replace grids with `ResponsiveGrid`
- Replace flex with `ResponsiveStack`

### Step 4: Update Typography
- Replace font sizes with `text-responsive-*` classes
- Use Tailwind responsive modifiers (`text-2xl md:text-4xl`)

### Step 5: Add Touch Optimization
- Add `touch-target` class to buttons
- Ensure 44px minimum touch targets
- Add proper spacing between clickable elements

### Step 6: Test
- Test on Chrome DevTools device emulator
- Test on real mobile devices
- Check both portrait and landscape
- Verify touch targets work well

---

## Checklist for Each Component

- [ ] Wrapped in `ResponsiveContainer`?
- [ ] Grids use `ResponsiveGrid`?
- [ ] Layouts use `ResponsiveStack`?
- [ ] Typography uses responsive classes?
- [ ] Touch targets are 44px minimum?
- [ ] Images are responsive (`w-full h-auto`)?
- [ ] Tested on mobile device?
- [ ] Tested on tablet?
- [ ] Works in portrait and landscape?

---

## Quick Tips

1. **Start with containers**: Always wrap pages in `ResponsiveContainer` first
2. **Think mobile-first**: Design for mobile, enhance for desktop
3. **Use spacing utilities**: Prefer `gap-4 md:gap-6` over fixed gaps
4. **Touch targets matter**: 44px minimum for all clickable elements
5. **Test early**: Check mobile view frequently during development
6. **Use DevTools**: Chrome DevTools device emulator is your friend
7. **Real devices**: Always test on actual phones and tablets

---

## Need Help?

- 📖 See `RESPONSIVE_DESIGN_GUIDE.md` for detailed docs
- 📋 Check `RESPONSIVE_QUICK_REF.md` for quick reference
- 🎨 View `/responsive-demo` for live examples
- 🔍 Look at existing responsive components for patterns

---

✅ **Migration is simple and straightforward!**

Just replace fixed layouts with responsive components and add proper touch targets. Your components will work perfectly on all devices! 📱💻🖥️
