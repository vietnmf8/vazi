# Skill: Responsive Implementation Workflow

> 💡 **Tip:** For a full-featured responsive toolkit with audit/build/preview modes, see the `responsive-craft` skill. This skill is the Vietnamese-language quick entry point.


**Trigger:** "thiết kế responsive", "mobile-first", "responsive layout", "breakpoint", "make this responsive", "fix mobile", "audit responsive"

## Workflow

### Mode 1: Audit Existing Code

```
"Audit responsive của component/page X"
```

**Bước 1: Scan AI failure patterns**

Grep codebase tìm anti-patterns:

```bash
# 100vh (overflow on mobile)
grep -rn "h-screen\|100vh" src/ --include="*.tsx"

# Desktop-first max-width media queries
grep -rn "max-w-screen" src/ --include="*.tsx"

# Hardcoded pixel values
grep -rnE "[a-z]-\[[0-9]+px\]" src/ --include="*.tsx"

# Touch target nhỏ
grep -rnE "size-[1-9](\s|$)|h-[1-9](\s|$)" src/ --include="*.tsx"
```

**Bước 2: Manual review checklist**

| Check                                               | Pass? |
| --------------------------------------------------- | ----- |
| Mobile-first classes (no `md:` prefix default)      | ✅/❌ |
| `svh` thay `vh` cho full sections                   | ✅/❌ |
| Container queries cho component-level               | ✅/❌ |
| Touch targets ≥ 44x44 mobile                        | ✅/❌ |
| Hover có touch alternative                          | ✅/❌ |
| Safe areas cho iOS bottom                           | ✅/❌ |
| Không có nội dung critical bị `display:none` mobile | ✅/❌ |
| Test 8 viewports đều OK                             | ✅/❌ |

**Bước 3: Fix theo priority**

1. **P0 (Critical):** Overflow, không readable, không tap được
2. **P1 (High):** Touch target sai, hover-only
3. **P2 (Medium):** Spacing không proportional, font không fluid
4. **P3 (Low):** Polish (animation, micro-interaction)
   **Bước 4: Report**

```markdown
## Responsive Audit Report

### Issues Found

| File            | Line | Severity | Issue                         | Fix       |
| --------------- | ---- | -------- | ----------------------------- | --------- |
| HeroSection.tsx | 12   | P0       | `h-screen` → overflow mobile  | `h-svh`   |
| Nav.tsx         | 45   | P1       | Hamburger không có aria-label | Add label |
| Card.tsx        | 23   | P2       | Hardcoded `p-[16px]`          | `p-4`     |

### Fixed in this PR

✅ 5/8 issues
⏳ 3/8 pending (need design decision)
```

---

### Mode 2: Build From Scratch

```
"Build component/page X responsive"
```

**Bước 1: Describe BEFORE Code** (compensate for no canvas)

```markdown
## Component: ProductCard

### Behavior at each breakpoint

| Viewport          | Layout           | Image           | Content     | Actions                  |
| ----------------- | ---------------- | --------------- | ----------- | ------------------------ |
| 320-639 (mobile)  | Stacked vertical | Full-width 16:9 | Below image | Single full-width button |
| 640-1023 (tablet) | Same             | 4:3 ratio       | Below       | Inline button group      |
| 1024+ (desktop)   | Horizontal       | Left 40%        | Right 60%   | Right-aligned buttons    |

### Design forks (need user decision)

- Image: maintain aspect ratio vs crop center?
- Title: 1-line truncate vs 2-line clamp on mobile?
- Price: prominent vs subtle?
```

→ **STOP. Đợi user confirm trước khi code.**

**Bước 2: Implement theo Escalation Model**

```jsx
// Layer 1: Continuous (clamp, fluid)
<div className="p-[clamp(1rem,3vw,2rem)]">

// Layer 2: Component (container query)
<div className="@container">
    <article className="grid grid-cols-1 @lg:grid-cols-[2fr_3fr]">
        ...
    </article>
</div>

// Layer 3: Structural (media query - last resort)
<nav className="hidden md:block">
```

**Bước 3: Test theo viewport checklist**

```bash
# 8 viewports
for w in 320 375 414 768 1024 1280 1440 1920; do
    echo "Testing at ${w}px..."
    # Manual test trong DevTools
done
```

**Bước 4: Drag test**

Mở DevTools responsive mode, **drag slowly** từ 280 → 2560:

- Watch text overflow
- Watch nav transitions (hamburger threshold)
- Watch card grid (1 → 2 → 3 cols)
- Watch images (no stretching, no letterboxing ugly)

---

### Mode 3: Preview Multi-Breakpoint

Setup HTML preview hiển thị nhiều breakpoint **side-by-side**:

```bash
# Cài responsive-preview tool
npm install -D @responsive-craft/preview

# Run
npx responsive-preview src/components/ProductCard.tsx
```

Hoặc dùng Chrome DevTools Device Mode + multiple windows.

---

## AI Failure Patterns Checklist (BẮT BUỘC check)

```markdown
- [ ] Không dùng `h-screen` / `100vh` (dùng `h-svh`)
- [ ] Không dùng `max-width` media queries (mobile-first `min-width`)
- [ ] Không hide critical content với `display:none` mobile
- [ ] Bottom-fixed elements có `pb-[env(safe-area-inset-bottom)]`
- [ ] Touch targets ≥ 44x44 mobile (`size-11`)
- [ ] `vw` font luôn có `clamp(min, vw+rem, max)`
- [ ] Container queries có fallback (`@supports`)
- [ ] Sticky elements check z-index stacking context
- [ ] Modals trên mobile dùng `dvh` (track keyboard)
- [ ] Images có `object-fit` để không stretch
```

## Design Forks (khi nhiều approach hợp lệ → HỎI USER)

| Use case          | Option A           | Option B              | Tradeoff                                                          |
| ----------------- | ------------------ | --------------------- | ----------------------------------------------------------------- |
| Mobile nav        | Hamburger menu     | Bottom tab bar        | Hamburger: more items, hidden; Tab bar: 4-5 items, always visible |
| Sidebar mobile    | Drawer (slide-in)  | Collapsible accordion | Drawer: overlays content; Accordion: pushes content               |
| Data table mobile | Horizontal scroll  | Stack as cards        | Scroll: preserves columns; Cards: better readability              |
| Long form mobile  | Single page scroll | Multi-step wizard     | Scroll: see all; Wizard: less overwhelming                        |
| Hero text mobile  | Scale down         | Reflow (shorter copy) | Scale: same content; Reflow: better fit                           |

**Khi gặp các case này → HỎI user, KHÔNG tự đoán.**

## Checklist

- [ ] Đã describe behavior trước khi code?
- [ ] Đã apply escalation model (intrinsic → container → media)?
- [ ] Đã test bằng DRAG (không chỉ jump)?
- [ ] Đã check 8 viewport widths?
- [ ] Đã scan AI failure patterns?
- [ ] Đã hỏi user design forks (nếu có ambiguity)?
- [ ] Đã verify touch targets ≥ 44x44 mobile?
- [ ] Đã handle safe areas (iOS notch/bottom)?
