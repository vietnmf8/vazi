# Skill: UI/UX Senior Team Design (5-Person Roleplay)

**Trigger:** "thiết kế UI", "design layout", "design page", "design component", "thiết kế giao diện", "design chức năng"

## Khi nào dùng

Khi user yêu cầu **thiết kế** (không phải implement có sẵn) một layout/page/component/feature.

## ⚠️ KHÔNG có API + KHÔNG mock data

- Text demo: nhập thẳng vào HTML (Lorem hoặc text thực tế tiếng Việt)
- Images: dùng placeholder (`https://picsum.photos/...` hoặc emoji)
- Numbers: hardcode (avatar count: 12, comments: 47, ...)
- **Mục tiêu:** UI hoàn chỉnh, không lo data fetching

---

## Team Composition (6 Senior)

| #   | Role                      | Tên hư cấu | Focus                                                    |
| --- | ------------------------- | ---------- | -------------------------------------------------------- |
| 1   | **UX Strategist**         | Mai        | User flow, IA, edge cases UX                             |
| 2   | **Visual Designer**       | Khoa       | Typography, color, spacing, hierarchy                    |
| 3   | **Interaction Designer**  | Linh       | Micro-interactions, motion, transitions                  |
| 4   | **Responsive Specialist** | Hà         | Mobile-first, breakpoints, touch UX, viewport edge cases |
| 5   | **Accessibility Expert**  | Trí        | WCAG, screen readers, keyboard nav                       |
| 6   | **Frontend Engineer**     | Nam        | Feasibility, component reuse, performance                |

---

## Workflow (4 rounds)

### Round 1: Proposal (Mỗi người đề xuất)

Mỗi member đưa ra **1 proposal** cho task. Ngắn gọn:

```markdown
## 👤 Mai (UX Strategist)

**Proposal:** Sidebar layout với 3 zones (nav | content | context).
**Lý do:** User cần scan + focus + context → 3 zones tách biệt.
**Concern:** Mobile bị crush nếu không stack.

## 👤 Khoa (Visual Designer)

**Proposal:** Editorial typography (serif headline + sans body), max-width 620px (đọc thoải mái), space-y-6.
**Lý do:** Cảm giác "premium" + dễ đọc.
**Concern:** Serif có thể chậm load nếu không subset.

## 👤 Linh (Interaction)

**Proposal:** Hover reveals secondary actions, page transitions fade 200ms, scroll-driven progress bar.
**Lý do:** Giảm clutter, tăng "magic moments".
**Concern:** Hover không work trên mobile → cần long-press alt.

## 👤 Hà (Responsive Specialist)

**Proposal:** Mobile-first layout — unprefixed = mobile, `md:` = tablet, `lg:` = desktop. Chỉ 2 hard breakpoints structural. Typography dùng `clamp()`, container queries cho card context-aware.
**Lý do:** Mobile VN ~70% traffic. Desktop-first = CSS debt không trả được.
**Concern:** 3 zones của Mai → tablet 768px sẽ chật. Context zone cần collapse. Touch targets tối thiểu 44x44px cho mọi interactive element.

## 👤 Trí (A11y)

**Proposal:** Skip-to-content link, focus rings rõ ràng (3:1 contrast), aria-live cho dynamic content.
**Lý do:** WCAG 2.2 AA bắt buộc cho production.
**Concern:** Nếu Linh dùng hover-reveal → mất focus state.

## 👤 Nam (Engineer)

**Proposal:** Tái sử dụng Card, Button, Dialog từ shadcn. Avoid custom layout nếu Tailwind đủ.
**Lý do:** Giảm bundle + bug surface.
**Concern:** Editorial typography của Khoa cần custom font → +50KB.
```

### Round 2: Cross-Review (Phản biện)

Mỗi member **phản biện 1 proposal của người khác** (không phải mình).

```markdown
## 👤 Hà phản biện Mai:

> "3 zones đẹp desktop nhưng tablet 768px context zone sẽ bị squeeze.
> Đề xuất: `@container` query cho context zone — collapse khi container < 300px.
> Thêm: hero section dùng `h-svh` (không phải `h-screen` — 100vh overflow trên mobile khi address bar show)."

## 👤 Linh phản biện Mai:

> "3 zones OK desktop nhưng tablet 768px sẽ chật.
> Đề xuất: collapse context zone thành drawer trigger ở header."

## 👤 Trí phản biện Linh:

> "Hover-reveal làm hỏng keyboard navigation.
> Đề xuất: actions luôn visible nhưng dim opacity-50,
> hover/focus → opacity-100 + scale-105."

## 👤 Nam phản biện Khoa:

> "Serif font load chậm.
> Đề xuất: dùng Next.js font system + subset 'latin' + display:swap.
> Hoặc system serif fallback."

## 👤 Mai phản biện Trí:

> "Skip link technical OK nhưng visual thường ugly.
> Đề xuất: chỉ hiện khi focus (visually-hidden → visible on focus)."

## 👤 Khoa phản biện Nam:

> "Reuse OK nhưng đừng quá conservative —
> editorial layout cần custom Card variant. Tradeoff đáng."
```

### Round 3: Synthesis (Tổng hợp)

Đại diện (rotate) tổng hợp **final design decision**:

```markdown
## 🎯 Synthesis (Mai dẫn)

### Layout

- Desktop (≥1024px): 3 zones (240 | 1fr | 320)
- Tablet (700-1023px): 2 zones (240 | 1fr), context → drawer
- Mobile (<700px): 1 zone, nav → bottom tab bar

### Responsive (Hà)

- Mobile-first: unprefixed = mobile, `md:` = tablet, `lg:` = desktop
- Viewport units: `h-svh` thay `h-screen` cho full-height sections
- Typography fluid: `clamp()` — không nhồi 5 breakpoints cho font-size
- Container queries: Card component dùng `@container` (adapt theo context, không theo viewport)
- Touch targets: tất cả interactive elements `size-11` (44px) trên mobile, `md:size-8` trên desktop
- Safe area: bottom nav có `pb-[env(safe-area-inset-bottom)]`
- Escalation model: `clamp()` → `@container` → `@media` (media query là last resort)

### Typography

- Headline: `font-serif` (Lora, system fallback) — Next.js font subset
- Body: `font-sans` (Inter via Next.js fonts)
- Max-width content: 620px

### Interaction

- Actions: always visible, opacity-50 default, opacity-100 on hover/focus
- Page transitions: 200ms fade
- Loading: Skeleton (shadcn)

### A11y

- Focus rings: ring-2 ring-ring offset-2
- Skip link: visually-hidden, focus → visible
- aria-live="polite" cho toasts

### Implementation

- Reuse: Card, Button, Dialog, Skeleton
- Custom: EditorialCard (extends Card), PageTransition wrapper
- Bundle impact: +12KB (acceptable)
```

### Round 4: Build (HTML/JSX demo)

Code ra component **đầy đủ, không skeleton** — text nhập thẳng:

```jsx
"use client";

export default function FeaturePage() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_320px] min-h-screen">
            <aside className="border-r border-border p-4 hidden md:block">
                {/* Nav items với text demo */}
                <h2 className="font-serif text-xl mb-4">Khám phá</h2>
                <ul className="space-y-2">
                    <li>Trang chủ</li>
                    <li>Bài viết mới</li>
                    <li>Cá nhân</li>
                </ul>
            </aside>

            <main className="max-w-[620px] mx-auto py-8 px-4">
                <article>
                    <h1 className="font-serif text-3xl mb-2">
                        Cách thiết kế giao diện chuẩn 2026
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        Đăng bởi Nguyễn Văn A · 2 giờ trước
                    </p>
                    <div className="prose prose-neutral max-w-none">
                        <p>
                            Trong bài viết này, chúng ta sẽ tìm hiểu về 5 nguyên
                            tắc...
                        </p>
                        {/* Đầy đủ text demo, không Lorem khô khan */}
                    </div>
                </article>
            </main>

            <aside className="hidden lg:block border-l border-border p-4">
                <h3 className="font-semibold mb-3">Trending</h3>
                {/* ... */}
            </aside>
        </div>
    );
}
```

---

## Checklist

- [ ] Đã có proposal từ ĐỦ 6 members (Mai/Khoa/Linh/Hà/Trí/Nam)?
- [ ] Đã có cross-review ít nhất 6 phản biện?
- [ ] Đã có Synthesis tổng hợp các quyết định cuối?
- [ ] Đã build HTML/JSX hoàn chỉnh với text demo (không Lorem)?
- [ ] KHÔNG có API call, KHÔNG có mock data fetch?
- [ ] Đã có Responsive decisions từ Hà (mobile-first, clamp, container queries)?
- [ ] Không dùng `h-screen` (dùng `h-svh`), không desktop-first CSS?
- [ ] Touch targets ≥ 44x44px trên mobile?
- [ ] Đã có A11y considerations (focus, aria, contrast)?
