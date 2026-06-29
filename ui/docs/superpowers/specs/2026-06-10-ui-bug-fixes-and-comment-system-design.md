# Design Spec: UI Bug Fixes & Comment System
**Date:** 2026-06-10  
**Approach:** B — Tách theo độ phức tạp (Track 1 → 2 → 3)

---

## Tổng quan

6 issues được chia thành 3 tracks độc lập:

| Track | Issues | Repos | Độ phức tạp |
|---|---|---|---|
| Track 1 | Header timezone (#1), FeaturedNationalities (#2), Guide pages (#5), Apply page (#6) | UI only | Thấp |
| Track 2 | SmartEligibilityWidget Server Action (#3) | UI only | Trung bình |
| Track 3 | CommentSection persistence (#4) | UI + API | Cao |

---

## Track 1 — UI Bug Fixes

### Issue 1: Header — Tách timezone state khỏi language button

**Root cause:** `selectedRegion` state dùng chung cho cả timezone Combobox lẫn `RegionSelectorButton`. `handleTimezoneChange` gọi `setSelectedRegion(val)` → button ngôn ngữ update sai.

**Fix:**
- Thêm `selectedTimezone` state (default `"vn"`) → chỉ dùng cho Combobox + clock
- Giữ `selectedRegion` chỉ dùng cho `RegionSelectorButton`, khởi tạo từ `useLocale()`:
  - `"vi"` → `"vn"`, `"en"` → `"us"`, `"ko"` → `"kr"`
- `handleTimezoneChange` → chỉ `setSelectedTimezone(val)`
- `handleLanguageChange` → set cả `selectedRegion` + `selectedTimezone` (sync khi đổi ngôn ngữ thật)

**Files:** `src/components/layout/Header.tsx`

---

### Issue 2: FeaturedNationalities — Flag sai + thiếu i18n trong Dialog

**Root cause flag:** `NationalityDialog` truyền `nat.label` (tên đã localize, vd `"Pháp"`) vào `<LazyFlag>`. `getFlagCdnUrl` chỉ map tên tiếng Anh → không tìm thấy → fallback về `"vn"` (cờ Việt Nam).

**Fix flag:** Đổi thành `countryName={nat.name || nat.label}`. `nat.name` luôn là tên tiếng Anh gốc theo `NationalityCard` type.

**Root cause i18n:** `NationalityDialogContent` không dùng `useTranslations`, toàn bộ string hardcode tiếng Anh.

**Fix i18n:**
1. Thêm `"use client"` + `useTranslations("HomePage.FeaturedNationalities.Dialog")` vào `NationalityDialog.tsx`
2. `deriveExemptionInfo` đổi từ trả về full string → trả về `status` key (`"exempted"` | `"evisa_only"` | `"blacklist"`)
3. Dialog render: `t(\`status.${status}.title\`)`, `t(\`status.${status}.description\`, { days })`
4. Thêm translation keys vào `en.json`, `vi.json`, `ko.json` cho namespace `HomePage.FeaturedNationalities.Dialog`

**Strings cần dịch:**
- `title` (dialog header subtitle): `"Vietnam Visa Requirements"`
- `important_requirements`: `"Important Requirements"`
- `close`: `"Close"`
- `apply_now`: `"Apply E-Visa Now"`
- `service_unavailable`: `"Service Unavailable"`
- `passport_validity`: `"Passport valid **6+ months** from arrival."`
- `blank_pages`: `"At least **2 blank pages** for stamps."`
- `apply_early`: `"Apply **3-4 days** before departure."`
- `status.exempted.title` / `status.exempted.description`
- `status.evisa_only.title` / `status.evisa_only.description`
- `status.blacklist.title` / `status.blacklist.description`

**Files:** `NationalityDialog.tsx`, `data.tsx`, `en.json`, `vi.json`, `ko.json`

---

### Issue 5: Guide pages — Bỏ skeleton + thêm Stinger Overlay

**Fix skeleton:** Xóa file `src/app/(main)/guide/[slug]/loading.tsx`. Next.js không còn hiện skeleton khi navigate vào child pages.

**Fix Stinger:** Trong `src/app/(main)/guide/page.tsx`, thay `<Link>` → `<StingerLink>` cho tất cả links dẫn vào:
- `/guide/[slug]` (dynamic articles)
- `/guide/vietnam-visa-fees`
- `/guide/payment-guideline`

**Files:** Xóa `loading.tsx`, sửa `guide/page.tsx`

---

### Issue 6: Apply page — DatePicker placeholder + realtime validation

**Step 1 — DatePicker placeholder:**

`DEFAULT_STEP1.arrival_date = ""` đã đúng. Issue là draft trong localStorage có thể restore ngày cũ.

Fix trong `useStep1Logic.ts`: Khi merge defaultValues với DEFAULT_STEP1, kiểm tra nếu `defaultValues.arrival_date` là ngày trong quá khứ thì clear về `""`:
```ts
arrival_date: defaultValues?.arrival_date && new Date(defaultValues.arrival_date) >= today
  ? defaultValues.arrival_date
  : ""
```

DatePicker đã có `placeholder={t("fields.select_date")}` sẵn — sẽ hiển thị đúng khi value là `""`.

**Step 2 — Realtime validation + debounce + disable autocomplete:**

- Đổi `mode: "onBlur"` → `mode: "onChange"` trong `useStep1Logic.ts` và `Step2ApplicantDetails.tsx`
- Dùng `setTimeout` + `useRef` pattern (consistent với `useApplyPrice.ts`) để debounce 150ms cho `trigger(fieldName)` call — tránh validate liên tục khi gõ nhanh
- Thêm `autoComplete="off"` vào tất cả `<input type="text">` fields trong Step2

**Files:** `useStep1Logic.ts`, `Step2ApplicantDetails.tsx`

---

## Track 2 — SmartEligibilityWidget Refactor

### Issue 3: Đổi Server Action → GET API + debounce

**Root cause:** `fetchExemptionAction` là Next.js Server Action → luôn POST đến URL trang hiện tại. Mỗi hover quốc gia mới = 1 POST request tức thì.

**Fix:**

**Bước 1 — Tạo client-side fetch function:**
```ts
// src/lib/exemption.client.ts
async function fetchExemption(code: string): Promise<ExemptionResult> {
  const res = await fetch(`/api/v1/exemptions/${code}`)
  if (!res.ok) throw new ApiClientError(...)
  return res.json()
}
```

Thay thế toàn bộ `fetchExemptionAction` import trong `SmartEligibilityWidget.tsx`.

**Bước 2 — Thêm debounce 150ms cho prefetch on hover:**

Dùng `useRef<ReturnType<typeof setTimeout>>` pattern (consistent với `useApplyPrice.ts`):
```ts
const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
// trong onHover: clearTimeout(prefetchTimerRef.current); prefetchTimerRef.current = setTimeout(() => prefetchExemption(code), 150)
```

Cache mechanism (`exemptionCache` + `pendingPrefetches`) giữ nguyên.

**Kết quả:** Requests đổi từ `POST /` → `GET /api/v1/exemptions/:code`, đúng ngữ nghĩa HTTP, tận dụng browser cache, không flood requests khi hover nhanh.

**Files:** `SmartEligibilityWidget.tsx`, tạo `src/lib/exemption.client.ts`

---

## Track 3 — Comment System Full-Stack

### Issue 4: CommentSection persistence (API + UI)

#### API Side (`d:\F8_K15_BTVN\FASTVISA\api`)

**1. Prisma Model `Comment`:**
```prisma
model Comment {
  id                String    @id @default(uuid())
  content           String    @db.Text
  authorName        String    @map("author_name")
  authorEmail       String    @map("author_email")
  authorNationality String?   @map("author_nationality")  // ISO 2-char code vd "vn", "fr" — khớp với Nationality.code
  authorToken       String    @map("author_token")        // sha256(email.toLowerCase().trim())
  parentId          String?   @map("parent_id")
  parent            Comment?  @relation("Replies", fields: [parentId], references: [id], onDelete: Cascade)
  replies           Comment[] @relation("Replies")
  helpfulCount      Int       @default(0) @map("helpful_count")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@map("comments")
}
```

**2. Endpoints:**

| Method | Path | Body / Query | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/comments` | `?page&limit` | Flat list, sort `createdAt DESC` |
| `POST` | `/api/v1/comments` | `{ content, authorName, authorEmail, authorNationality?, parentId? }` | Server hash email → `authorToken` |
| `DELETE` | `/api/v1/comments/:id` | `{ authorToken }` | Xoá nếu token match |
| `POST` | `/api/v1/comments/:id/helpful` | — | Increment `helpfulCount` |

**3. Files mới trong API repo:**
- `prisma/schema.prisma` — thêm model `Comment`
- `src/validators/comment.validator.ts` — Zod: content min 1 max 1000, email valid, name min 1 max 100
- `src/services/comment.service.ts` — CRUD + hash logic
- `src/controllers/comment.controller.ts`
- `src/routes/v1/comment.routes.ts`
- `src/routes/index.ts` — mount `/comments`

**Security:** `authorToken = sha256(email.toLowerCase().trim())` — email gốc lưu DB cho admin, token dùng cho client ownership check. Rate limit `POST /comments` để tránh spam.

#### UI Side (`d:\F8_K15_BTVN\FASTVISA\ui`)

**1. Author token flow:**
- Khi user submit comment: hash email bằng `crypto.subtle.digest('SHA-256', email)` (Web Crypto API, không cần lib)
- Lưu `authorToken` vào `localStorage` key `"fastvisa_comment_token"`
- Gửi token khi cần DELETE

**2. Refactor `useCommentSection` hook:**

Thay localStorage CRUD bằng:
- Mount: `GET /api/v1/comments` → build cây từ flat array (group by `parentId`)
- Submit: `POST /api/v1/comments` với **optimistic update** (thêm vào UI ngay, rollback nếu lỗi)
- Delete: `DELETE /api/v1/comments/:id` với **optimistic update** (xoá khỏi UI ngay, rollback nếu lỗi)
- Helpful: `POST /api/v1/comments/:id/helpful` — increment local count ngay

**3. Build tree client-side (giữ nguyên logic hiện tại):**
```
flat list → Map<id, CommentNode> → assign children → filter root (parentId === null)
```
UI rendering 4-level visual cap **giữ nguyên hoàn toàn**.

**4. Files thay đổi trong UI repo:**
- `src/components/sections/comments/hooks/useCommentSection.ts` — refactor
- Tạo `src/lib/comments.client.ts` — API functions

---

## File Change Summary

### UI Repo (`d:\F8_K15_BTVN\FASTVISA\ui`)
| File | Thay đổi |
|---|---|
| `src/components/layout/Header.tsx` | Tách `selectedTimezone` / `selectedRegion` |
| `src/components/sections/nationalities/NationalityDialog.tsx` | Fix flag, thêm i18n |
| `src/components/sections/nationalities/data.tsx` | `deriveExemptionInfo` trả về status key |
| `src/messages/en.json` | Thêm Dialog translation keys |
| `src/messages/vi.json` | Thêm Dialog translation keys |
| `src/messages/ko.json` | Thêm Dialog translation keys |
| `src/app/(main)/guide/[slug]/loading.tsx` | **Xóa** |
| `src/app/(main)/guide/page.tsx` | Link → StingerLink |
| `src/app/apply/_components/hooks/useStep1Logic.ts` | Clear stale arrival_date, mode onChange |
| `src/app/apply/_components/Step2ApplicantDetails.tsx` | mode onChange, debounce, autocomplete off |
| `src/components/sections/SmartEligibilityWidget.tsx` | Thay Server Action, thêm debounce |
| `src/lib/exemption.client.ts` | **Tạo mới** — GET fetch function |
| `src/components/sections/comments/hooks/useCommentSection.ts` | Refactor → API calls |
| `src/lib/comments.client.ts` | **Tạo mới** — comment API functions |

### API Repo (`d:\F8_K15_BTVN\FASTVISA\api`)
| File | Thay đổi |
|---|---|
| `prisma/schema.prisma` | Thêm model `Comment` |
| `src/validators/comment.validator.ts` | **Tạo mới** |
| `src/services/comment.service.ts` | **Tạo mới** |
| `src/controllers/comment.controller.ts` | **Tạo mới** |
| `src/routes/v1/comment.routes.ts` | **Tạo mới** |
| `src/routes/index.ts` | Mount route `/comments` |
