---
activation: model_decision
description: Responsive design patterns — mobile-first, container queries, fluid typography, modern viewport units.
globs:
    - "src/**/*.tsx"
    - "src/**/*.jsx"
    - "src/**/*.css"
    - "**/globals.css"
---

# Responsive Design Rules

## Core Principle: Mobile-First, Always

```jsx
// ❌ SAI — desktop-first
<div className="text-2xl md:text-base">

// ✅ ĐÚNG — mobile-first
<div className="text-base md:text-2xl">
```

**Tại sao:** Mobile loads ít CSS hơn, không cần override khi mobile (giảm specificity wars).

## Breakpoint Strategy (Tailwind v4 default)

| Breakpoint | Min-width | Use case                       | Tailwind prefix |
| ---------- | --------- | ------------------------------ | --------------- |
| Mobile     | 0px       | Phone portrait                 | (no prefix)     |
| sm         | 640px     | Phone landscape, small tablet  | `sm:`           |
| md         | 768px     | Tablet portrait                | `md:`           |
| lg         | 1024px    | Tablet landscape, small laptop | `lg:`           |
| xl         | 1280px    | Laptop, desktop                | `xl:`           |
| 2xl        | 1536px    | Large desktop                  | `2xl:`          |

**RULE:** Mặc định chỉ dùng `md:` và `lg:` cho structural changes. Tránh nhồi 5 breakpoints (`sm:` `md:` `lg:` `xl:` `2xl:`) trên cùng 1 element — đó là dấu hiệu refactor.

## The 3-Layer Escalation Model (theo responsive-craft)

```
1. Continuous (smooth scaling)
   → clamp(), cqi units, fluid tokens
   → Use cho: font size, padding, gap

2. Component (context-aware)
   → @container queries
   → Use cho: card layout, nav items adapt to parent

3. Structural (page-level shifts)
   → @media queries (Tailwind sm:/md:/lg:)
   → Use cho: column count, sidebar visibility, nav transform
```

**Decision tree:**

```
Cần thay đổi layout?
  Không → clamp() cho sizing. Dừng.
  Có → Depend on CONTAINER size?
    Có → Container query (Tailwind @container)
    Không → Depend on VIEWPORT?
      Có → Media query (sm:/md:/lg:)
      Không → :has() hoặc intrinsic (auto-fit, flex-wrap)
```

## Modern Viewport Units

```jsx
// ❌ SAI — 100vh overflow trên mobile khi address bar visible
<section className="h-screen">

// ✅ ĐÚNG — dùng svh (small viewport height)
<section className="h-svh">

// dvh (dynamic) — track exact visible area
<div className="h-dvh"> {/* chat container, modal */}

// lvh (large) — when toolbar collapsed
<div className="h-lvh"> {/* hero full với address bar collapsed */}
```

**Rule of thumb:**

- `svh` cho 90% case (hero, sections)
- `dvh` chỉ khi cần track exact (chat input fixed bottom)
- `lvh` rất ít — chỉ specific design

## Fluid Typography với `clamp()`

```css
/* tailwind.config / globals.css */
@theme {
    --text-display: clamp(2rem, 5vw + 1rem, 4rem);
    --text-headline: clamp(1.5rem, 3vw + 0.5rem, 2.5rem);
    --text-body: clamp(0.875rem, 1vw + 0.5rem, 1rem);
}
```

```jsx
<h1 className="text-[length:var(--text-display)]">
```

Hoặc dùng `text-[clamp(...)]` arbitrary:

```jsx
<h1 className="text-[clamp(2rem,5vw+1rem,4rem)]">
```

## Container Queries (Tailwind v4)

```jsx
// Wrap container
<div className="@container">
    <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
        {/* Adapts to container, not viewport */}
    </div>
</div>
```

**When to use:** Component xuất hiện ở nhiều context (sidebar 320px vs main 800px) → cùng CSS, khác layout.

## Touch Target Minimum

**Apple HIG + Material Design:** Min 44x44px (mobile) / 32x32px (mouse).

```jsx
// ❌ SAI — touch target 32x32
<button className="size-8">

// ✅ ĐÚNG — 44x44 trên mobile, 32x32 trên desktop
<button className="size-11 md:size-8">

// Hoặc dùng padding để mở rộng hit area
<button className="size-8 p-2 -m-2">
```

## Touch vs Hover (Pointer Media Queries)

```jsx
// ❌ SAI — hover-only menu trên mobile = không bao giờ mở
<DropdownMenu className="hidden hover:block">

// ✅ ĐÚNG — distinguish pointer type
<DropdownMenu className="
    [@media(hover:hover)]:hover:block
    [@media(hover:none)]:on-tap:block
">
```

Tailwind v4 có pointer modifiers:

```jsx
<div className="pointer-fine:cursor-grab pointer-coarse:cursor-default">
```

## Safe Areas (iOS notch, home indicator)

```jsx
// Bottom nav with home indicator
<nav className="
    fixed bottom-0
    pb-[env(safe-area-inset-bottom)]
">
```

```css
/* globals.css */
:root {
    --safe-top: env(safe-area-inset-top);
    --safe-bottom: env(safe-area-inset-bottom);
}
```

## Anti-patterns (BANNED)

| ❌ NEVER DO                            | ✅ DO INSTEAD                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `h-screen` (uses 100vh)                | `h-svh` / `h-dvh`                                                                      |
| `max-width` media queries              | `min-width` (mobile-first)                                                             |
| `display: none` để hide mobile content | Render conditionally with state or use `hidden md:block` only for non-critical content |
| Fixed pixel padding `p-[24px]`         | Tailwind tokens `p-6`                                                                  |
| `vw` units cho font (crash on 320px)   | `clamp(min, vw+rem, max)`                                                              |
| Touch target < 44x44 trên mobile       | `size-11 md:size-8`                                                                    |
| Hover-only interactions                | Combine hover + tap fallback                                                           |
| 5 breakpoints trên 1 element           | Refactor — chỉ 2 breakpoints max                                                       |

## Testing Rule

**TEST BẰNG DRAG, KHÔNG JUMP:**

```bash
# Mở DevTools responsive mode
# Drag từ 280px → 2560px CHẬM
# Phát hiện in-between failures:
#  - 360-380px: text overflow?
#  - 750-770px: nav broken?
#  - 1100-1200px: sidebar squeeze?
```

KHÔNG chỉ test 320 / 768 / 1024 / 1440 — đó là illusion of coverage.

## Required Test Viewports

| Width  | Device         | Why                                        |
| ------ | -------------- | ------------------------------------------ |
| 320px  | iPhone SE      | Smallest common mobile                     |
| 375px  | iPhone 12-15   | Most common mobile                         |
| 414px  | iPhone Pro Max | Large mobile                               |
| 768px  | iPad portrait  | Tablet boundary                            |
| 1024px | iPad landscape | Tablet ↔ desktop                           |
| 1440px | MacBook 13"    | Most common laptop                         |
| 1920px | Desktop        | Common desktop                             |
| 2560px | 4K             | Large screens (đảm bảo không stretch ugly) |

## Checklist

- [ ] Mobile-first (unprefixed = mobile)
- [ ] `svh` thay `vh` cho full-height sections
- [ ] `clamp()` cho fluid typography (không nhồi 5 breakpoints)
- [ ] Container queries cho component context-aware
- [ ] Touch target ≥ 44x44px trên mobile
- [ ] Hover state có alternative cho touch
- [ ] Safe area cho iOS bottom nav
- [ ] Tested bằng drag DevTools (không jump)
- [ ] 8 viewport widths đều render đẹp
- [ ] Không có `display:none` để hide critical mobile content
- [ ] Không có hardcoded pixel values (dùng Tailwind tokens)
