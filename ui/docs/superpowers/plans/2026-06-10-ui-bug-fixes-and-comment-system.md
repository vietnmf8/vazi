# UI Bug Fixes & Comment System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 UI bugs (header timezone/language, flag localisation, guide skeleton, apply form UX) and build a persistent full-stack comment system backed by MySQL.

**Architecture:** Three independent tracks: Track 1 are pure-UI bug fixes (no API), Track 2 replaces a Next.js Server Action with a direct GET fetch + debounce, Track 3 builds the comment CRUD on the Express/Prisma API then refactors the React hook to call it with optimistic updates.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl v4, React Hook Form v7, Zod v4, Express.js, Prisma ORM (MySQL), Web Crypto API.

---

## Track 1 — UI Bug Fixes

---

### Task 1: Header — Tách timezone state khỏi language button

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\layout\Header.tsx`

- [ ] **Step 1: Thêm `useLocale` import và tách state**

Mở [Header.tsx](../../src/components/layout/Header.tsx). Tìm dòng:
```ts
import { useTranslations } from "next-intl";
```
Đổi thành:
```ts
import { useTranslations, useLocale } from "next-intl";
```

- [ ] **Step 2: Thêm locale → region mapping và tách state**

Tìm khối:
```ts
  // Region & Clock state variables
  const [selectedRegion, setSelectedRegion] = useState("vn");
  const [timeStr, setTimeStr] = useState("");
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);

  const offset = REGION_OPTIONS.find(r => r.value === selectedRegion)?.offset || 7;
```
Thay bằng:
```ts
  // Region & Clock state variables
  const locale = useLocale();
  const LOCALE_TO_REGION: Record<string, string> = { vi: "vn", ko: "kr", en: "us" };
  const defaultRegion = LOCALE_TO_REGION[locale] ?? "vn";

  // selectedRegion: dùng cho RegionSelectorButton (ngôn ngữ)
  const [selectedRegion, setSelectedRegion] = useState(defaultRegion);
  // selectedTimezone: dùng cho Combobox + clock (múi giờ hiển thị)
  const [selectedTimezone, setSelectedTimezone] = useState(defaultRegion);
  const [timeStr, setTimeStr] = useState("");
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);

  const offset = REGION_OPTIONS.find(r => r.value === selectedTimezone)?.offset || 7;
```

- [ ] **Step 3: Fix `handleTimezoneChange` — chỉ cập nhật timezone**

Tìm:
```ts
  // Chỉ cập nhật vùng/múi giờ hiển thị, không đổi ngôn ngữ
  const handleTimezoneChange = (val: string) => {
    setSelectedRegion(val);
  };
```
Thay bằng:
```ts
  // Chỉ cập nhật vùng/múi giờ hiển thị, không đổi ngôn ngữ
  const handleTimezoneChange = (val: string) => {
    setSelectedTimezone(val);
  };
```

- [ ] **Step 4: Fix `handleLanguageChange` — cập nhật cả hai state**

Tìm dòng `setSelectedRegion(val);` bên trong `handleLanguageChange` (trong `triggerStinger`):
```ts
        setSelectedRegion(val);
        setIsRegionModalOpen(false);
```
Thay bằng:
```ts
        setSelectedRegion(val);
        setSelectedTimezone(val);
        setIsRegionModalOpen(false);
```

- [ ] **Step 5: Fix Combobox `value` prop — dùng `selectedTimezone`**

Tìm trong JSX:
```tsx
                <Combobox
                  open={isTimezoneOpen}
                  onOpenChange={setIsTimezoneOpen}
                  value={selectedRegion}
                  onValueChange={handleTimezoneChange}
```
Thay `value={selectedRegion}` thành `value={selectedTimezone}`:
```tsx
                <Combobox
                  open={isTimezoneOpen}
                  onOpenChange={setIsTimezoneOpen}
                  value={selectedTimezone}
                  onValueChange={handleTimezoneChange}
```

- [ ] **Step 6: Kiểm tra thủ công**

Khởi động dev server (`npm run dev` trong thư mục `ui`). Mở trang `/`:
1. Language button hiển thị đúng ngôn ngữ hiện tại (VN nếu tiếng Việt, US nếu English).
2. Đổi timezone trong Combobox → clock thay đổi, language button **không** thay đổi.
3. Mở RegionSelectorModal → đổi ngôn ngữ → cả language button lẫn Combobox đều cập nhật đúng.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "fix: tách selectedTimezone khỏi selectedRegion trong Header để timezone Combobox không ảnh hưởng language button"
```

---

### Task 2: NationalityDialog — Fix flag + refactor ExemptionInfo cho i18n

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\nationalities\data.tsx`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\nationalities\NationalityDialog.tsx`

- [ ] **Step 1: Đổi `ExemptionInfo` type và `deriveExemptionInfo` trong `data.tsx`**

Mở [data.tsx](../../src/components/sections/nationalities/data.tsx). Tìm và thay thế toàn bộ đoạn từ `export type ExemptionInfo` đến hết hàm `deriveExemptionInfo`:
```ts
export type ExemptionInfo = {
  status: "blacklist" | "exempt" | "evisa_only"
  exemptionDays: number
}

export function deriveExemptionInfo(group: string, exemptionDays: number): ExemptionInfo {
  if (group === "blacklist") return { status: "blacklist", exemptionDays: 0 }
  if (exemptionDays >= 1) return { status: "exempt", exemptionDays }
  return { status: "evisa_only", exemptionDays: 0 }
}
```

- [ ] **Step 2: Refactor `NationalityDialog.tsx` — thêm "use client", fix flag, thêm i18n**

Mở [NationalityDialog.tsx](../../src/components/sections/nationalities/NationalityDialog.tsx). Thay toàn bộ nội dung file bằng:

```tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { NationalityCard, NationalityGroup } from "./types"
import type { ExemptionInfo } from "./data"
import { LazyFlag } from "./LazyFlag"

export function getDialogThemeClasses(group: NationalityGroup) {
  switch (group) {
    case "good":
      return "bg-[#f4fbf7] border-emerald-500/15 dark:bg-[#081f14] dark:border-emerald-500/25"
    case "normal":
      return "bg-[#fffcf4] border-amber-500/15 dark:bg-[#1c1409] dark:border-amber-500/25"
    case "blacklist":
      return "bg-[#fff5f6] border-rose-500/15 dark:bg-[#200c0e] dark:border-rose-500/25"
  }
}

export interface NationalityDialogContentProps {
  nat: NationalityCard
  exemption: ExemptionInfo
  onClose: () => void
  targetW: number
  targetH: number
}

export function NationalityDialogContent({
  nat,
  exemption,
  onClose,
}: NationalityDialogContentProps) {
  const t = useTranslations("HomePage.FeaturedNationalities.Dialog")

  const colors = React.useMemo(() => {
    switch (nat.group) {
      case "good":
        return {
          boxBg: "bg-emerald-500/8 border-emerald-500/15 dark:bg-emerald-950/20 dark:border-emerald-500/20",
          boxTextTitle: "text-emerald-800 dark:text-emerald-400",
          boxTextDesc: "text-emerald-700/80 dark:text-emerald-300/80",
          boxIcon: "text-[#00b074] dark:text-emerald-400",
          bulletBg: "bg-[#00b074] dark:bg-emerald-500",
          btnApply:
            "bg-[#00b074] hover:bg-[#009b63] text-white font-bold transition-all shadow-sm focus:ring-2 focus:ring-emerald-500/50 cursor-pointer dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:focus:ring-emerald-600/50",
        }
      case "normal":
        return {
          boxBg: "bg-amber-500/8 border-amber-500/15 dark:bg-amber-950/20 dark:border-amber-500/20",
          boxTextTitle: "text-amber-800 dark:text-amber-400",
          boxTextDesc: "text-amber-700/80 dark:text-amber-300/80",
          boxIcon: "text-[#d97706] dark:text-amber-400",
          bulletBg: "bg-[#d97706] dark:bg-amber-500",
          btnApply:
            "bg-[#d97706] hover:bg-[#b45309] text-white font-bold transition-all shadow-sm focus:ring-2 focus:ring-amber-500/50 cursor-pointer dark:bg-amber-700 dark:hover:bg-amber-600 dark:focus:ring-amber-600/50",
        }
      case "blacklist":
        return {
          boxBg: "bg-rose-500/8 border-rose-500/15 dark:bg-rose-950/20 dark:border-rose-500/20",
          boxTextTitle: "text-rose-800 dark:text-rose-400",
          boxTextDesc: "text-rose-700/80 dark:text-rose-300/80",
          boxIcon: "text-[#dc2626] dark:text-rose-400",
          bulletBg: "bg-[#dc2626] dark:bg-rose-500",
          btnApply:
            "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 border border-stone-200 dark:border-stone-700 cursor-not-allowed font-bold",
        }
    }
  }, [nat.group])

  return (
    <div className="w-full h-full flex flex-col p-6 md:p-8 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800/80 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer z-10 border-0 bg-transparent"
        aria-label="Close dialog"
      >
        <X className="size-5" />
      </button>

      {/* Header: Flag + Country name */}
      <div className="flex items-center gap-4 mb-6 border-b border-stone-100 dark:border-stone-800 pb-5 shrink-0">
        <LazyFlag
          countryName={nat.name || nat.label}
          className="w-16 h-16 rounded-full shadow-md border border-stone-200/60 bg-stone-50 dark:border-stone-800 shrink-0"
        />
        <div>
          <h3 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-body tracking-tight leading-none mb-1.5">
            {nat.label}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Visa status box */}
      <div className={cn("flex items-start gap-4 rounded-2xl border p-4.5 mb-6 shrink-0 transition-all", colors.boxBg)}>
        {nat.group === "good" ? (
          <Check className={cn("size-6 shrink-0 mt-0.5", colors.boxIcon)} />
        ) : (
          <AlertCircle className={cn("size-6 shrink-0 mt-0.5", colors.boxIcon)} />
        )}
        <div>
          <h4 className={cn("section-subtitle !text-base mb-1 leading-snug", colors.boxTextTitle)}>
            {t(`status.${exemption.status}.title`, { days: exemption.exemptionDays })}
          </h4>
          <p className={cn("text-[13.5px] leading-relaxed font-body", colors.boxTextDesc)}>
            {t(`status.${exemption.status}.description`, { days: exemption.exemptionDays })}
          </p>
        </div>
      </div>

      {/* Important requirements */}
      <div className="flex-1 min-h-0 mb-6">
        <h5 className="section-label text-stone-400 dark:text-stone-500 mb-4">
          {t("important_requirements")}
        </h5>
        <ul className="text-[13.5px] text-stone-600 dark:text-stone-300 font-body space-y-3">
          <li className="flex items-center gap-3">
            <span className={cn("size-1.5 rounded-full shrink-0", colors.bulletBg)} />
            <span dangerouslySetInnerHTML={{ __html: t("passport_validity") }} />
          </li>
          <li className="flex items-center gap-3">
            <span className={cn("size-1.5 rounded-full shrink-0", colors.bulletBg)} />
            <span dangerouslySetInnerHTML={{ __html: t("blank_pages") }} />
          </li>
          {exemption.status === "evisa_only" && (
            <li className="flex items-center gap-3">
              <span className={cn("size-1.5 rounded-full shrink-0", colors.bulletBg)} />
              <span dangerouslySetInnerHTML={{ __html: t("apply_early") }} />
            </li>
          )}
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800 pt-5 shrink-0 mt-auto w-full">
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-bold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 cursor-pointer font-heading hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors bg-transparent"
        >
          {t("close")}
        </button>
        {nat.group === "blacklist" ? (
          <button
            disabled
            className={cn("w-full sm:w-auto text-center px-6 py-2.5 rounded-full text-sm font-bold font-heading shrink-0 border-0", colors.btnApply)}
          >
            {t("service_unavailable")}
          </button>
        ) : (
          <Link
            href="/apply"
            className={cn(
              "w-full sm:w-auto text-center px-6 py-2.5 rounded-full text-sm font-bold font-heading shrink-0 transition-colors border-0",
              colors.btnApply
            )}
          >
            {t("apply_now")}
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/nationalities/data.tsx src/components/sections/nationalities/NationalityDialog.tsx
git commit -m "fix: NationalityDialog dùng nat.name cho flag và useTranslations cho i18n"
```

---

### Task 3: Translation files — thêm Dialog keys

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\messages\en.json`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\messages\vi.json`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\messages\ko.json`

- [ ] **Step 1: Thêm keys vào `en.json`**

Tìm object `"HomePage"` → `"FeaturedNationalities"` trong `en.json`. Thêm key `"Dialog"` vào cuối object đó:
```json
"Dialog": {
  "subtitle": "Vietnam Visa Requirements",
  "important_requirements": "IMPORTANT REQUIREMENTS",
  "close": "Close",
  "apply_now": "Apply E-Visa Now",
  "service_unavailable": "Service Unavailable",
  "passport_validity": "Passport valid <strong>6+ months</strong> from arrival.",
  "blank_pages": "At least <strong>2 blank pages</strong> for stamps.",
  "apply_early": "Apply <strong>3-4 days</strong> before departure.",
  "status": {
    "exempt": {
      "title": "Visa Exempted (Up to {days} Days)",
      "description": "Great news! Citizens of this country are exempt from Vietnam visa requirements for stays of up to {days} days. You only need a passport valid for at least 6 months with 2 blank pages."
    },
    "evisa_only": {
      "title": "E-Visa Required",
      "description": "Citizens of this country require a valid E-Visa to enter Vietnam. The E-Visa is valid for tourist or business purposes, allowing up to 90 days stay with single or multiple entry."
    },
    "blacklist": {
      "title": "Service Unsupported",
      "description": "We regret to inform you that we currently do not support visa services for citizens of this country. Please contact our support team or the nearest embassy for assistance."
    }
  }
}
```

- [ ] **Step 2: Thêm keys vào `vi.json`**

Tìm object tương tự trong `vi.json`, thêm:
```json
"Dialog": {
  "subtitle": "Yêu cầu Visa Việt Nam",
  "important_requirements": "YÊU CẦU QUAN TRỌNG",
  "close": "Đóng",
  "apply_now": "Đăng ký E-Visa Ngay",
  "service_unavailable": "Dịch vụ không khả dụng",
  "passport_validity": "Hộ chiếu còn hiệu lực <strong>trên 6 tháng</strong> kể từ ngày nhập cảnh.",
  "blank_pages": "Ít nhất <strong>2 trang trắng</strong> để đóng dấu.",
  "apply_early": "Nộp đơn trước <strong>3-4 ngày</strong> trước khi khởi hành.",
  "status": {
    "exempt": {
      "title": "Miễn thị thực (Tối đa {days} ngày)",
      "description": "Tin vui! Công dân nước này được miễn visa Việt Nam cho các chuyến đi tối đa {days} ngày. Bạn chỉ cần hộ chiếu còn hiệu lực ít nhất 6 tháng với 2 trang trắng."
    },
    "evisa_only": {
      "title": "Bắt buộc có E-Visa",
      "description": "Công dân nước này cần E-Visa hợp lệ để nhập cảnh Việt Nam. E-Visa có giá trị cho mục đích du lịch hoặc công việc, cho phép lưu trú tới 90 ngày với một hoặc nhiều lần nhập cảnh."
    },
    "blacklist": {
      "title": "Dịch vụ không hỗ trợ",
      "description": "Rất tiếc, chúng tôi hiện không hỗ trợ dịch vụ visa cho công dân nước này. Vui lòng liên hệ bộ phận hỗ trợ hoặc đại sứ quán gần nhất."
    }
  }
}
```

- [ ] **Step 3: Thêm keys vào `ko.json`**

Tìm object tương tự trong `ko.json`, thêm:
```json
"Dialog": {
  "subtitle": "베트남 비자 요건",
  "important_requirements": "중요 요건",
  "close": "닫기",
  "apply_now": "전자비자 신청하기",
  "service_unavailable": "서비스 불가",
  "passport_validity": "입국일로부터 <strong>6개월 이상</strong> 유효한 여권이 필요합니다.",
  "blank_pages": "도장을 위한 <strong>빈 페이지 2장</strong> 이상 필요합니다.",
  "apply_early": "출발 <strong>3-4일 전</strong>에 신청하세요.",
  "status": {
    "exempt": {
      "title": "비자 면제 (최대 {days}일)",
      "description": "좋은 소식! 이 국가의 시민은 최대 {days}일 체류에 대해 베트남 비자 요건이 면제됩니다. 6개월 이상 유효한 여권과 빈 페이지 2장만 있으면 됩니다."
    },
    "evisa_only": {
      "title": "전자비자 필수",
      "description": "이 국가의 시민은 베트남 입국을 위해 유효한 전자비자가 필요합니다. 전자비자는 관광 또는 비즈니스 목적으로 유효하며, 단수 또는 복수 입국으로 최대 90일 체류가 가능합니다."
    },
    "blacklist": {
      "title": "서비스 미지원",
      "description": "죄송합니다. 현재 이 국가의 시민에 대한 비자 서비스를 지원하지 않습니다. 고객 지원팀이나 가까운 대사관에 문의해 주세요."
    }
  }
}
```

- [ ] **Step 4: Kiểm tra thủ công**

Chạy dev server. Mở trang chủ, chọn ngôn ngữ Tiếng Việt. Click vào một quốc gia trong FeaturedNationalities. Kiểm tra:
1. Cờ hiển thị đúng (không phải cờ Việt Nam cho quốc gia khác).
2. Text trong dialog hiển thị tiếng Việt.

- [ ] **Step 5: Commit**

```bash
git add src/messages/en.json src/messages/vi.json src/messages/ko.json
git commit -m "feat: thêm i18n keys cho NationalityDialog vào 3 locale files"
```

---

### Task 4: Guide pages — Xóa skeleton + thêm StingerLink

**Files:**
- Delete: `d:\F8_K15_BTVN\FASTVISA\ui\src\app\(main)\guide\[slug]\loading.tsx`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\app\(main)\guide\page.tsx`

- [ ] **Step 1: Xóa `loading.tsx`**

```bash
# Chạy trong thư mục ui
rm "src/app/(main)/guide/[slug]/loading.tsx"
```

- [ ] **Step 2: Đổi `Link` → `StingerLink` trong `guide/page.tsx`**

Mở [guide/page.tsx](../../src/app/(main)/guide/page.tsx). Thêm import `StingerLink`:
```tsx
import { StingerLink } from "@/components/stinger/StingerLink"
```

Tìm dòng:
```tsx
import Link from "next/link"
```
Xóa dòng import `Link` này (không còn dùng nữa sau bước dưới).

Tìm trong JSX:
```tsx
              <Link 
                href={item.href} 
                className="group flex flex-col h-full rounded-[2rem] bg-(--color-surface-2) p-8 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl dark:shadow-none dark:hover:shadow-blue-900/10 border border-(--color-border) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)"
              >
```
Thay `<Link` → `<StingerLink` và `</Link>` → `</StingerLink>`:
```tsx
              <StingerLink
                href={item.href}
                className="group flex flex-col h-full rounded-[2rem] bg-(--color-surface-2) p-8 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl dark:shadow-none dark:hover:shadow-blue-900/10 border border-(--color-border) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)"
              >
```

**Lưu ý:** `guide/page.tsx` là Server Component (`async function`). `StingerLink` là Client Component. Đây là pattern hợp lệ — Server Component có thể render Client Component trong JSX.

- [ ] **Step 3: Kiểm tra thủ công**

Mở `/guide`. Click vào một article. Xác nhận:
1. Stinger animation chạy khi chuyển trang.
2. Skeleton loading **không** xuất hiện khi vào `/guide/[slug]`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/guide/page.tsx"
git commit -m "fix: xóa skeleton loading guide [slug], thêm StingerLink cho navigation"
```

---

### Task 5: Apply Step1 — Clear stale arrival_date từ draft

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\app\apply\_components\hooks\useStep1Logic.ts`

- [ ] **Step 1: Thêm guard clear arrival_date cũ**

Mở [useStep1Logic.ts](../../src/app/apply/_components/hooks/useStep1Logic.ts). Tìm:
```ts
    const form = useForm<Step1FormValues>({
        resolver: zodResolver(Step1Form),
        defaultValues: { ...DEFAULT_STEP1, ...defaultValues },
        mode: "onBlur",
    });
```
Thay bằng:
```ts
    // Nếu draft arrival_date là ngày trong quá khứ → clear để DatePicker hiển thị placeholder
    const safeArrivalDate =
        defaultValues?.arrival_date && new Date(defaultValues.arrival_date) >= today
            ? defaultValues.arrival_date
            : "";

    const form = useForm<Step1FormValues>({
        resolver: zodResolver(Step1Form),
        defaultValues: { ...DEFAULT_STEP1, ...defaultValues, arrival_date: safeArrivalDate },
        mode: "onChange",
    });
```

**Lưu ý:** `today` đã được khai báo ngay trên trong hook: `const today = useMemo(() => startOfDay(new Date()), [])`.

- [ ] **Step 2: Kiểm tra thủ công**

Mở `/apply`. Xác nhận DatePicker field "Arrival Date" hiển thị placeholder "Chọn ngày nhập cảnh..." thay vì một ngày cụ thể.

- [ ] **Step 3: Commit**

```bash
git add src/app/apply/_components/hooks/useStep1Logic.ts
git commit -m "fix: clear stale arrival_date từ draft khi là ngày quá khứ, chuyển mode sang onChange"
```

---

### Task 6: Apply Step2 — Realtime validation + debounce + autocomplete off

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\app\apply\_components\Step2ApplicantDetails.tsx`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\app\apply\_components\ApplicantCard.tsx`

- [ ] **Step 1: Đổi mode sang `onChange` trong `Step2ApplicantDetails.tsx`**

Mở [Step2ApplicantDetails.tsx](../../src/app/apply/_components/Step2ApplicantDetails.tsx). Tìm:
```ts
        mode: "onBlur",
```
Thay bằng:
```ts
        mode: "onChange",
```

- [ ] **Step 2: Thêm `autoComplete="off"` và debounce trigger vào `ApplicantCard.tsx`**

Mở [ApplicantCard.tsx](../../src/app/apply/_components/ApplicantCard.tsx). Thêm import `useRef` nếu chưa có (đã có `useState`):
```ts
import { useState, useRef } from "react";
```

Thêm prop `trigger` vào `ApplicantCardProps` interface:
```ts
import type { UseFormTrigger } from "react-hook-form";

interface ApplicantCardProps {
    // ... existing props ...
    trigger: UseFormTrigger<Step2FormValues>;
}
```

Trong body component `ApplicantCard`, ngay sau dòng khai báo `t` và `tStep2`, thêm:
```ts
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedTrigger = (fieldName: `applicants.${number}.${string}`) => {
        clearTimeout(debounceTimerRef.current!);
        debounceTimerRef.current = setTimeout(() => {
            void trigger(fieldName);
        }, 150);
    };
```

Cho field `full_name`, tìm:
```tsx
                                <Input
                                    id={`applicants-${index}-full_name`}
                                    placeholder={t("full_name_placeholder")}
                                    error={Boolean(applicantErrors?.full_name)}
                                    {...register(`applicants.${index}.full_name`)}
                                />
```
Thay bằng:
```tsx
                                <Input
                                    id={`applicants-${index}-full_name`}
                                    placeholder={t("full_name_placeholder")}
                                    error={Boolean(applicantErrors?.full_name)}
                                    autoComplete="off"
                                    {...register(`applicants.${index}.full_name`, {
                                        onChange: () => debouncedTrigger(`applicants.${index}.full_name`),
                                    })}
                                />
```

Cho field `passport_number`, tìm:
```tsx
                                <Input
                                    id={`applicants-${index}-passport_number`}
                                    placeholder={t("passport_number_placeholder")}
                                    error={Boolean(applicantErrors?.passport_number)}
                                    {...register(`applicants.${index}.passport_number`)}
                                />
```
Thay bằng:
```tsx
                                <Input
                                    id={`applicants-${index}-passport_number`}
                                    placeholder={t("passport_number_placeholder")}
                                    error={Boolean(applicantErrors?.passport_number)}
                                    autoComplete="off"
                                    {...register(`applicants.${index}.passport_number`, {
                                        onChange: () => debouncedTrigger(`applicants.${index}.passport_number`),
                                    })}
                                />
```

- [ ] **Step 3: Thêm `autoComplete="off"` vào email và phone trong `Step2ApplicantDetails.tsx`**

Tìm field email:
```tsx
                            <Input
                                id="email"
                                type="email"
                                placeholder={t("email_placeholder")}
                                error={Boolean(errors.email)}
                                {...register("email")}
                            />
```
Thêm `autoComplete="off"`:
```tsx
                            <Input
                                id="email"
                                type="email"
                                placeholder={t("email_placeholder")}
                                error={Boolean(errors.email)}
                                autoComplete="off"
                                {...register("email")}
                            />
```

Tìm field phone:
```tsx
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                error={Boolean(errors.phone)}
                                {...register("phone")}
                            />
```
Thêm `autoComplete="off"`:
```tsx
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                error={Boolean(errors.phone)}
                                autoComplete="off"
                                {...register("phone")}
                            />
```

- [ ] **Step 4: Truyền `trigger` từ `Step2ApplicantDetails.tsx` vào `ApplicantCard`**

Trong `Step2ApplicantDetails.tsx`, tìm dòng khai báo `trigger` từ useForm:
```ts
    const {
        control,
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitted },
    } = useForm<Step2FormValues>({
```
Thêm `trigger` vào destructuring:
```ts
    const {
        control,
        register,
        handleSubmit,
        setValue,
        trigger,
        formState: { errors, isSubmitted },
    } = useForm<Step2FormValues>({
```

Tìm nơi render `<ApplicantCard`:
```tsx
                <ApplicantCard
                    key={index}
                    index={index}
                    control={control}
                    register={register}
                    setValue={setValue}
                    applicantErrors={errors.applicants?.[index]}
                    vipEnabled={vipOrBasicEnabled}
                    nationalities={nationalities}
                    useNationalitySelect={useNationalitySelect}
                    today={today}
                    minBirthDate={minBirthDate}
                    applicantCount={step1.applicant_count}
                />
```
Thêm prop `trigger`:
```tsx
                <ApplicantCard
                    key={index}
                    index={index}
                    control={control}
                    register={register}
                    setValue={setValue}
                    trigger={trigger}
                    applicantErrors={errors.applicants?.[index]}
                    vipEnabled={vipOrBasicEnabled}
                    nationalities={nationalities}
                    useNationalitySelect={useNationalitySelect}
                    today={today}
                    minBirthDate={minBirthDate}
                    applicantCount={step1.applicant_count}
                />
```

- [ ] **Step 5: Kiểm tra thủ công**

Mở `/apply`, tiến vào Step 2. Gõ vào field Full Name:
1. Lỗi validation xuất hiện ngay khi gõ (không cần blur).
2. Browser không gợi ý autocomplete.
3. Gõ đủ → validation success hiển thị.

- [ ] **Step 6: Commit**

```bash
git add src/app/apply/_components/Step2ApplicantDetails.tsx src/app/apply/_components/ApplicantCard.tsx
git commit -m "fix: Step2 chuyển mode onChange + debounce trigger 150ms + autoComplete off"
```

---

## Track 2 — SmartEligibilityWidget

---

### Task 7: Tạo `exemption.client.ts`

**Files:**
- Create: `d:\F8_K15_BTVN\FASTVISA\ui\src\lib\exemption.client.ts`

- [ ] **Step 1: Tạo file**

```ts
import { apiClient, ApiClientError } from "@/lib/api-client"
import type { ExemptionResult } from "@/types/api"

/**
 * GET /api/v1/exemptions/:country_code
 * Thay thế fetchExemptionAction (Server Action POST) bằng GET trực tiếp.
 * Tận dụng HTTP cache của browser, đúng ngữ nghĩa.
 */
export async function fetchExemption(countryCode: string): Promise<ExemptionResult> {
  return apiClient.get<ExemptionResult>(`/api/v1/exemptions/${countryCode.toUpperCase()}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/exemption.client.ts
git commit -m "feat: tạo exemption.client.ts thay thế Server Action bằng GET /api/v1/exemptions/:code"
```

---

### Task 8: SmartEligibilityWidget — thay Server Action + thêm debounce

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\SmartEligibilityWidget.tsx`

- [ ] **Step 1: Thay import**

Tìm:
```ts
import { fetchExemptionAction } from "@/lib/actions/exemption.action";
```
Thay bằng:
```ts
import { fetchExemption } from "@/lib/exemption.client";
```

- [ ] **Step 2: Thêm `prefetchTimerRef` và debounce logic**

Tìm dòng khai báo `pendingPrefetches`:
```ts
    const pendingPrefetches = useRef(new Set<string>());
```
Thêm ngay sau:
```ts
    const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 3: Đổi `prefetchExemption` — dùng `fetchExemption` + debounce**

Tìm:
```ts
    const prefetchExemption = useCallback(async (code: string) => {
        if (!code) return;
        if (exemptionCache.current.has(code)) return;
        if (pendingPrefetches.current.has(code)) return;
        pendingPrefetches.current.add(code);
        try {
            const detail = await fetchExemptionAction(code);
            exemptionCache.current.set(code, detail);
        } catch {
            // silent — lỗi prefetch không gây ảnh hưởng đến luồng chính
        } finally {
            pendingPrefetches.current.delete(code);
        }
    }, []);
```
Thay bằng:
```ts
    const prefetchExemption = useCallback((code: string) => {
        clearTimeout(prefetchTimerRef.current!);
        prefetchTimerRef.current = setTimeout(async () => {
            if (!code) return;
            if (exemptionCache.current.has(code)) return;
            if (pendingPrefetches.current.has(code)) return;
            pendingPrefetches.current.add(code);
            try {
                const detail = await fetchExemption(code);
                exemptionCache.current.set(code, detail);
            } catch {
                // silent — lỗi prefetch không gây ảnh hưởng đến luồng chính
            } finally {
                pendingPrefetches.current.delete(code);
            }
        }, 150);
    }, []);
```

- [ ] **Step 4: Đổi `handleNationalityChange` — dùng `fetchExemption`**

Tìm:
```ts
            const detail = await fetchExemptionAction(code);
```
Thay bằng:
```ts
            const detail = await fetchExemption(code);
```

- [ ] **Step 5: Kiểm tra trong Network tab**

Mở `/` trong browser, mở DevTools → Network. Mở dropdown quốc tịch trong SmartEligibilityWidget. Di chuột nhanh qua nhiều quốc gia. Xác nhận:
1. Requests là `GET` đến `/api/v1/exemptions/XX`, **không phải** `POST /`.
2. Hover nhanh không bắn quá nhiều requests (debounce 150ms hoạt động).

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/SmartEligibilityWidget.tsx
git commit -m "fix: SmartEligibilityWidget đổi Server Action thành GET API + debounce 150ms on hover"
```

---

## Track 3 — Comment System Full-Stack

---

### Task 9: Prisma Schema — thêm model `Comment`

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\api\prisma\schema.prisma`

- [ ] **Step 1: Thêm model `Comment` vào schema**

Mở [schema.prisma](../../../api/prisma/schema.prisma). Thêm ở cuối file:

```prisma
/// Bình luận công khai — hỗ trợ nested replies qua self-referential parentId
model Comment {
  id                String    @id @default(uuid()) @db.VarChar(36)
  content           String    @db.Text
  authorName        String    @map("author_name") @db.VarChar(100)
  authorEmail       String    @map("author_email") @db.VarChar(255)
  authorNationality String?   @map("author_nationality") @db.VarChar(2)
  authorToken       String    @map("author_token") @db.VarChar(64)
  parentId          String?   @map("parent_id") @db.VarChar(36)
  parent            Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies           Comment[] @relation("CommentReplies")
  helpfulCount      Int       @default(0) @map("helpful_count")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@index([parentId])
  @@index([authorToken])
  @@map("comments")
}
```

- [ ] **Step 2: Chạy migration**

```bash
# Chạy trong thư mục api
npx prisma migrate dev --name add_comments
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(api): thêm model Comment với self-referential replies vào Prisma schema"
```

---

### Task 10: API — Validator + Service + Controller + Routes

**Files:**
- Create: `d:\F8_K15_BTVN\FASTVISA\api\src\validators\comment.validator.ts`
- Create: `d:\F8_K15_BTVN\FASTVISA\api\src\services\comment.service.ts`
- Create: `d:\F8_K15_BTVN\FASTVISA\api\src\controllers\comment.controller.ts`
- Create: `d:\F8_K15_BTVN\FASTVISA\api\src\routes\v1\comment.routes.ts`
- Modify: `d:\F8_K15_BTVN\FASTVISA\api\src\routes\index.ts`

- [ ] **Step 1: Tạo `comment.validator.ts`**

```ts
import { z } from "zod";

export const createCommentSchema = z.object({
    body: z.object({
        content: z.string().trim().min(1).max(1000),
        authorName: z.string().trim().min(1).max(100),
        authorEmail: z.string().trim().email(),
        authorNationality: z.string().trim().length(2).optional(),
        parentId: z.string().uuid().optional(),
    }),
});

export const deleteCommentSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ authorToken: z.string().min(1) }),
});

export const helpfulCommentSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>["body"];
export type DeleteCommentDto = z.infer<typeof deleteCommentSchema>;
```

- [ ] **Step 2: Tạo `comment.service.ts`**

```ts
import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/utils/errors";

function hashEmail(email: string): string {
    return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export async function getComments() {
    return prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            content: true,
            authorName: true,
            authorNationality: true,
            authorToken: true,
            parentId: true,
            helpfulCount: true,
            createdAt: true,
        },
    });
}

export async function createComment(data: {
    content: string;
    authorName: string;
    authorEmail: string;
    authorNationality?: string;
    parentId?: string;
}) {
    if (data.parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
        if (!parent) throw new NotFoundError("errors.comment_parent_not_found");
    }

    return prisma.comment.create({
        data: {
            content: data.content,
            authorName: data.authorName,
            authorEmail: data.authorEmail,
            authorNationality: data.authorNationality ?? null,
            authorToken: hashEmail(data.authorEmail),
            parentId: data.parentId ?? null,
        },
        select: {
            id: true,
            content: true,
            authorName: true,
            authorNationality: true,
            authorToken: true,
            parentId: true,
            helpfulCount: true,
            createdAt: true,
        },
    });
}

export async function deleteComment(id: string, authorToken: string) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundError("errors.comment_not_found");
    if (comment.authorToken !== authorToken) throw new ForbiddenError("errors.comment_forbidden");
    await prisma.comment.delete({ where: { id } });
}

export async function incrementHelpful(id: string) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundError("errors.comment_not_found");
    return prisma.comment.update({
        where: { id },
        data: { helpfulCount: { increment: 1 } },
        select: { id: true, helpfulCount: true },
    });
}
```

**Lưu ý:** `ForbiddenError` có thể chưa tồn tại trong `@/utils/errors`. Kiểm tra file đó. Nếu chưa có, thêm:
```ts
export class ForbiddenError extends AppError {
  constructor(message = "errors.forbidden") {
    super(message, 403);
  }
}
```

- [ ] **Step 3: Tạo `comment.controller.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import * as commentService from "@/services/comment.service";
import type { CreateCommentDto } from "@/validators/comment.validator";

export async function getComments(_req: Request, res: Response, _next: NextFunction) {
    const data = await commentService.getComments();
    res.success(data);
}

export async function createComment(req: Request, res: Response, _next: NextFunction) {
    const body = req.body as CreateCommentDto;
    const comment = await commentService.createComment(body);
    res.success(comment, 201);
}

export async function deleteComment(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const { authorToken } = req.body as { authorToken: string };
    await commentService.deleteComment(id, authorToken);
    res.success(null, 204);
}

export async function helpfulComment(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const data = await commentService.incrementHelpful(id);
    res.success(data);
}
```

- [ ] **Step 4: Tạo `comment.routes.ts`**

```ts
import { Router } from "express";
import * as commentController from "@/controllers/comment.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    createCommentSchema,
    deleteCommentSchema,
    helpfulCommentSchema,
} from "@/validators/comment.validator";

const router = Router();

router.get("/", asyncHandler(commentController.getComments));

router.post(
    "/",
    validate(createCommentSchema, "body"),
    asyncHandler(commentController.createComment),
);

router.delete(
    "/:id",
    validate(deleteCommentSchema, "params"),
    asyncHandler(commentController.deleteComment),
);

router.post(
    "/:id/helpful",
    validate(helpfulCommentSchema, "params"),
    asyncHandler(commentController.helpfulComment),
);

export default router;
```

- [ ] **Step 5: Mount route trong `routes/index.ts`**

Mở [routes/index.ts](../../../api/src/routes/index.ts). Thêm import:
```ts
import commentRoutes from "@/routes/v1/comment.routes";
```
Thêm mount sau `reviewsRoutes`:
```ts
apiV1.use("/comments", commentRoutes);
```

- [ ] **Step 6: Test API thủ công**

```bash
# Khởi động API
npm run dev

# Test GET
curl http://localhost:3001/api/v1/comments
# Expected: { "data": [] }

# Test POST
curl -X POST http://localhost:3001/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello","authorName":"Tester","authorEmail":"test@example.com","authorNationality":"vn"}'
# Expected: 201 với comment object

# Test DELETE (dùng authorToken từ sha256 của email)
# authorToken của "test@example.com" = sha256("test@example.com")
```

- [ ] **Step 7: Commit**

```bash
git add src/validators/comment.validator.ts src/services/comment.service.ts src/controllers/comment.controller.ts src/routes/v1/comment.routes.ts src/routes/index.ts
git commit -m "feat(api): thêm CRUD endpoints cho Comment system (GET, POST, DELETE, helpful)"
```

---

### Task 11: UI — Tạo `comments.client.ts`

**Files:**
- Create: `d:\F8_K15_BTVN\FASTVISA\ui\src\lib\comments.client.ts`

- [ ] **Step 1: Tạo file**

```ts
import { apiClient } from "@/lib/api-client"

export interface ApiComment {
  id: string
  content: string
  authorName: string
  authorNationality: string | null
  authorToken: string
  parentId: string | null
  helpfulCount: number
  createdAt: string
}

export interface CreateCommentPayload {
  content: string
  authorName: string
  authorEmail: string
  authorNationality?: string
  parentId?: string
}

export const commentsClient = {
  getAll(): Promise<ApiComment[]> {
    return apiClient.get<ApiComment[]>("/api/v1/comments")
  },

  create(payload: CreateCommentPayload): Promise<ApiComment> {
    return apiClient.post<ApiComment>("/api/v1/comments", payload)
  },

  delete(id: string, authorToken: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/comments/${id}`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorToken }),
    } as any)
  },

  helpful(id: string): Promise<{ id: string; helpfulCount: number }> {
    return apiClient.post(`/api/v1/comments/${id}/helpful`)
  },
}

/** Hash email client-side bằng Web Crypto API (không cần thư viện) */
export async function hashEmailToToken(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const encoded = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const TOKEN_KEY = "fastvisa_comment_token"

export function getStoredAuthorToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function storeAuthorToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}
```

**Lưu ý:** `apiClient.delete` hiện tại không nhận body. Cần kiểm tra `api-client.ts`. Nếu `delete` không hỗ trợ body, thay bằng `request` function hoặc dùng `apiClient.post` với method override. Cách đơn giản nhất: dùng `fetch` trực tiếp cho delete endpoint.

Thay hàm `delete` trong `commentsClient` thành:
```ts
  async delete(id: string, authorToken: string): Promise<void> {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    const res = await fetch(`${BASE_URL}/api/v1/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorToken }),
      credentials: "include",
    })
    if (!res.ok) throw new Error("Delete failed")
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/comments.client.ts
git commit -m "feat: tạo comments.client.ts với CRUD API functions và hashEmailToToken"
```

---

### Task 12: UI — Refactor `useCommentSection` hook

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\comments\hooks\useCommentSection.ts`

- [ ] **Step 1: Thêm helper `buildCommentTree` + thêm imports API**

Mở [useCommentSection.ts](../../src/components/sections/comments/hooks/useCommentSection.ts).

Thêm vào đầu file (sau existing imports):
```ts
import { commentsClient, hashEmailToToken, getStoredAuthorToken, storeAuthorToken, type ApiComment } from "@/lib/comments.client"
```

Thêm helper function `buildCommentTree` sau phần imports:
```ts
function buildCommentTree(flat: ApiComment[]): Comment[] {
  const map = new Map<string, Comment>()
  for (const c of flat) {
    map.set(c.id, {
      id: c.id,
      ownerId: undefined,
      authorName: c.authorName,
      authorType: "guest",
      nationality: c.authorNationality ?? undefined,
      countryCode: c.authorNationality ?? undefined,
      date: new Date(c.createdAt).toLocaleDateString(),
      content: c.content,
      helpfulCount: c.helpfulCount,
      hasVoted: false,
      replies: [],
    })
  }
  const roots: Comment[] = []
  for (const c of flat) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies = map.get(c.parentId)!.replies ?? []
      map.get(c.parentId)!.replies!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}
```

- [ ] **Step 2: Thay `useState(initialComments)` bằng fetch từ API**

Tìm:
```ts
export function useCommentSection(initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
```
Thay bằng:
```ts
export function useCommentSection() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    commentsClient.getAll().then((flat) => {
      if (!cancelled) {
        setComments(buildCommentTree(flat));
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
```

**Lưu ý:** Cần thêm `isLoading` vào return object ở cuối hook.

- [ ] **Step 3: Thay `handleAddQuestion` — gọi API với optimistic update**

Tìm `handleAddQuestion` function. Thay toàn bộ function:
```ts
  const handleAddQuestion = async (data: {
    qfullname: string;
    qemail: string;
    qmessage: string;
    qnationality: string;
    qimages?: string[];
  }) => {
    const token = await hashEmailToToken(data.qemail);
    storeAuthorToken(token);
    localStorage.setItem("comment_email", data.qemail);
    localStorage.setItem("comment_name", data.qfullname);
    localStorage.setItem("comment_nationality", data.qnationality);

    // Optimistic: thêm ngay vào UI
    const tempId = `temp_${crypto.randomUUID()}`;
    const optimistic: Comment = {
      id: tempId,
      ownerId: token,
      authorName: data.qfullname,
      authorType: "guest",
      nationality: data.qnationality,
      date: "Just now",
      content: data.qmessage,
      helpfulCount: 0,
      replies: [],
    };
    setComments((prev) => [optimistic, ...prev]);

    try {
      const created = await commentsClient.create({
        content: data.qmessage,
        authorName: data.qfullname,
        authorEmail: data.qemail,
        authorNationality: data.qnationality.length === 2 ? data.qnationality : undefined,
      });
      // Replace temp với real ID
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId
            ? { ...c, id: created.id, helpfulCount: 0 }
            : c
        )
      );
    } catch {
      // Rollback nếu lỗi
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  };
```

- [ ] **Step 4: Thay `realHandleDelete` — gọi API với optimistic update**

Tìm `realHandleDelete`:
```ts
  const realHandleDelete = (id: string) => {
    setComments((prev) => deleteCommentRecursive(prev, id));
  };
```
Thay bằng:
```ts
  const realHandleDelete = async (id: string) => {
    const token = getStoredAuthorToken();
    if (!token) return;

    // Snapshot để rollback
    const snapshot = comments;
    setComments((prev) => deleteCommentRecursive(prev, id));

    try {
      await commentsClient.delete(id, token);
    } catch {
      // Rollback
      setComments(snapshot);
    }
  };
```

- [ ] **Step 5: Thay `handleHelpful` — gọi API**

Tìm `handleHelpful`:
```ts
  const handleHelpful = (
    id: string,
    currentlyVoted: boolean,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const btnElement = e.currentTarget;
    if (!currentlyVoted) {
      triggerConfettiBurst(btnElement, e);
    }
    setComments((prevComments) => helpfulCommentRecursive(prevComments, id));
  };
```
Thay bằng:
```ts
  const handleHelpful = (
    id: string,
    currentlyVoted: boolean,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const btnElement = e.currentTarget;
    if (!currentlyVoted) {
      triggerConfettiBurst(btnElement, e);
    }
    setComments((prevComments) => helpfulCommentRecursive(prevComments, id));
    void commentsClient.helpful(id);
  };
```

- [ ] **Step 6: Thêm `isLoading` vào return object**

Tìm `return {` ở cuối hook. Thêm `isLoading` vào object trả về:
```ts
  return {
    comments,
    isLoading,
    // ... existing returns
  };
```

- [ ] **Step 7: Cập nhật nơi gọi `useCommentSection`**

Tìm file gọi `useCommentSection(initialComments)` (thường là `CommentSection.tsx`). Đổi thành `useCommentSection()` — bỏ tham số. Nếu có render comments, thêm loading state nếu cần.

- [ ] **Step 8: Kiểm tra thủ công**

1. Mở trang chủ, cuộn đến CommentSection.
2. Đăng một comment mới → comment xuất hiện ngay (optimistic).
3. Refresh trang → comment vẫn còn (không mất).
4. Xóa comment → biến mất ngay, không quay lại sau refresh.

- [ ] **Step 9: Commit**

```bash
git add src/components/sections/comments/hooks/useCommentSection.ts src/lib/comments.client.ts
git commit -m "feat: refactor useCommentSection → API-backed comments với optimistic updates"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Header: timezone không ảnh hưởng language button | Task 1 |
| FeaturedNationalities: flag đúng quốc gia | Task 2 |
| FeaturedNationalities: i18n trong Dialog | Task 2 + 3 |
| Guide: bỏ skeleton child pages | Task 4 |
| Guide: StingerLink cho navigation | Task 4 |
| Apply Step1: DatePicker placeholder thay stale date | Task 5 |
| Apply Step2: realtime validation + debounce | Task 6 |
| Apply Step2: autoComplete off | Task 6 |
| SmartEligibilityWidget: GET API thay POST Server Action | Task 7 + 8 |
| SmartEligibilityWidget: debounce prefetch hover | Task 8 |
| Comment: Prisma model với infinite nesting | Task 9 |
| Comment: CRUD API endpoints | Task 10 |
| Comment: UI API client | Task 11 |
| Comment: persist qua refresh | Task 12 |
| Comment: optimistic updates | Task 12 |
