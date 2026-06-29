# Design: Migrate 16 Hardcoded Items to Dynamic API Data

**Date:** 2026-06-11  
**Scope:** UI project — wire remaining hardcoded content to existing API/DB infrastructure  
**Approach:** Targeted migration by content type (Approach B)  
**Repos touched:** `ui/`, `api/`  
**No new DB models. No Admin UI. No new routes (except one config field extension).**

---

## Context

An audit of the UI project identified 16 hardcoded items that should be admin-managed.
The 11-phase mock data migration is complete. These 16 items are the remaining gaps.

The existing infrastructure already handles all necessary patterns:
- `GlobalSetting` key-value JSON store for config/media/contact data
- `Article` model + `GET /api/v1/articles` for blog content
- `getCalculatorConfig()` for pricing data
- Cache invalidation webhook: `PUT /api/v1/settings/:key` → `POST {UI_BASE_URL}/api/revalidate`

---

## Operations

### Op 1 — Extend GlobalSettings

**Items resolved:** Stats values × 4, hero bg image, CTA bg image, quote image, emergency WhatsApp, TripAdvisor URL

#### GlobalSetting keys

| Key | Action | New fields |
|-----|--------|------------|
| `ABOUT_US` | Extend existing | `quoteImageUrl: string` |
| `SITE_HOME_CONFIG` | Create new | `heroBgImageUrl: string`, `readyCtaImageUrl: string` |
| `SITE_CONTACTS` | Extend existing | `whatsappEmergency: string`, `tripadvisorUrl: string` |

**Stats** (`TrustSignals`): `ABOUT_US.trustStats` already exists as fallback in the controller.  
⚠️ Semantic note: `trustStats` lives inside `ABOUT_US` but is consumed by the homepage `TrustSignals` section. This coupling is intentional — the same numbers appear on both pages. Implementers must know that editing `ABOUT_US` in a future admin panel also updates homepage stats. Document this in the controller comment when wiring.

`AboutStats` (about-us page) is currently commented out — skip.

#### API changes
Seeding mechanism: `PUT /api/v1/settings/:key` with `ADMIN_SECRET` header (existing auth pattern, no schema changes needed).

**⚠️ Merge risk for existing keys**: `PUT` on `SITE_CONTACTS` and `ABOUT_US` must NOT replace the full JSON — it must merge. Seeding script must:
1. `GET /api/v1/settings?key=SITE_CONTACTS` → read current value
2. Merge new fields into existing object
3. `PUT /api/v1/settings/SITE_CONTACTS` with merged payload

If the controller already does a full replace (not merge), the script must handle the GET→merge→PUT cycle explicitly. Verify controller behavior before running seed.

```
# New key — safe to PUT directly
PUT /api/v1/settings/SITE_HOME_CONFIG   { "heroBgImageUrl": "/vn.jpg", "readyCtaImageUrl": "/images/guide/ready-to-apply-hero.jpg" }

# Existing keys — must merge, not replace
GET /api/v1/settings/SITE_CONTACTS → merge → PUT { ...current, "whatsappEmergency": "https://wa.me/84936699869", "tripadvisorUrl": "https://www.tripadvisor.com/..." }
GET /api/v1/settings/ABOUT_US     → merge → PUT { ...current, "quoteImageUrl": "/6a68e80c-4a58-41cf-970c-a9aec237a542.png" }
```
- Verify `GET /api/v1/settings/about-us` returns `trustStats` array in response

#### UI changes

| Component | Change |
|-----------|--------|
| `app/(main)/page.tsx` | Add `getAboutUsSettings()` to `Promise.all`; pass `trustStats`, `heroBgImageUrl`, `readyCtaImageUrl` as props |
| `TrustSignals.tsx` | Accept `stats: StatItem[]` and `tripadvisorUrl: string` props; remove inline hardcoded arrays |
| `HeroSection.tsx` | Accept `heroBgImageUrl?: string` prop; fallback to `/vn.jpg` |
| `ReadyToApplyCTA.tsx` | Accept `readyCtaImageUrl?: string` prop; fallback to current path |
| `about-us/page.tsx` | Already calls `getAboutUsSettings()`; pass `settings.quoteImageUrl` down to `AboutQuote` |
| `AboutQuote.tsx` | Accept `imageUrl?: string` prop; fallback to current UUID path |
| `app/(main)/emergency-inquiry/page.tsx` | **Verify first**: check if page already calls `getGlobalSettings()`. If not, add the call and pass `settings.SITE_CONTACTS?.whatsappEmergency` to `EmergencyPricing` |
| `EmergencyPricing.tsx` | Accept `whatsappEmergency?: string` prop for last-minute tier link |

**Fallback rule (all components):** If API returns `undefined`/empty, use current hardcoded value as default prop. No visible breakage during rollout.

---

### Op 2 — BlogPreviewSection → Article model

**Items resolved:** 5 blog posts (title, excerpt, date, category, thumbnail)

#### API changes
1. Verify `GET /api/v1/articles?type=BLOG&limit=5&locale={locale}` returns:
   ```json
   [{ "id", "slug", "title", "excerpt", "imageUrl", "publishedAt", "category" }]
   ```
2. One-time seed: Insert 5 current i18n blog posts into `Article` table with `type = "BLOG"`

#### UI changes
`BlogPreviewSection` must remain a Client Component (uses `useState`, `useEffect`, framer-motion drag). Use the same Server-wrapper pattern as `NationalitiesSection`:

1. **Create `BlogPreviewWrapper.tsx`** — async Server Component that calls `getArticles({ type: "BLOG", limit: 5 })` and passes `posts` to `BlogPreviewSection`. Wrap it in `<Suspense fallback={<SplashHold />}>` in `page.tsx`.  
   ⚠️ Do NOT add blog fetch to `page.tsx` Promise.all — that would make a slow blog API delay the entire page's initial render.
2. **`articles.api.ts`** — `getArticles()` function must apply `"use cache"`, `cacheTag("blog-posts")`, `cacheLife("minutes")` inside the function body (same pattern as `global-settings.api.ts`). `cacheTag` must be called inside a `"use cache"` scope — it does NOT work if called in a plain Server Component.
3. **`BlogPreviewSection.tsx`** — add `posts: BlogPost[]` prop; remove internal `BLOG_POSTS` i18n array
4. Keep all `t()` calls for UI labels (section title, "Drag to browse", "Read more") — only post data comes from API
5. Remove `tData("0.title")` ... `tData("4.category")` i18n keys after wiring is confirmed working

#### Article API field mapping
The `Article` model uses `subtitle` (not `excerpt`). The API response must map: `subtitle → excerpt` either in the controller/service or the UI client function. Decide and commit to one place — do not let the mismatch leak into the component.

---

### Op 3 — VietnamVisaFees pricing fix

**Items resolved:** Hardcoded base price `$85`, group discount multipliers `0.93 / 0.88 / 0.82`

#### API changes
1. Seed a new `GlobalSetting` key `PRICING_GROUP_TIERS` via `PUT /api/v1/settings/PRICING_GROUP_TIERS`:
```json
[
  { "label": "1_Person",       "multiplier": 1.00, "discount": 0  },
  { "label": "2_3_Persons",    "multiplier": 0.93, "discount": 7  },
  { "label": "4_5_Persons",    "multiplier": 0.88, "discount": 12 },
  { "label": "6_Plus_Persons", "multiplier": 0.82, "discount": 18 }
]
```
2. Calculator config controller: read `GlobalSetting['PRICING_GROUP_TIERS']` and include it as `GROUP_DISCOUNT_TIERS` in the `getCalculatorConfig()` API response. This way the tiers are admin-editable from day one.

#### UI changes (`guide/vietnam-visa-fees/page.tsx`)
1. **Base price fix (1 line):**
   ```ts
   // Before
   { count: 1, rate: 85 }
   // After
   const baseEvisa = baseFees["E_VISA_30_DAYS_SINGLE"] ?? 85
   { count: 1, rate: baseEvisa }
   ```
2. **Multipliers fix:**
   ```ts
   const discountTiers = config.GROUP_DISCOUNT_TIERS ?? FALLBACK_TIERS
   const getPaxDiscountTiers = (t: any) =>
     discountTiers.map(tier => ({ ...tier, label: t(`paxTiers.${tier.label}`) }))
   ```
3. Fallback constant `FALLBACK_TIERS` defined locally with current hardcoded values.

---

### Op 4 — ContactUs copy → i18n

**Items resolved:** Page title, metadata description, section label "Reach Us", section title "Get in Touch", business hours text

#### i18n changes
Add to `messages/en.json` and `messages/vi.json` under `ContactUsPage.UI`:
```json
{
  "ContactUsPage": {
    "UI": {
      "title": "Contact Us",
      "metaDescription": "Contact FastVisa support for visa application help...",
      "reachUs": "Reach Us",
      "getInTouch": "Get in Touch",
      "businessHours": "Our team is available Monday–Saturday, 8 AM–10 PM ICT. Emergency support available 24/7 via WhatsApp."
    }
  }
}
```

#### UI changes (`contact-us/page.tsx`)
- **Metadata export signature change required**: `export const metadata: Metadata = {...}` (static) → `export async function generateMetadata(): Promise<Metadata>` (async). Next.js requires the async function form for dynamic translations.
- `generateMetadata()` → `getTranslations("ContactUsPage.UI")` for `title` and `description`
- JSX → `getTranslations("ContactUsPage.UI")` for `reachUs`, `getInTouch`, `businessHours`

**Op 4 + Op 5 must be done atomically** — both modify `contact-us/page.tsx`. Do not split across separate PRs.

---

### Op 5 — Dead code cleanup

**Items resolved:** Unused `CONTACT_ITEMS` array

**Change:** Delete lines 13–39 in `contact-us/page.tsx` (`CONTACT_ITEMS` const). Not referenced anywhere — `dynamicContactItems` (built from `getGlobalSettings()`) is the active implementation.

---

## Data Flow

```
Seed script / admin (future)
  → PUT /api/v1/settings/:key  (auth required)
  → DB update (GlobalSetting / Article)
  → POST {UI_BASE_URL}/api/revalidate  (webhook, existing)
  → UI cache tag invalidated
  → Next request serves fresh data
```

For blog posts specifically:
```
PUT/POST /api/v1/articles  (future admin CMS)
  → DB update (Article + ArticleTranslation)
  → POST {UI_BASE_URL}/api/revalidate?tag=blog-posts
  → BlogPreviewSection cache cleared
```

---

## Error Handling

Every API call in UI uses `.catch(() => fallback)` pattern (already established in codebase):
```ts
const settings = await getAboutUsSettings().catch(() => ({}))
const stats = settings.trustStats ?? FALLBACK_STATS
```

No component should crash if API is unavailable — always degrade to current hardcoded value.

---

## Execution Order

Operations are fully independent. Recommended order for minimal risk:

```
1. Op 5  — Dead code (zero risk, immediate)
2. Op 4  — i18n copy (zero risk, UI only)
3. Op 3  — Pricing fix (1 line bug fix + API field)
4. Op 1  — GlobalSettings (seed first, then wire UI)
5. Op 2  — Blog (seed Article table first, then wire component)
```

Op 1 and Op 2 require seeding before UI switch — **seed API first, deploy UI change second**.

---

## Out of Scope

- Admin UI for managing these settings (future sprint)
- `AboutStats` component (currently commented out in `about-us/page.tsx`)
- `EmergencyNoticeBanner` default prop values (functionally overridden by `getFooterSettings()` — STATIC-OK)
- TripAdvisor logo image URL (external CDN asset — STATIC-OK)
- `COUNTRIES` list in `comments/constants.tsx` (UI utility, not content — STATIC-OK)

---

## Files Changed (Summary)

### `api/`
- Seed script (GET→merge→PUT) — `SITE_HOME_CONFIG` (new), `PRICING_GROUP_TIERS` (new), `SITE_CONTACTS` (extend), `ABOUT_US` (extend)
- Calculator config controller — read `PRICING_GROUP_TIERS` from `GlobalSetting`, expose as `GROUP_DISCOUNT_TIERS` in response; add `null` fallback
- Articles controller/service — verify `type=BLOG` filter works; confirm `subtitle` field is mapped to `excerpt` in response

### `ui/`
- `src/app/(main)/page.tsx`
- `src/components/sections/TrustSignals.tsx`
- `src/components/sections/HeroSection.tsx`
- `src/components/sections/ReadyToApplyCTA.tsx`
- `src/components/sections/BlogPreviewSection.tsx`
- `src/components/sections/BlogPreviewWrapper.tsx` *(new Server Component wrapper)*
- `src/lib/api/articles.api.ts` *(add `"use cache"` + `cacheTag("blog-posts")`)*
- `src/app/(main)/about-us/page.tsx`
- `src/app/(main)/about-us/_components/AboutQuote.tsx`
- `src/app/(main)/emergency-inquiry/page.tsx`
- `src/app/(main)/emergency-inquiry/_components/EmergencyPricing.tsx`
- `src/app/(main)/guide/vietnam-visa-fees/page.tsx`
- `src/app/(main)/contact-us/page.tsx` *(Op 4 + Op 5 together)*
- `src/messages/en.json`
- `src/messages/vi.json`

**Total: ~3 API files, ~15 UI files**
