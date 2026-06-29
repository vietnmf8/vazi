# Hardcode Migration — 16 Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove 16 hardcoded values from the UI project by wiring them to the existing API/DB infrastructure across 5 independent operations.

**Architecture:** Operations run in order: cleanups first (no risk), then API fixes, then seeding, then UI wiring. Every component keeps a hardcoded default as fallback — no breakage if API is slow or missing. Blog fetch uses a Suspense-wrapped Server Component wrapper (same pattern as `NationalitiesSection`) to avoid blocking the full page render.

**Tech Stack:** Next.js 15 App Router, next-intl, Express.js + Prisma/MySQL, `"use cache"` + `cacheTag()` for Next.js caching

---

## File Map

| File | Action | Responsible for |
|------|--------|-----------------|
| `api/src/controllers/settings.controller.ts` | Modify | `upsert` support for new keys + fix TAG_MAP |
| `api/src/services/pricing.service.ts` | Modify | Read `PRICING_GROUP_TIERS` from GlobalSetting |
| `ui/src/lib/api/articles.api.ts` | Modify | Add `getBlogPreviews()` with `"use cache"` + `cacheTag("blog-posts")` |
| `ui/src/components/sections/BlogPreviewWrapper.tsx` | **Create** | Server Component: fetch + pass `posts` to BlogPreviewSection |
| `ui/src/app/(main)/page.tsx` | Modify | Add `getAboutUsSettings()`, render BlogPreviewWrapper in Suspense |
| `ui/src/components/sections/TrustSignals.tsx` | Modify | Accept `stats` + `tripadvisorUrl` props |
| `ui/src/components/sections/HeroSection.tsx` | Modify | Accept `heroBgImageUrl` prop |
| `ui/src/components/sections/ReadyToApplyCTA.tsx` | Modify | Accept `readyCtaImageUrl` prop |
| `ui/src/components/sections/BlogPreviewSection.tsx` | Modify | Accept `posts: BlogPost[]` prop |
| `ui/src/app/(main)/about-us/page.tsx` | Modify | Pass `quoteImageUrl` to AboutQuote |
| `ui/src/app/(main)/about-us/_components/AboutQuote.tsx` | Modify | Accept `imageUrl` prop |
| `ui/src/app/(main)/emergency-inquiry/page.tsx` | Modify | Add `getGlobalSettings()`, pass `whatsappEmergency` |
| `ui/src/app/(main)/emergency-inquiry/_components/EmergencyPricing.tsx` | Modify | Accept `whatsappEmergency` prop |
| `ui/src/app/(main)/guide/vietnam-visa-fees/page.tsx` | Modify | Use `baseFees["E_VISA_30_DAYS_SINGLE"]` + `GROUP_DISCOUNT_TIERS` |
| `ui/src/app/(main)/contact-us/page.tsx` | Modify | Delete CONTACT_ITEMS dead code + convert to i18n (atomic) |
| `ui/src/messages/en.json` | Modify | Add `ContactUsPage.UI.*` keys |
| `ui/src/messages/vi.json` | Modify | Add `ContactUsPage.UI.*` keys |

---

## Task 1: ContactUs — dead code cleanup + i18n (Op 4 + Op 5, atomic)

**Files:**
- Modify: `ui/src/app/(main)/contact-us/page.tsx`
- Modify: `ui/src/messages/en.json`
- Modify: `ui/src/messages/vi.json`

- [ ] **Step 1: Add i18n keys to en.json**

In `ui/src/messages/en.json`, find the `"ContactUsPage"` key (or add it if absent) and add a `"UI"` namespace:

```json
"ContactUsPage": {
  "UI": {
    "title": "Contact Us",
    "metaDescription": "Contact FastVisa support for visa application help. Hotline, email, and online contact form.",
    "reachUs": "Reach Us",
    "getInTouch": "Get in Touch",
    "businessHours": "Our team is available Monday–Saturday, 8 AM–10 PM ICT. Emergency support available 24/7 via WhatsApp."
  }
}
```

- [ ] **Step 2: Add i18n keys to vi.json**

In `ui/src/messages/vi.json`, add the same namespace with Vietnamese translations:

```json
"ContactUsPage": {
  "UI": {
    "title": "Liên hệ",
    "metaDescription": "Liên hệ hỗ trợ FastVisa cho đơn xin visa. Hotline, email và biểu mẫu liên hệ trực tuyến.",
    "reachUs": "Liên hệ",
    "getInTouch": "Nhắn tin cho chúng tôi",
    "businessHours": "Đội ngũ hỗ trợ hoạt động Thứ 2–Thứ 7, 8 giờ sáng–10 giờ tối ICT. Hỗ trợ khẩn cấp 24/7 qua WhatsApp."
  }
}
```

- [ ] **Step 3: Rewrite contact-us/page.tsx — delete dead code + apply i18n**

Replace the entire file content of `ui/src/app/(main)/contact-us/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageBanner } from "@/components/layout/PageBanner";
import { ContactForm } from "./_components/ContactForm";
import { getGlobalSettings } from "@/lib/api/global-settings.api";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("ContactUsPage.UI");
    return {
        title: t("title"),
        description: t("metaDescription"),
    };
}

export default async function ContactUsPage() {
    const t = await getTranslations("ContactUsPage.UI");
    const settings = await getGlobalSettings({ isPublic: true }).catch(() => ({} as Record<string, any>));

    const getSetting = (key: string, defaultValue: string) => settings[key] || defaultValue;

    const dynamicContactItems = [
        {
            icon: Phone,
            label: "Hotline",
            value: getSetting("CONTACT_HOTLINE", "+84 93 6699 869"),
            accent: "gold" as const,
        },
        {
            icon: Mail,
            label: "Email",
            value: getSetting("CONTACT_EMAIL", "support@fastvisa.com"),
            accent: "gold" as const,
        },
        {
            icon: MapPin,
            label: "Office",
            value: getSetting("CONTACT_OFFICE", "Hanoi, Vietnam"),
            accent: "gold" as const,
        },
        {
            icon: MessageCircle,
            label: "WhatsApp",
            value: getSetting("CONTACT_WHATSAPP_LABEL", "24/7 Urgent Support"),
            accent: "teal" as const,
            href: getSetting("CONTACT_WHATSAPP_LINK", "https://wa.me/84965800392"),
        },
    ];

    return (
        <div className="min-h-screen">
            <PageBanner
                title={t("title")}
                subtitle={t("businessHours")}
                breadcrumb={[
                    { label: "Home", href: "/" },
                    { label: t("title") },
                ]}
            />

            <div className="max-w-275 mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
                    <aside className="space-y-8 lg:col-span-1">
                        <div>
                            <p className="section-label mb-3">{t("reachUs")}</p>
                            <h2 className="section-subtitle mb-6">
                                {t("getInTouch")}
                            </h2>
                            <p className="body-text-sm">
                                {t("businessHours")}
                            </p>
                        </div>

                        <ul className="space-y-4">
                            {dynamicContactItems.map((item) => {
                                const Icon = item.icon;
                                const iconBg =
                                    item.accent === "teal"
                                        ? "bg-(--color-secondary-subtle)"
                                        : "bg-(--color-primary-subtle)";
                                const iconColor =
                                    item.accent === "teal"
                                        ? "text-(--color-secondary)"
                                        : "text-(--color-primary)";

                                const inner = (
                                    <div className="flex items-start gap-4">
                                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                                            <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-0.5">
                                                {item.label}
                                            </p>
                                            <p className="text-sm font-medium text-(--color-text-primary)">
                                                {item.value}
                                            </p>
                                        </div>
                                    </div>
                                );

                                return (
                                    <li
                                        key={item.label}
                                        className="rounded-xl border border-(--color-border) bg-(--color-surface-2) p-4 hover:border-(--color-border-strong) transition-colors"
                                    >
                                        {item.href ? (
                                            <a href={item.href} target="_blank" rel="noopener noreferrer" className="block">
                                                {inner}
                                            </a>
                                        ) : (
                                            inner
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    <div className="lg:col-span-2">
                        <ContactForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on `contact-us/page.tsx`

- [ ] **Step 5: Commit**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
git add src/app/\(main\)/contact-us/page.tsx src/messages/en.json src/messages/vi.json
git commit -m "refactor(contact-us): remove dead CONTACT_ITEMS, apply i18n to hardcoded strings"
```

---

## Task 2: VietnamVisaFees — fix hardcoded base price (Op 3a)

**Files:**
- Modify: `ui/src/app/(main)/guide/vietnam-visa-fees/page.tsx`

- [ ] **Step 1: Locate and replace the hardcoded $85**

In `vietnam-visa-fees/page.tsx`, the sample price matrix (around line 188–197) hardcodes `rate: 85`. Change it to read from `baseFees` which is already fetched from `getCalculatorConfig()`.

Find these lines:
```ts
{[
    { groupKey: "1_person", count: 1, rate: 85 },
    { groupKey: "2_persons", count: 2, rate: Math.round(85 * 0.93) },
    { groupKey: "3_persons", count: 3, rate: Math.round(85 * 0.93) },
    { groupKey: "4_persons", count: 4, rate: Math.round(85 * 0.88) },
    { groupKey: "6_persons", count: 6, rate: Math.round(85 * 0.82) },
].map((row) => {
```

Replace with (add the `baseEvisa` const just before the table's `section` JSX block, after `const paxDiscountTiers = ...`):
```ts
const baseEvisa = (baseFees["E_VISA_30_DAYS_SINGLE"] as number) ?? 85;
```

Then replace the hardcoded array:
```ts
{[
    { groupKey: "1_person", count: 1, rate: baseEvisa },
    { groupKey: "2_persons", count: 2, rate: Math.round(baseEvisa * 0.93) },
    { groupKey: "3_persons", count: 3, rate: Math.round(baseEvisa * 0.93) },
    { groupKey: "4_persons", count: 4, rate: Math.round(baseEvisa * 0.88) },
    { groupKey: "6_persons", count: 6, rate: Math.round(baseEvisa * 0.82) },
].map((row) => {
    const saved = (baseEvisa - row.rate) * row.count;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
npx tsc --noEmit 2>&1 | grep vietnam-visa-fees
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/guide/vietnam-visa-fees/page.tsx
git commit -m "fix(vietnam-visa-fees): use API base price instead of hardcoded \$85"
```

---

## Task 3: API — Fix settings controller + pricing service (Op 3b, Op 1 prereq)

**Files:**
- Modify: `api/src/controllers/settings.controller.ts`
- Modify: `api/src/services/pricing.service.ts`

This task fixes 3 bugs found in the existing API code:
1. `updateSetting` returns 404 for new keys (uses `update` not `upsert`)
2. `TAG_MAP` missing `PRICING_` prefix → no cache invalidation for pricing settings
3. `SITE_HOME_CONFIG` matches `SITE_` prefix → wrong `"footer"` tag (should be `"home-data"`)

- [ ] **Step 1: Fix settings controller — upsert + TAG_MAP**

In `api/src/controllers/settings.controller.ts`, replace the `updateSetting` function:

```ts
export async function updateSetting(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const adminSecret = req.headers["x-admin-secret"];
    if (!adminSecret || adminSecret !== (process.env.ADMIN_SECRET ?? "dev-secret")) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }

    const key = req.params["key"] as string;
    const { value } = req.body as { value: unknown };

    // upsert: creates the key if it doesn't exist, updates if it does
    const updated = await prisma.globalSetting.upsert({
        where: { key },
        update: { value: value as Prisma.InputJsonValue },
        create: { key, value: value as Prisma.InputJsonValue },
    });

    // On-Demand Revalidation — order matters: more specific prefixes first
    const uiUrl = process.env.UI_BASE_URL;
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (uiUrl && revalidateSecret) {
        const TAG_MAP: Record<string, string> = {
            "SITE_HOME_": "home-data",   // more specific before SITE_
            "HOME_":      "home-data",
            "ABOUT_":     "about-us",
            "PRICING_":   "rules_config",
            "CONFIG_":    "rules_config",
            "FAQ_":       "faqs",
            "GUIDE_":     "guidelines",
            "SITE_":      "footer",      // catch-all for other SITE_ keys
        };
        const tag = Object.entries(TAG_MAP).find(([prefix]) => key.startsWith(prefix))?.[1];
        if (tag) {
            fetch(`${uiUrl}/api/revalidate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tag, secret: revalidateSecret }),
            }).catch(() => {});
        }
    }

    res.success(updated.value);
}
```

- [ ] **Step 2: Fix getAboutUsSettings fallback to include quoteImageUrl**

In the same file, update the fallback object inside `getAboutUsSettings`:

```ts
const fallback = {
    trustStats: [
        { value: "150,000+", labelKey: "applications" },
        { value: "24h", labelKey: "processingTime" },
        { value: "4.9★", labelKey: "rating" },
        { value: "120+", labelKey: "nationalities" }
    ],
    quoteImageUrl: "/6a68e80c-4a58-41cf-970c-a9aec237a542.png",
    whyUs: ["Target", "Shield", "Award", "Users", "Shield"],
    destinations: [
        { id: 1, key: "sapa", img: "/images/about-us/sapa.jpg" },
        { id: 2, key: "hoian", img: "/images/about-us/hoian.jpg" },
        { id: 3, key: "halong", img: "/images/about-us/halong.jpg" },
        { id: 4, key: "danang", img: "/images/about-us/danang.jpg" },
        { id: 5, key: "ninhbinh", img: "/images/about-us/ninhbinh.jpg" },
        { id: 6, key: "phuquoc", img: "/images/about-us/phuquoc.jpg" }
    ],
    missionImages: {
        sapa: "/images/about-us/mission-sapa.jpg",
        hoian: "/images/about-us/mission-hoian.jpg",
        journey: "/images/about-us/mission-journey.jpg"
    }
};
```

- [ ] **Step 3: Add GROUP_DISCOUNT_TIERS to pricing service**

In `api/src/services/pricing.service.ts`, update `getCalculatorConfig` to read `PRICING_GROUP_TIERS` from GlobalSetting:

```ts
export async function getCalculatorConfig(locale: string) {
    const [rules, groupTiersSetting] = await Promise.all([
        prisma.pricingRule.findMany({
            where: { isActive: true },
            include: {
                translations: { where: { languageCode: locale } }
            }
        }),
        prisma.globalSetting.findUnique({ where: { key: "PRICING_GROUP_TIERS" } })
    ]);

    const baseFees: Record<string, number> = {};
    const categoryLabels: Record<string, string> = {};
    const processingOptions: any[] = [];

    rules.forEach(rule => {
        const trans = rule.translations[0];
        if (rule.ruleType === "BASE_FEE") {
            baseFees[rule.key] = Number(rule.price);
            if (trans) categoryLabels[rule.key] = trans.name;
        } else if (rule.ruleType === "PROCESSING_TIME") {
            processingOptions.push({
                value: rule.key,
                label: trans ? trans.name : rule.key,
                caption: trans ? trans.processing : null,
                badge: trans?.features ? (trans.features as any).badge : null,
                note: trans?.features ? (trans.features as any).note : null,
                price: Number(rule.price)
            });
        }
    });

    const FALLBACK_GROUP_TIERS = [
        { label: "1_Person",       multiplier: 1.00, discount: 0  },
        { label: "2_3_Persons",    multiplier: 0.93, discount: 7  },
        { label: "4_5_Persons",    multiplier: 0.88, discount: 12 },
        { label: "6_Plus_Persons", multiplier: 0.82, discount: 18 }
    ];

    return {
        BASE_FEES: baseFees,
        VISA_CATEGORY_LABELS: categoryLabels,
        PROCESSING_OPTIONS: processingOptions,
        GROUP_DISCOUNT_TIERS: (groupTiersSetting?.value as any[]) ?? FALLBACK_GROUP_TIERS,
    };
}
```

- [ ] **Step 4: Build API to verify TypeScript**

```bash
cd d:\F8_K15_BTVN\FASTVISA\api
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Restart API and verify getCalculatorConfig response**

```bash
# In API terminal, restart server, then:
curl "http://localhost:3001/api/v1/pricing/calculator-config?locale=en" | jq '.data | keys'
```

Expected output includes `"GROUP_DISCOUNT_TIERS"`:
```json
["BASE_FEES", "GROUP_DISCOUNT_TIERS", "PROCESSING_OPTIONS", "VISA_CATEGORY_LABELS"]
```

Since `PRICING_GROUP_TIERS` isn't seeded yet, `GROUP_DISCOUNT_TIERS` will use the fallback values — that's correct for now.

- [ ] **Step 6: Commit**

```bash
cd d:\F8_K15_BTVN\FASTVISA\api
git add src/controllers/settings.controller.ts src/services/pricing.service.ts
git commit -m "fix(api): upsert for new GlobalSetting keys, fix TAG_MAP order, add GROUP_DISCOUNT_TIERS to calculator config"
```

---

## Task 4: VietnamVisaFees UI — wire GROUP_DISCOUNT_TIERS (Op 3b)

**Files:**
- Modify: `ui/src/app/(main)/guide/vietnam-visa-fees/page.tsx`

- [ ] **Step 1: Replace hardcoded getPaxDiscountTiers to use API data**

In `vietnam-visa-fees/page.tsx`, replace the hardcoded `getPaxDiscountTiers` function and its usage:

Remove this (around lines 41–46):
```ts
const getPaxDiscountTiers = (t: any) => [
    { label: t("paxTiers.1_Person"), multiplier: 1, discount: 0, Icon: User },
    { label: t("paxTiers.2_3_Persons"), multiplier: 0.93, discount: 7, Icon: Users },
    { label: t("paxTiers.4_5_Persons"), multiplier: 0.88, discount: 12, Icon: UsersRound },
    { label: t("paxTiers.6_Plus_Persons"), multiplier: 0.82, discount: 18, Icon: Building2 },
] as const;
```

Replace with:
```ts
const TIER_ICONS = [User, Users, UsersRound, Building2] as const;

const getPaxDiscountTiers = (t: any, tiers: Array<{ label: string; multiplier: number; discount: number }>) =>
    tiers.map((tier, i) => ({
        label: t(`paxTiers.${tier.label}`),
        multiplier: tier.multiplier,
        discount: tier.discount,
        Icon: TIER_ICONS[i] ?? Building2,
    }));
```

Then update the usage (currently `const paxDiscountTiers = getPaxDiscountTiers(t)`):
```ts
const rawTiers: Array<{ label: string; multiplier: number; discount: number }> =
    config.GROUP_DISCOUNT_TIERS ?? [
        { label: "1_Person", multiplier: 1.00, discount: 0 },
        { label: "2_3_Persons", multiplier: 0.93, discount: 7 },
        { label: "4_5_Persons", multiplier: 0.88, discount: 12 },
        { label: "6_Plus_Persons", multiplier: 0.82, discount: 18 },
    ];
const paxDiscountTiers = getPaxDiscountTiers(t, rawTiers);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
npx tsc --noEmit 2>&1 | grep vietnam-visa-fees
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/guide/vietnam-visa-fees/page.tsx
git commit -m "feat(vietnam-visa-fees): use API GROUP_DISCOUNT_TIERS for pax discount tiers"
```

---

## Task 5: Seed new GlobalSetting keys

**Requires:** API running locally, `ADMIN_SECRET` env var known (check `api/.env` — default is `"dev-secret"`)

- [ ] **Step 1: Seed SITE_HOME_CONFIG (new key)**

```bash
curl -X PUT http://localhost:3001/api/v1/settings/SITE_HOME_CONFIG \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"value": {"heroBgImageUrl": "/vn.jpg", "readyCtaImageUrl": "/images/guide/ready-to-apply-hero.jpg"}}'
```

Expected: `{"success": true, "data": {"heroBgImageUrl": "/vn.jpg", "readyCtaImageUrl": "..."}}`

- [ ] **Step 2: Seed PRICING_GROUP_TIERS (new key)**

```bash
curl -X PUT http://localhost:3001/api/v1/settings/PRICING_GROUP_TIERS \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"value": [{"label":"1_Person","multiplier":1.00,"discount":0},{"label":"2_3_Persons","multiplier":0.93,"discount":7},{"label":"4_5_Persons","multiplier":0.88,"discount":12},{"label":"6_Plus_Persons","multiplier":0.82,"discount":18}]}'
```

Expected: `{"success": true, "data": [...]}`

- [ ] **Step 3: Verify both keys are readable**

```bash
curl "http://localhost:3001/api/v1/settings?key=SITE_HOME_CONFIG" | jq '.data'
curl "http://localhost:3001/api/v1/settings?key=PRICING_GROUP_TIERS" | jq '.data'
```

---

## Task 6: Seed extensions to existing GlobalSetting keys

**⚠️ Must GET first, then merge, then PUT — do not replace.**

- [ ] **Step 1: Get current SITE_CONTACTS value**

```bash
curl "http://localhost:3001/api/v1/settings?key=SITE_CONTACTS" | jq '.data'
```

Note the output. It may have existing fields like `whatsappUrl`, `email`.

- [ ] **Step 2: PUT merged SITE_CONTACTS**

Replace `<EXISTING_JSON>` with the full output from Step 1, adding the 2 new fields:

```bash
curl -X PUT http://localhost:3001/api/v1/settings/SITE_CONTACTS \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"value": {<EXISTING_JSON_FIELDS>, "whatsappEmergency": "https://wa.me/84936699869", "tripadvisorUrl": "https://www.tripadvisor.com/ShowUserReviews-g293924-d24193792-r930256107-Indochina_Sun_Travel-Hanoi.html"}}'
```

- [ ] **Step 3: Get current ABOUT_US value**

```bash
curl "http://localhost:3001/api/v1/settings?key=ABOUT_US" | jq '.data'
```

If it returns a 404 or empty, `ABOUT_US` key doesn't exist in DB (using fallback from controller). In that case, use the full fallback object as the seed value:

```bash
curl -X PUT http://localhost:3001/api/v1/settings/ABOUT_US \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"value": {"trustStats":[{"value":"150,000+","labelKey":"applications"},{"value":"24h","labelKey":"processingTime"},{"value":"4.9★","labelKey":"rating"},{"value":"120+","labelKey":"nationalities"}],"quoteImageUrl":"/6a68e80c-4a58-41cf-970c-a9aec237a542.png","whyUs":["Target","Shield","Award","Users","Shield"],"destinations":[{"id":1,"key":"sapa","img":"/images/about-us/sapa.jpg"},{"id":2,"key":"hoian","img":"/images/about-us/hoian.jpg"},{"id":3,"key":"halong","img":"/images/about-us/halong.jpg"},{"id":4,"key":"danang","img":"/images/about-us/danang.jpg"},{"id":5,"key":"ninhbinh","img":"/images/about-us/ninhbinh.jpg"},{"id":6,"key":"phuquoc","img":"/images/about-us/phuquoc.jpg"}],"missionImages":{"sapa":"/images/about-us/mission-sapa.jpg","hoian":"/images/about-us/mission-hoian.jpg","journey":"/images/about-us/mission-journey.jpg"}}}'
```

If it already exists, GET the current value and merge in `"quoteImageUrl"` before PUT-ing.

- [ ] **Step 4: Verify ABOUT_US has quoteImageUrl**

```bash
curl "http://localhost:3001/api/v1/settings/about-us" | jq '.data.quoteImageUrl'
```

Expected: `"/6a68e80c-4a58-41cf-970c-a9aec237a542.png"`

---

## Task 7: Wire TrustSignals + homepage to pass settings props (Op 1)

**Files:**
- Modify: `ui/src/components/sections/TrustSignals.tsx`
- Modify: `ui/src/app/(main)/page.tsx`

- [ ] **Step 1: Update TrustSignals to accept props**

In `ui/src/components/sections/TrustSignals.tsx`, add the props interface and update the function signature. Replace the hardcoded `stats` array and TripAdvisor URL with the props:

At the top of the file (after imports), add the interface:
```ts
interface TrustSignalsProps {
    stats?: Array<{ value: string; label: string }>;
    tripadvisorUrl?: string;
}
```

Change the function signature:
```ts
export async function TrustSignals({ stats: statsProp, tripadvisorUrl }: TrustSignalsProps = {}) {
```

Replace the hardcoded `stats` array (lines 15–20):
```ts
const t = await getTranslations("HomePage.Trust");

const FALLBACK_STATS = [
    { value: "150,000+", label: t("stat_1") },
    { value: "24h",      label: t("stat_2") },
    { value: "4.9★",     label: t("stat_3") },
    { value: "120+",     label: t("stat_4") },
];

const stats = statsProp?.length
    ? statsProp
    : FALLBACK_STATS;

const resolvedTripadvisorUrl = tripadvisorUrl ?? "https://www.tripadvisor.com/ShowUserReviews-g293924-d24193792-r930256107-Indochina_Sun_Travel-Hanoi.html";
```

In the JSX, replace the hardcoded TripAdvisor `href` (line ~100):
```tsx
href={resolvedTripadvisorUrl}
```

- [ ] **Step 2: Update homepage page.tsx to fetch settings and pass props**

In `ui/src/app/(main)/page.tsx`, add `getAboutUsSettings` import and update the `Promise.all`:

Add to imports:
```ts
import { getAboutUsSettings } from "@/lib/api/about-us.api";
```

Update the data fetching:
```ts
const [ports, rules, contact, aboutSettings] = await Promise.all([
    getPorts(),
    getEligibilityRules(locale),
    getFooterSettings(),
    getAboutUsSettings().catch(() => null),
]);

const trustStats = aboutSettings?.trustStats?.map((s: any) => ({
    value: s.value,
    label: s.labelKey, // TrustSignals will render labels via its own t() calls
})) ?? undefined;
```

Update the `<TrustSignals />` JSX:
```tsx
<TrustSignals
    stats={trustStats}
    tripadvisorUrl={aboutSettings?.tripadvisorUrl ?? contact?.tripadvisorUrl}
/>
```

Wait — `trustStats` from `ABOUT_US` has shape `{ value, labelKey }` but `TrustSignals` expects `{ value, label }` where `label` is already translated. The current `TrustSignals` translates via `t("stat_1")` etc.

Use a different approach: pass only the `value` part and let `TrustSignals` keep its own translated labels:

```ts
// In page.tsx
const trustStatValues = aboutSettings?.trustStats?.map((s: any) => s.value) ?? null;
```

Update TrustSignals props interface to:
```ts
interface TrustSignalsProps {
    statValues?: string[];    // just the 4 dynamic values: "150,000+", "24h", etc.
    tripadvisorUrl?: string;
}
```

Update TrustSignals to merge values with translated labels:
```ts
export async function TrustSignals({ statValues, tripadvisorUrl }: TrustSignalsProps = {}) {
    const t = await getTranslations("HomePage.Trust");
    const apiReviews = await getTestimonials().catch(() => null);

    const defaultValues = ["150,000+", "24h", "4.9★", "120+"];
    const values = statValues ?? defaultValues;

    const stats = [
        { value: values[0] ?? defaultValues[0], label: t("stat_1") },
        { value: values[1] ?? defaultValues[1], label: t("stat_2") },
        { value: values[2] ?? defaultValues[2], label: t("stat_3") },
        { value: values[3] ?? defaultValues[3], label: t("stat_4") },
    ];

    const resolvedTripadvisorUrl = tripadvisorUrl
        ?? "https://www.tripadvisor.com/ShowUserReviews-g293924-d24193792-r930256107-Indochina_Sun_Travel-Hanoi.html";
    // ... rest of component unchanged
```

In `page.tsx`, pass:
```tsx
<TrustSignals
    statValues={aboutSettings?.trustStats?.map((s: any) => s.value)}
    tripadvisorUrl={aboutSettings?.tripadvisorUrl}
/>
```

- [ ] **Step 3: TypeScript check**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
npx tsc --noEmit 2>&1 | grep -E "TrustSignals|page"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/TrustSignals.tsx src/app/\(main\)/page.tsx
git commit -m "feat(trust-signals): accept dynamic stat values + tripadvisorUrl from API"
```

---

## Task 8: Wire HeroSection + ReadyToApplyCTA image props (Op 1)

**Files:**
- Modify: `ui/src/components/sections/HeroSection.tsx`
- Modify: `ui/src/components/sections/ReadyToApplyCTA.tsx`
- Modify: `ui/src/app/(main)/page.tsx`

- [ ] **Step 1: Add heroBgImageUrl prop to HeroSection**

In `HeroSection.tsx`, update the `HeroSectionProps` interface:

```ts
interface HeroSectionProps {
    ports?: PortEntry[];
    rules?: Record<string, EligibilityRuleData>;
    heroBgImageUrl?: string;
}
```

Update the function signature:
```ts
export function HeroSection({ ports, rules, heroBgImageUrl }: HeroSectionProps) {
```

Replace the hardcoded `src="/vn.jpg"` on the `<Image>` component:
```tsx
<Image
    src={heroBgImageUrl ?? "/vn.jpg"}
    alt="Vietnam background"
    fill
    unoptimized
    priority
    className="hidden sm:block object-cover object-center"
/>
```

- [ ] **Step 2: Add readyCtaImageUrl prop to ReadyToApplyCTA**

In `ReadyToApplyCTA.tsx`, update the component:

```ts
interface ReadyToApplyCTAProps {
    readyCtaImageUrl?: string;
}

export function ReadyToApplyCTA({ readyCtaImageUrl }: ReadyToApplyCTAProps = {}) {
```

Replace the hardcoded image `src`:
```tsx
<Image
    src={readyCtaImageUrl ?? "/images/guide/ready-to-apply-hero.jpg"}
    alt=""
    fill
    className="object-cover object-center"
    sizes="(max-width: 768px) 100vw, 1024px"
    loading="lazy"
    aria-hidden="true"
/>
```

- [ ] **Step 3: Pass props from page.tsx**

In `ui/src/app/(main)/page.tsx`, update JSX (the `aboutSettings` fetch was added in Task 7):

```tsx
<HeroSection
    ports={ports}
    rules={rules}
    heroBgImageUrl={aboutSettings?.heroBgImageUrl}
/>
```

Wait — `heroBgImageUrl` is in `SITE_HOME_CONFIG`, not `ABOUT_US`. Need to also fetch `SITE_HOME_CONFIG`.

Add to `page.tsx` imports:
```ts
import { getGlobalSettings } from "@/lib/api/global-settings.api";
```

Update `Promise.all`:
```ts
const [ports, rules, contact, aboutSettings, siteSettings] = await Promise.all([
    getPorts(),
    getEligibilityRules(locale),
    getFooterSettings(),
    getAboutUsSettings().catch(() => null),
    getGlobalSettings({ isPublic: true }).catch(() => ({} as Record<string, any>)),
]);

const homeConfig = (siteSettings["SITE_HOME_CONFIG"] as any) ?? {};
const siteContacts = (siteSettings["SITE_CONTACTS"] as any) ?? {};
```

Update JSX:
```tsx
<HeroSection
    ports={ports}
    rules={rules}
    heroBgImageUrl={homeConfig.heroBgImageUrl}
/>
```

```tsx
<ReadyToApplyCTA readyCtaImageUrl={homeConfig.readyCtaImageUrl} />
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "HeroSection|ReadyToApply|page"
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/HeroSection.tsx src/components/sections/ReadyToApplyCTA.tsx src/app/\(main\)/page.tsx
git commit -m "feat(homepage): hero + CTA images loaded from API SITE_HOME_CONFIG"
```

---

## Task 9: Wire AboutQuote imageUrl (Op 1)

**Files:**
- Modify: `ui/src/app/(main)/about-us/_components/AboutQuote.tsx`
- Modify: `ui/src/app/(main)/about-us/page.tsx`

- [ ] **Step 1: Add imageUrl prop to AboutQuote**

In `AboutQuote.tsx`, add a props interface:

```ts
interface AboutQuoteProps {
    imageUrl?: string;
}

export function AboutQuote({ imageUrl }: AboutQuoteProps = {}) {
```

Replace the hardcoded `src` on the `<Image>` component (line ~39):
```tsx
<Image
    src={imageUrl ?? "/6a68e80c-4a58-41cf-970c-a9aec237a542.png"}
    alt="Team Members"
    fill
    sizes="(max-w-1024px) 100vw, 40vw"
    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
    priority
/>
```

- [ ] **Step 2: Pass quoteImageUrl from about-us/page.tsx**

In `about-us/page.tsx`, `getAboutUsSettings()` is already called. Update the `<AboutQuote />` render:

```tsx
<AboutQuote imageUrl={settings?.quoteImageUrl} />
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "AboutQuote|about-us"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/about-us/_components/AboutQuote.tsx src/app/\(main\)/about-us/page.tsx
git commit -m "feat(about-us): quote image loaded from API ABOUT_US.quoteImageUrl"
```

---

## Task 10: Wire EmergencyPricing WhatsApp (Op 1)

**Files:**
- Modify: `ui/src/app/(main)/emergency-inquiry/page.tsx`
- Modify: `ui/src/app/(main)/emergency-inquiry/_components/EmergencyPricing.tsx`

- [ ] **Step 1: Add whatsappEmergency prop to EmergencyPricing**

In `EmergencyPricing.tsx`, the "last-minute" tier currently has a hardcoded link `"https://wa.me/84936699869"`. Add a prop:

Find the `EmergencyPricing` function signature (currently `{ pricing }`):
```ts
export function EmergencyPricing({
    pricing,
    whatsappEmergency = "https://wa.me/84936699869",
}: {
    pricing?: PricingRule;
    whatsappEmergency?: string;
}) {
```

Find the `EMERGENCY_BASE_TIERS` definition (around line 37) and update the "last-minute" tier:
```ts
{
    id: "last-minute",
    name: t("tier_last_minute_name"),
    price: t("contact_us"),
    timeframe: t("tier_last_minute_timeframe"),
    description: t("tier_last_minute_desc"),
    bestFor: t("tier_last_minute_best"),
    link: whatsappEmergency,
},
```

- [ ] **Step 2: Pass whatsappEmergency from emergency-inquiry/page.tsx**

In `emergency-inquiry/page.tsx`, add the `getGlobalSettings` import and fetch:

```ts
import { getGlobalSettings } from "@/lib/api/global-settings.api";
```

Update `EmergencyInquiryPage`:
```ts
export default async function EmergencyInquiryPage() {
    const t = await getTranslations("EmergencyInquiryPage");
    const [pricing, siteSettings] = await Promise.all([
        getPricing().catch(() => undefined),
        getGlobalSettings({ isPublic: true }).catch(() => ({} as Record<string, any>)),
    ]);

    const siteContacts = (siteSettings["SITE_CONTACTS"] as any) ?? {};
    const whatsappEmergency = siteContacts.whatsappEmergency ?? "https://wa.me/84936699869";
```

Pass to component:
```tsx
<EmergencyPricing pricing={pricing} whatsappEmergency={whatsappEmergency} />
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "EmergencyPricing|emergency-inquiry"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/emergency-inquiry/page.tsx src/app/\(main\)/emergency-inquiry/_components/EmergencyPricing.tsx
git commit -m "feat(emergency): WhatsApp link loaded from API SITE_CONTACTS.whatsappEmergency"
```

---

## Task 11: Update articles.api.ts + add getBlogPreviews (Op 2 prep)

**Files:**
- Modify: `ui/src/lib/api/articles.api.ts`

The `Article` type has these relevant fields: `id`, `slug`, `title`, `subtitle` (not `excerpt`), `image_url`, `category`, `type`. There is no `date` field in the type — use `metadata?.date` if present or empty string.

- [ ] **Step 1: Add getBlogPreviews function**

In `ui/src/lib/api/articles.api.ts`, add a new function after the existing exports:

```ts
export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    image: string;
    date: string;
    category: string;
}

/**
 * Blog posts preview for homepage carousel — 5 most recent BLOG type articles.
 * Uses "use cache" pattern with cacheTag("blog-posts") for on-demand invalidation.
 */
export async function getBlogPreviews(locale?: string): Promise<BlogPost[]> {
    "use cache"
    cacheLife("hours")
    cacheTag("blog-posts")

    const result = await getArticles({ type: "BLOG", limit: 5, locale }).catch(() => ({ items: [] }));
    return result.items.map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.subtitle ?? "",
        image: article.image_url ?? "/images/guide/guide-1.jpg",
        date: (article.metadata as any)?.date ?? "",
        category: (article.metadata as any)?.category ?? article.type,
    }));
}
```

Note: `cacheLife` and `cacheTag` need to be imported — check they're already in the imports at the top of the file. If not, add:
```ts
import { cacheLife, cacheTag } from "next/cache"
```

- [ ] **Step 2: Verify article endpoint returns BLOG type articles**

```bash
curl "http://localhost:3001/api/v1/articles?type=BLOG&limit=5&locale=en" | jq '.data | length'
```

If it returns `0`, the blog posts haven't been seeded yet — that's expected. Continue to Task 12.
If it returns articles, verify the shape: `id`, `slug`, `title`, `subtitle`, `image_url`, `category` are present.

- [ ] **Step 3: TypeScript check**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
npx tsc --noEmit 2>&1 | grep articles.api
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/articles.api.ts
git commit -m "feat(articles-api): add getBlogPreviews with use-cache and blog-posts tag"
```

---

## Task 12: Seed 5 blog posts into Article table (Op 2 prep)

**Requires:** API running, direct DB access via Prisma or articles admin endpoint.

Check whether `POST /api/v1/articles` exists for creating articles:

```bash
curl -X POST http://localhost:3001/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"title":"test","type":"BLOG","slug":"test-blog"}' 2>&1 | head -5
```

If it returns 404 or 405, use the Prisma seed script approach (Step 1b below).

- [ ] **Step 1a: If POST /api/v1/articles exists — seed via API (5 calls)**

```bash
# Post 1: Da Nang
curl -X POST http://localhost:3001/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"title":"Top Attractions in Da Nang","slug":"danang","subtitle":"Discover the best beaches and landmarks in central Vietnam","type":"BLOG","imageUrl":"/images/guide/guide-1.jpg","category":"Travel Guide","metadata":{"date":"Jan 15, 2025","category":"Travel Guide"}}'

# Post 2: Ho Chi Minh City
curl -X POST http://localhost:3001/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"title":"Ho Chi Minh City Travel Guide","slug":"hochiminh","subtitle":"Navigate Saigon like a local with these insider tips","type":"BLOG","imageUrl":"/images/guide/guide-2.jpg","category":"City Guide","metadata":{"date":"Feb 3, 2025","category":"City Guide"}}'

# Post 3: Mountain Passes
curl -X POST http://localhost:3001/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"title":"Vietnam Scenic Mountain Passes","slug":"passes","subtitle":"The most breathtaking mountain roads and passes in Vietnam","type":"BLOG","imageUrl":"/images/guide/guide-3.jpg","category":"Adventure","metadata":{"date":"Mar 10, 2025","category":"Adventure"}}'

# Post 4: Ha Long Bay
curl -X POST http://localhost:3001/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"title":"Ha Long Bay: Complete Visitor Guide","slug":"halong","subtitle":"Everything you need to plan your Ha Long Bay cruise","type":"BLOG","imageUrl":"/images/guide/guide-4.jpg","category":"Nature","metadata":{"date":"Apr 20, 2025","category":"Nature"}}'

# Post 5: Hanoi
curl -X POST http://localhost:3001/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: dev-secret" \
  -d '{"title":"Exploring Hanoi: Old Quarter & Beyond","slug":"hanoi","subtitle":"A walking guide to Hanoi historic streets, temples, and food scene","type":"BLOG","imageUrl":"/images/guide/guide-5.jpg","category":"City Guide","metadata":{"date":"May 5, 2025","category":"City Guide"}}'
```

- [ ] **Step 1b: If POST not available — create seed script in api/**

Create `api/prisma/seed-blog.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const posts = [
        {
            slug: "danang",
            title: "Top Attractions in Da Nang",
            subtitle: "Discover the best beaches and landmarks in central Vietnam",
            type: "BLOG",
            imageUrl: "/images/guide/guide-1.jpg",
            metadata: { date: "Jan 15, 2025", category: "Travel Guide" },
        },
        {
            slug: "hochiminh",
            title: "Ho Chi Minh City Travel Guide",
            subtitle: "Navigate Saigon like a local with these insider tips",
            type: "BLOG",
            imageUrl: "/images/guide/guide-2.jpg",
            metadata: { date: "Feb 3, 2025", category: "City Guide" },
        },
        {
            slug: "passes",
            title: "Vietnam Scenic Mountain Passes",
            subtitle: "The most breathtaking mountain roads and passes in Vietnam",
            type: "BLOG",
            imageUrl: "/images/guide/guide-3.jpg",
            metadata: { date: "Mar 10, 2025", category: "Adventure" },
        },
        {
            slug: "halong",
            title: "Ha Long Bay: Complete Visitor Guide",
            subtitle: "Everything you need to plan your Ha Long Bay cruise",
            type: "BLOG",
            imageUrl: "/images/guide/guide-4.jpg",
            metadata: { date: "Apr 20, 2025", category: "Nature" },
        },
        {
            slug: "hanoi",
            title: "Exploring Hanoi: Old Quarter & Beyond",
            subtitle: "A walking guide to Hanoi historic streets, temples, and food scene",
            type: "BLOG",
            imageUrl: "/images/guide/guide-5.jpg",
            metadata: { date: "May 5, 2025", category: "City Guide" },
        },
    ];

    for (const post of posts) {
        await prisma.article.upsert({
            where: { slug: post.slug },
            update: post,
            create: { ...post, content: "" },
        });
        console.log(`Seeded: ${post.slug}`);
    }

    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Run it:
```bash
cd d:\F8_K15_BTVN\FASTVISA\api
npx ts-node prisma/seed-blog.ts
```

- [ ] **Step 2: Verify 5 blog posts are in the DB**

```bash
curl "http://localhost:3001/api/v1/articles?type=BLOG&limit=5" | jq '.data | length'
```

Expected: `5`

---

## Task 13: Create BlogPreviewWrapper + wire BlogPreviewSection (Op 2)

**Files:**
- Create: `ui/src/components/sections/BlogPreviewWrapper.tsx`
- Modify: `ui/src/components/sections/BlogPreviewSection.tsx`
- Modify: `ui/src/app/(main)/page.tsx`

- [ ] **Step 1: Create BlogPreviewWrapper.tsx**

Create `ui/src/components/sections/BlogPreviewWrapper.tsx`:

```tsx
import { getLocale } from "next-intl/server";
import { getBlogPreviews } from "@/lib/api/articles.api";
import { BlogPreviewSection } from "./BlogPreviewSection";

/**
 * Server Component wrapper: fetches blog posts, passes to the Client carousel.
 * Wrapped in Suspense by page.tsx — slow API does not block the rest of the page.
 */
export async function BlogPreviewWrapper() {
    const locale = await getLocale();
    const posts = await getBlogPreviews(locale).catch(() => []);
    return <BlogPreviewSection posts={posts} />;
}
```

- [ ] **Step 2: Add posts prop to BlogPreviewSection**

In `BlogPreviewSection.tsx`, update the component to accept `posts` prop. Find the `BLOG_POSTS` array definition (lines ~20–25) and update:

Add a `BlogPost` import at the top:
```ts
import type { BlogPost } from "@/lib/api/articles.api";
```

Add a props interface and update the function signature:
```ts
interface BlogPreviewSectionProps {
    posts?: BlogPost[];
}

export function BlogPreviewSection({ posts: postsProp }: BlogPreviewSectionProps = {}) {
```

Keep the existing `BLOG_POSTS` i18n array as a fallback, but only define it when `postsProp` is empty:

```ts
const tData = useTranslations("HomePage.Data.BlogPosts");
const FALLBACK_POSTS: BlogPost[] = [
    { id: "danang", slug: "danang", title: tData("2.title"), excerpt: tData("2.excerpt"), image: "/images/guide/guide-1.jpg", date: tData("2.date"), category: tData("2.category") },
    { id: "hochiminh", slug: "hochiminh", title: tData("3.title"), excerpt: tData("3.excerpt"), image: "/images/guide/guide-2.jpg", date: tData("3.date"), category: tData("3.category") },
    { id: "passes", slug: "passes", title: tData("4.title"), excerpt: tData("4.excerpt"), image: "/images/guide/guide-3.jpg", date: tData("4.date"), category: tData("4.category") },
    { id: "halong", slug: "halong", title: tData("0.title"), excerpt: tData("0.excerpt"), image: "/images/guide/guide-4.jpg", date: tData("0.date"), category: tData("0.category") },
    { id: "hanoi", slug: "hanoi", title: tData("1.title"), excerpt: tData("1.excerpt"), image: "/images/guide/guide-5.jpg", date: tData("1.date"), category: tData("1.category") },
];

const BLOG_POSTS = postsProp && postsProp.length > 0 ? postsProp : FALLBACK_POSTS;
const total = BLOG_POSTS.length;
```

Update the card's link to use `slug` (the current hardcoded version uses `post.id` for routing):
```tsx
<Link
    href={`/guide/${post.slug ?? post.id}`}
    // ...
>
```

- [ ] **Step 3: Replace BlogPreviewSection render in page.tsx with BlogPreviewWrapper in Suspense**

In `ui/src/app/(main)/page.tsx`:

Add import:
```ts
import { BlogPreviewWrapper } from "@/components/sections/BlogPreviewWrapper";
```

Remove the direct `<BlogPreviewSection />` import and usage. Replace with:
```tsx
<Suspense fallback={<SplashHold />}>
    <BlogPreviewWrapper />
</Suspense>
```

Remove `BlogPreviewSection` from the `@/components/sections` import line.

- [ ] **Step 4: Export BlogPreviewWrapper from sections index**

Check if `ui/src/components/sections/index.ts` exists. If yes, add:
```ts
export { BlogPreviewWrapper } from "./BlogPreviewWrapper";
```

- [ ] **Step 5: TypeScript check**

```bash
cd d:\F8_K15_BTVN\FASTVISA\ui
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build, no type errors

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/BlogPreviewWrapper.tsx src/components/sections/BlogPreviewSection.tsx src/app/\(main\)/page.tsx
git commit -m "feat(blog-preview): fetch blog posts from Article API via BlogPreviewWrapper Server Component"
```

---

## Summary

| Task | Operation | Risk | Prereq |
|------|-----------|------|--------|
| 1 | ContactUs cleanup + i18n | None | — |
| 2 | VietnamVisaFees base price fix | None | — |
| 3 | API: settings upsert + TAG_MAP + pricing GROUP_DISCOUNT_TIERS | Low (API change) | — |
| 4 | VietnamVisaFees multipliers wire | None | Task 3 |
| 5 | Seed new GlobalSetting keys | Low (DB write) | Task 3 |
| 6 | Extend existing GlobalSetting keys | Medium (GET→merge→PUT) | Task 3 |
| 7 | TrustSignals + homepage settings | None | Task 6 |
| 8 | HeroSection + ReadyToApplyCTA images | None | Task 6 |
| 9 | AboutQuote image | None | Task 6 |
| 10 | EmergencyPricing WhatsApp | None | Task 6 |
| 11 | articles.api.ts getBlogPreviews | None | — |
| 12 | Seed 5 blog posts | Low (DB write) | Task 11 |
| 13 | BlogPreviewWrapper + wiring | None | Tasks 11, 12 |
