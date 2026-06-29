# Korean i18n & UI Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs — HowItWorks steps not translating to Korean, TrustSignals showing wrong flags and ISO codes instead of full country names, Link elements showing redundant cursor:pointer, and Guide child pages missing Korean metadata.

**Architecture:** All fixes are in the `ui` project. Bugs 1 and 4 are pure next-intl wiring issues (translations exist in ko.json but are unused). Bug 2 is a data-type mismatch (DB returns ISO codes, `flagcdn.ts` expects country names). Bug 3 is a global CSS override.

**Tech Stack:** Next.js 15 App Router, next-intl, TypeScript, Tailwind CSS v4

---

## File Map

| Action   | Path                                                                      | What changes                                      |
|----------|---------------------------------------------------------------------------|---------------------------------------------------|
| Modify   | `src/components/sections/HowItWorks.tsx`                                  | Read step title/desc from next-intl, not API      |
| Modify   | `src/lib/flagcdn.ts`                                                      | Add `getFlagCdnUrlByCode` + `getCountryNameByCode`|
| Modify   | `src/components/sections/TrustSignals.tsx`                                | Use new flag/name helpers                         |
| Modify   | `src/app/globals.css`                                                     | Remove pointer cursor from `<a>` elements         |
| Modify   | `src/app/(main)/guide/payment-guideline/page.tsx`                         | Add `generateMetadata` with Korean support        |
| Modify   | `src/app/(main)/guide/[slug]/page.tsx`                                    | Fix English-only "not found" fallback in metadata |

---

## Task 1 — Fix HowItWorks steps not translating to Korean

**Root cause:** `HowItWorks.tsx` uses `item.title` and `item.description` returned from the API (`getHowItWorks()`). The API queries DB translations, but Korean DB translations may not exist. Meanwhile, `ko.json` already has the Korean step text at `HomePage.HowItWorks.steps.*` — it's just unused.

**Fix:** Use `getTranslations("HomePage")` directly for step title/description. The API call is kept only for step ordering, icon, and `isActive` flags.

**Files:**
- Modify: `src/components/sections/HowItWorks.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/sections/HowItWorks.tsx` to confirm current state matches what's documented here.

- [ ] **Step 2: Add `getTranslations` import and update component**

Replace the entire file content with:

```tsx
import { ClipboardList, CreditCard, FileText, Mail, ChevronRight } from "lucide-react";
import { getHowItWorks } from "@/lib/api/home.api";
import { getTranslations } from "next-intl/server";

const STEP_ICONS = [ClipboardList, FileText, CreditCard, Mail] as const;

export async function HowItWorks({ data }: { data?: any }) {
    const [steps, t] = await Promise.all([
        getHowItWorks().catch(() => []),
        getTranslations("HomePage"),
    ]);

    return (
        <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="w-full py-16 md:py-20 lg:py-24 border-b border-(--color-border) reveal-on-scroll"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16">
                    <h2
                        id="how-it-works-heading"
                        className="section-title"
                    >
                        {data?.title}
                    </h2>
                    <p className="mt-4 section-desc max-w-150 mx-auto">
                        {data?.desc}
                    </p>
                </div>

                {/* Steps container */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
                    {steps.map((item, index) => {
                        const Icon = STEP_ICONS[index];
                        const isLast = index === steps.length - 1;
                        const stepTitle = t(`HowItWorks.steps.step_${item.step}_title`);
                        const stepDesc = t(`HowItWorks.steps.step_${item.step}_desc`);
                        return (
                            <div
                                key={index}
                                className="flex flex-col lg:flex-row items-center lg:items-stretch flex-1 gap-6"
                            >
                                {/* Card */}
                                <div className="group relative flex flex-col items-center w-full rounded-2xl border border-(--color-border) bg-(--color-bg) p-7 pt-11 text-center transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md dark:dark-glass dark:bg-(--color-bg)/20">
                                    {/* Step number */}
                                    <span
                                        className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle) font-mono text-sm font-extrabold text-(--color-primary) border border-[var(--color-primary)]/10 shadow-xs"
                                        aria-hidden="true"
                                    >
                                        0{item.step}
                                    </span>

                                    {/* Icon */}
                                    <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-(--color-secondary-subtle) text-(--color-secondary) group-hover:scale-110 group-hover:bg-[var(--color-primary-subtle)] group-hover:text-[var(--color-primary)] transition-all duration-300 shadow-sm border border-[var(--color-border)]">
                                        <Icon className="h-6 w-6" aria-hidden="true" />
                                    </div>

                                    <h3 className="section-subtitle !text-base mb-2 group-hover:text-(--color-primary) transition-all">
                                        {stepTitle}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-(--color-text-secondary) font-body">
                                        {stepDesc}
                                    </p>
                                </div>

                                {/* Arrow connector — between cards on desktop */}
                                {!isLast && (
                                    <div
                                        className="hidden lg:flex items-center justify-center shrink-0 text-(--color-primary)"
                                        aria-hidden="true"
                                    >
                                        <ChevronRight className="size-7 stroke-[2.5]" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 3: Verify the ko.json keys exist**

Confirm `src/messages/ko.json` contains all 4 step keys:
```
HomePage.HowItWorks.steps.step_1_title  → "비자 선택"
HomePage.HowItWorks.steps.step_1_desc  → "비자 종류, 처리 속도, 신청자 수를 선택하세요."
HomePage.HowItWorks.steps.step_2_title → "양식 작성"
HomePage.HowItWorks.steps.step_2_desc  → "여권 세부 정보를 입력하고..."
HomePage.HowItWorks.steps.step_3_title → "결제하기"
HomePage.HowItWorks.steps.step_3_desc  → "투명한 가격으로..."
HomePage.HowItWorks.steps.step_4_title → "이메일 수신"
HomePage.HowItWorks.steps.step_4_desc  → "승인된 E-Visa를 이메일로 받아보세요."
```

These are already present at lines 111–120 of `ko.json`. No file change needed.

- [ ] **Step 4: Verify en.json keys exist**

Confirm `src/messages/en.json` has matching keys at `HomePage.HowItWorks.steps.step_1_title` etc. (already present at lines 112–119). No file change needed.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/HowItWorks.tsx
git commit -m "fix: use next-intl for HowItWorks step translations instead of API data"
```

---

## Task 2 — Fix TrustSignals wrong flags and country abbreviations

**Root cause:** `getTestimonials()` in `home.service.ts` returns `country: r.countryCode.toLowerCase()` — a 2-letter ISO code like `"us"`, `"gb"`. But `getFlagCdnUrl(countryName)` in `flagcdn.ts` expects a full name like `"United States"` and looks it up in `COUNTRY_ISO_MAP`. Since `COUNTRY_ISO_MAP["us"]` is `undefined`, it falls back to `"vn"` (Vietnam flag). The display text then shows `"us"` instead of `"United States"`.

**Files:**
- Modify: `src/lib/flagcdn.ts`
- Modify: `src/components/sections/TrustSignals.tsx`

- [ ] **Step 1: Add reverse-lookup utilities to `flagcdn.ts`**

Read `src/lib/flagcdn.ts` (already done), then append after the `getFlagCdnUrl` function:

```typescript
// Reverse map: ISO 2-letter code → full country name
// Derived from COUNTRY_ISO_MAP at build time to avoid duplication.
export const ISO_TO_COUNTRY_NAME: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_ISO_MAP).map(([name, code]) => [code, name])
);

/**
 * Trả về URL cờ quốc gia từ mã ISO 2 ký tự (lowercase hoặc uppercase).
 * Dùng khi dữ liệu từ DB trả về countryCode (ISO) thay vì tên đầy đủ.
 */
export function getFlagCdnUrlByCode(
    isoCode: string,
    width: 40 | 80 | 160 | 320 = 40,
): string {
    const code = isoCode.toLowerCase().trim();
    const validCodes = new Set(Object.values(COUNTRY_ISO_MAP));
    const safeCode = validCodes.has(code) ? code : "vn";
    return `https://flagcdn.com/w${width}/${safeCode}.png`;
}

/**
 * Trả về tên đầy đủ của quốc gia từ mã ISO 2 ký tự.
 * VD: "us" → "United States", "gb" → "United Kingdom"
 */
export function getCountryNameByCode(isoCode: string): string {
    const code = isoCode.toLowerCase().trim();
    return ISO_TO_COUNTRY_NAME[code] ?? isoCode.toUpperCase();
}
```

- [ ] **Step 2: Update `TrustSignals.tsx` imports**

Open `src/components/sections/TrustSignals.tsx`. Change the import line:
```tsx
// Before:
import { getFlagCdnUrl } from "@/lib/flagcdn";

// After:
import { getFlagCdnUrlByCode, getCountryNameByCode } from "@/lib/flagcdn";
```

- [ ] **Step 3: Update flag `<Image>` in `TrustSignals.tsx`**

Find the `<Image>` rendering the flag (lines 151–160):
```tsx
// Before:
<Image
    src={getFlagCdnUrl(
        review.country,
    )}
    alt={review.country}
    width={16}
    height={12}
    unoptimized
    className="w-4 h-3 object-cover rounded-xs shrink-0"
/>
<p className="text-sm text-(--color-text-muted) font-body">
    {review.country}
</p>

// After:
<Image
    src={getFlagCdnUrlByCode(review.country)}
    alt={getCountryNameByCode(review.country)}
    width={16}
    height={12}
    unoptimized
    className="w-4 h-3 object-cover rounded-xs shrink-0"
/>
<p className="text-sm text-(--color-text-muted) font-body">
    {getCountryNameByCode(review.country)}
</p>
```

- [ ] **Step 4: Verify fallback data in `TrustSignals.tsx` also uses ISO codes**

The inline fallback reviews in `TrustSignals.tsx` (lines 22–44) use `country: "US"` and `country: "GB"`. These need to be lowercase ISO codes to match what the DB returns:

```tsx
// Change the 3 fallback reviews to use lowercase ISO codes:
{ id: "1", name: "John Doe",      country: "us", rating: 5, text: "Fast and easy service." },
{ id: "2", name: "Jane Smith",    country: "gb", rating: 5, text: "Highly recommended for Vietnam Visa." },
{ id: "3", name: "David Beckham", country: "gb", rating: 5, text: "Super fast and reliable." },
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors related to the flagcdn changes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/flagcdn.ts src/components/sections/TrustSignals.tsx
git commit -m "fix: use ISO code helpers for TrustSignals flags and country names"
```

---

## Task 3 — Remove pointer cursor from Link elements

**Context:** Browser default for `<a href>` is `cursor: pointer`. The user wants anchor elements to show the default (arrow) cursor, especially on card-style links like the guide page cards.

**Fix:** Add a base CSS rule overriding browser UA stylesheet for `<a>` elements.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append cursor rule to `globals.css`**

Open `src/app/globals.css`. After the last `@utility` block (around line 270, before the dark mode section), add:

```css
/* ── 3.2 Link cursor override ── */
/* TẠI SAO: Để thẻ <a> dùng con trỏ mặc định (mũi tên) thay vì con trỏ tay (pointer).
   Trải nghiệm "app-like" — hover animation đã đủ để báo hiệu tính tương tác. */
a {
    cursor: default;
}
```

> **Note:** If any specific link must restore pointer cursor (e.g., inline text links), add `class="cursor-pointer"` to that element. The utility class wins over this base rule.

- [ ] **Step 2: Verify no regressions in Button `asChild` + Link pattern**

Open `src/components/ui/Button.tsx` — the `buttonVariants` CVA does NOT include `cursor-pointer` in any variant, so adding `cursor: default` to `a` won't conflict. The Button component uses `<button>` (which has UA `cursor: default` already) or `<Slot>` which renders the child's element. When `asChild` with `<Link>`, the rendered `<a>` will now use default cursor. This is the desired behavior.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: override anchor cursor to default (remove browser pointer)"
```

---

## Task 4 — Add Korean metadata to Guide child pages

**Root cause:**
- `/guide/payment-guideline/page.tsx` has **no `generateMetadata`** export at all — browser tab shows the site default title instead of a localized title.
- `/guide/[slug]/page.tsx` has `generateMetadata` but the error fallback `{ title: "Article Not Found" }` is hardcoded English.

**Files:**
- Modify: `src/app/(main)/guide/payment-guideline/page.tsx`
- Modify: `src/app/(main)/guide/[slug]/page.tsx`

### Sub-task 4a: payment-guideline metadata

- [ ] **Step 1: Add `generateMetadata` to payment-guideline page**

Open `src/app/(main)/guide/payment-guideline/page.tsx`. Replace the entire file with:

```tsx
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PaymentGuideline } from "@/components/features/guide/PaymentGuideline"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PaymentGuideline")
  return {
    title: t("heroTitle"),
    description: t("heroSubtitle"),
  }
}

export default function PaymentGuidelinePage() {
  return (
    <div className="font-[family-name:var(--font-inter)]">
      <PaymentGuideline />
    </div>
  )
}
```

**Why this works:**
- `PaymentGuideline` namespace already exists in both `en.json` and `ko.json`
- `ko.json` → `PaymentGuideline.heroTitle` = `"결제 방법"`, `heroSubtitle` = `"비자 신청을 위해..."`
- `en.json` → `PaymentGuideline.heroTitle` = `"Payment Methods"` (or similar)

- [ ] **Step 2: Verify ko.json key exists**

Check that `src/messages/ko.json` has:
```
PaymentGuideline.heroTitle  → "결제 방법"
PaymentGuideline.heroSubtitle → "비자 신청을 위해 안전하고 편리한 결제 옵션을..."
```
These are at lines 1393–1394 of `ko.json`. ✓

### Sub-task 4b: [slug] page error fallback

- [ ] **Step 3: Fix "Article Not Found" fallback in `[slug]/page.tsx`**

Open `src/app/(main)/guide/[slug]/page.tsx`. Replace the `generateMetadata` function:

```tsx
// Before:
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  
  try {
    const article = await getArticle(slug, locale)
    return {
      title: article.title,
      description: article.subtitle,
    }
  } catch (error) {
    return { title: "Article Not Found" }
  }
}

// After:
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("guideSlugPage"),
  ])
  
  try {
    const article = await getArticle(slug, locale)
    return {
      title: article.title,
      description: article.subtitle,
    }
  } catch {
    return { title: t("not_found") }
  }
}
```

Also add `getTranslations` to the import at the top of the file:
```tsx
// Before:
import { getLocale } from "next-intl/server"

// After:
import { getLocale, getTranslations } from "next-intl/server"
```

- [ ] **Step 4: Verify ko.json `guideSlugPage.not_found` key exists**

Check `src/messages/ko.json`:
```
guideSlugPage.not_found → "기사를 찾을 수 없음"
```
Present at line 1093 of `ko.json`. ✓

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(main)/guide/payment-guideline/page.tsx src/app/(main)/guide/[slug]/page.tsx
git commit -m "fix: add Korean metadata to payment-guideline and guide slug pages"
```

---

## Task 5 — Phase Verification (skill @verification-before-completion)

Run the dev server and manually verify all 4 fixes.

- [ ] **Step 1: Start the dev server**

```bash
cd D:\F8_K15_BTVN\FASTVISA\ui
npm run dev
```

- [ ] **Step 2: Switch language to Korean**

Navigate to `http://localhost:3000`. Switch language to Korean (via the language selector in the header). Confirm `NEXT_LOCALE=ko` cookie is set.

- [ ] **Step 3: Verify Bug 1 — HowItWorks Korean steps**

Go to `http://localhost:3000`. Scroll to the "이용 방법" (How It Works) section.

Expected:
- Step 1: **"비자 선택"** / "비자 종류, 처리 속도, 신청자 수를 선택하세요."
- Step 2: **"양식 작성"** / "여권 세부 정보를..."
- Step 3: **"결제하기"** / "투명한 가격으로..."
- Step 4: **"이메일 수신"** / "승인된 E-Visa를..."

Must NOT show English step titles.

- [ ] **Step 4: Verify Bug 2 — TrustSignals flags and country names**

Scroll to the testimonials/trust section on the home page.

Expected:
- Flag images show the CORRECT country flag (US flag for American reviewers, UK flag for British reviewers)
- Country text shows **"United States"** not `"us"`, **"United Kingdom"** not `"gb"`

- [ ] **Step 5: Verify Bug 3 — Link cursor**

Hover over any `<a>` element on the page (navigation links, guide cards, CTA buttons rendered as links).

Expected: The mouse cursor shows **arrow (default)**, not the hand/pointer cursor.

- [ ] **Step 6: Verify Bug 4 — Guide child page titles**

Visit the following URLs while in Korean mode:
- `http://localhost:3000/guide/payment-guideline`
  - Browser tab title: **"결제 방법"** (not English, not site default)
- `http://localhost:3000/guide/extra-services`
  - Browser tab title: Korean article title from API
- `http://localhost:3000/guide/visa-extension`
  - Browser tab title: Korean article title from API

- [ ] **Step 7: Switch back to English and verify no regressions**

Switch to English. Confirm:
- HowItWorks steps show English text ("Choose Visa", "Fill Form", "Make Payment", "Receive via Email")
- TrustSignals still shows correct flags and "United States" / "United Kingdom"
- Guide page titles are in English

- [ ] **Step 8: Final commit if everything passes**

```bash
git add -A
git commit -m "chore: all 4 Korean i18n and UI bug fixes verified"
```
