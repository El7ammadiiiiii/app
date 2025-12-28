# 📱 Quick Reference: Responsive Utilities

## Breakpoints

| Name | Width  | Devices        |
|------|--------|----------------|
| xs   | 375px  | Small phones   |
| sm   | 640px  | Large phones   |
| md   | 768px  | Tablets        |
| lg   | 1024px | Laptops        |
| xl   | 1280px | Desktops       |
| 2xl  | 1536px | Large desktops |
| 3xl  | 1920px | Ultra-wide     |

## CSS Classes

```css
.responsive-container        /* Auto width with padding */
```

### Grids

```css
.responsive-grid            /* 1 → 2 → 3 columns */
.responsive-grid-4          /* 4 columns on xl+ */
```

### Typography

```css
.text-responsive-sm         /* 0.875rem → 1rem */
.text-responsive-base       /* 1rem → 1.125rem */
.text-responsive-lg         /* 1.125rem → 1.5rem */
.text-responsive-xl         /* 1.5rem → 2.25rem */
```

### Touch Targets

```css
.touch-target               /* 44px × 44px minimum */
```

### Tailwind Visibility

```css
.mobile-only                /* Show only on mobile */
.tablet-up                  /* Show on tablet+ */
.desktop-only               /* Show on desktop+ */
```

### Spacing

```css
.section-padding            /* 2rem → 3rem → 4rem */
```

## React Components

### ResponsiveContainer

```tsx
<ResponsiveContainer size="xl" padding="lg">
  {children}
</ResponsiveContainer>
```

### ResponsiveGrid

```tsx
<ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 3 }} gap="md">
  {items}
</ResponsiveGrid>
```

### ResponsiveStack

```tsx
<ResponsiveStack direction="responsive" spacing="md">
  {items}
</ResponsiveStack>
```

### ResponsiveNav

```tsx
<ResponsiveNav logo={<Logo />}>
  <ResponsiveNavItem href="/">Home</ResponsiveNavItem>
</ResponsiveNav>
```

## Tailwind Classes

### Grid

```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### Flex

```tsx
className="flex flex-col md:flex-row"
```

### Padding

```tsx
className="px-4 md:px-8 lg:px-12"
```

### Text Size

```tsx
className="text-2xl md:text-4xl lg:text-6xl"
```

### Visibility

```tsx
className="hidden lg:block"          // Hide on mobile
className="block lg:hidden"          // Hide on desktop
```

## Testing

### Chrome DevTools

1. Press `F12`
2. Click device icon (`Ctrl+Shift+M`)
3. Select device preset
4. Test portrait/landscape

### Devices to Test

- iPhone SE (375px)
- iPhone 12/13/14 (390px)
- iPad (768px)
- iPad Pro (1024px)
- MacBook Air (1440px)
- Desktop (1920px)

## Common Patterns

### Responsive Hero

```tsx
<ResponsiveStack direction="responsive" align="center">
  <div>
    <h1 className="text-responsive-xl">Title</h1>
    <p className="text-responsive-base">Description</p>
  </div>
  <div>
    <img className="w-full h-auto" />
  </div>
</ResponsiveStack>
```

### Responsive Form

```tsx
<ResponsiveContainer size="sm">
  <div className="space-y-4">
    <input className="w-full touch-target" />
    <button className="w-full touch-target">Submit</button>
  </div>
</ResponsiveContainer>
```

### Responsive Cards

```tsx
<ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 3, xl: 4 }}>
  {cards.map(card => <Card key={card.id} {...card} />)}
</ResponsiveGrid>
```

---

✅ **All components are mobile-first and fully responsive**
