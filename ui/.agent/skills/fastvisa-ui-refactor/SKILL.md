---
name: fastvisa-ui-refactor
description: >
  Hướng dẫn refactor codebase FASTVISA UI (Next.js App Router, TypeScript) theo 8 nguyên tắc
  Clean Code từ business/refactor.md. Áp dụng khi: tách component khổng lồ, di chuyển API
  logic vào lib/api, tạo custom hook, chuẩn hóa types/enums, hoặc review code bất kỳ file nào
  trong src/ của dự án ui.
---

# FASTVISA UI — Skill Refactor (Clean Code)

## Mục tiêu

Refactor codebase `ui/src` theo 8 nguyên tắc từ `business/refactor.md`, **gắn chặt với cấu trúc
thực tế** của dự án FASTVISA. Mỗi nguyên tắc đều có ví dụ thực từ codebase.

---

## Cấu trúc thư mục chuẩn (tham chiếu)

```
ui/src/
├── app/
│   ├── (main)/              # Routes: /, /how-to-apply, /faqs, /guide, /about-us…
│   │   ├── layout.tsx       # Server Component layout cho nhóm (main)
│   │   └── [route]/page.tsx
│   ├── apply/               # Multi-step form (Client-heavy)
│   │   ├── page.tsx         # Orchestrator — chỉ wires state + handlers
│   │   ├── _components/     # Co-located: Step1, Step2, Step3, schemas, draft storage
│   │   └── [id]/            # Application detail / resume
│   └── layout.tsx           # Root layout (Provider, fonts, metadata)
│
├── components/
│   ├── ui/                  # Base UI: Typography, Button, Input, Badge… (Shadcn-style)
│   ├── features/            # Business feature components: FloatingTOC, chat/…
│   ├── sections/            # Page sections: HeroSection, PricingPreview, QuickApplyForm…
│   ├── layout/              # Header, Footer, PageBanner, SubPageSidebar…
│   ├── forms/               # Reusable form field wrappers
│   └── providers/           # Context providers (React Query, Theme…)
│
├── hooks/                   # Custom hooks: useChat, useInView, useMeasureHeight…
├── lib/
│   ├── api/                 # API functions nhóm theo domain:
│   │   ├── application.api.ts
│   │   ├── chat.api.ts
│   │   ├── payment.api.ts
│   │   ├── pricing.api.ts
│   │   ├── support.api.ts
│   │   └── upload.api.ts
│   ├── api-client.ts        # HTTP client với retry logic (chỉ GET retry)
│   ├── enum-mappers.ts      # Map UI enum values ↔ API enum values
│   ├── constants/           # nationalities.ts, …
│   ├── utils.ts             # cn() — chỉ global utility ở đây
│   └── flagcdn.ts / image.ts / mock-page-data.ts
│
└── types/
    └── api.ts               # TẤT CẢ types API toàn app ở đây
```

---

## Nguyên tắc 1 — Tách biệt Configuration

**Quy tắc:** Không hardcode biến môi trường hay hằng số rải rác.

**Trong FASTVISA:**
- `NEXT_PUBLIC_API_URL` → chỉ đọc trong `src/lib/api-client.ts` (line 9)
- `NEXT_PUBLIC_SOKETI_*` → chỉ đọc qua hàm `getSoketiConfig()` trong `src/hooks/useChat.ts`
- Storage keys (localStorage/sessionStorage) → khai báo là `const` ở đầu file, **không** inline string

**Checklist khi refactor:**
- [ ] Tìm tất cả string `process.env.NEXT_PUBLIC_*` trong component → di chuyển vào `lib/` hoặc đầu file dưới dạng const
- [ ] Tìm string magic (`"fastvisa_chat_session"`, `"evisa-gate-seen"`…) → đặt `const KEY = "..."` trên cùng file
- [ ] Hằng số dùng nhiều file → `src/lib/constants/`

---

## Nguyên tắc 2 — Tách biệt Data Fetching & API Logic

**Quy tắc:** Component không gọi `fetch`/`apiClient` trực tiếp.

**Pattern đúng trong FASTVISA:**
```
UI Component → hook (optional) → lib/api/[domain].api.ts → api-client.ts
```

**Ví dụ chuẩn:**
```typescript
// src/lib/api/application.api.ts
const BASE_PATH = "/api/v1/applications"

export async function calculatePrice(req: CalculatePriceRequest): Promise<PriceBreakdown> {
  const res = await apiClient.post<ApiResponse<PriceBreakdown>>(`${BASE_PATH}/calculate-price`, req)
  return res.data // unwrap envelope ở đây, không để component làm
}
```

**Checklist khi refactor:**
- [ ] Tìm `fetch(`, `axios.`, `apiClient.` bên trong JSX/TSX component → tách ra `lib/api/`
- [ ] API function đặt đúng domain file: application → `application.api.ts`, chat → `chat.api.ts`
- [ ] Client-side fetching phức tạp (loading/error state) → bọc trong custom hook ở `src/hooks/`
- [ ] Luôn unwrap `.data` của `ApiResponse<T>` **trong** API function, không để component unwrap

---

## Nguyên tắc 3 — Tách biệt Business Logic (Custom Hooks)

**Quy tắc:** Component chỉ render. Logic phức tạp vào hook.

**Ví dụ chuẩn — `src/hooks/useChat.ts`:**
- 788 dòng logic: Pusher WebSocket, localStorage, retry, streaming SSE, upload
- Component `ChatWidget` chỉ gọi `useChat()` và render kết quả
- Hook export `UseChatReturn` interface rõ ràng

**Pattern tạo hook mới:**
```typescript
// src/hooks/useApplyMasterData.ts
export interface UseApplyMasterDataReturn {
  ports: Port[]
  nationalities: Nationality[]
  isLoading: boolean
  error: string | null
}

export function useApplyMasterData(): UseApplyMasterDataReturn {
  // ... loading logic hiện đang nằm trong apply/page.tsx
}
```

**Checklist khi refactor:**
- [ ] Nếu component có `useState` + `useEffect` + API call → cân nhắc tách hook
- [ ] Hook đặt ở `src/hooks/use[Feature].ts` (camelCase, prefix `use`)
- [ ] Export interface return type (`Use[Name]Return`) để dễ mock trong test
- [ ] Không `useCallback` thủ công trừ khi cần (React Compiler đã bật)

---

## Nguyên tắc 4 — Phân loại Utils vs Helpers

**Quy tắc:**
- Global utils → `src/lib/utils.ts` (chỉ có `cn()` hiện tại)
- Feature-specific helpers → colocation trong thư mục feature

**Ví dụ co-location đúng trong FASTVISA:**
```
apply/_components/
├── applyDraftStorage.ts   # Chỉ dùng cho apply flow
├── applySchemas.ts        # Zod schemas cho apply form
├── priceCalculator.ts     # Tính giá offline (fallback)
└── scrollToFirstError.ts  # Chỉ dùng trong apply form
```

**Checklist khi refactor:**
- [ ] Helper dùng ở nhiều feature → `src/lib/` với tên module rõ ràng
- [ ] Helper chỉ dùng trong 1 route/feature → đặt trong `_components/` của route đó
- [ ] `enum-mappers.ts` là cầu nối UI enum ↔ API enum — không thêm logic nghiệp vụ vào đây

---

## Nguyên tắc 5 — Composition over Monolith (Component Design)

**Quy tắc:** Không viết component >300 dòng. Parent = layout + state orchestrator.

**Ví dụ pattern đúng — `apply/page.tsx` (337 dòng):**
```tsx
// apply/page.tsx — chỉ orchestrate state và render layout
export default function ApplyPage() {
  // State + handlers
  const [currentStep, setCurrentStep] = useState(1)
  const { ports, nationalities, isLoading } = useApplyMasterData() // hook

  return (
    <>
      <EntryGateModal ... />
      <ApplicationStepper currentStep={currentStep} />
      {currentStep === 1 && <Step1VisaOptions ... />}  {/* leaf Client Component */}
      {currentStep === 2 && <Step2ApplicantDetails ... />}
      {currentStep === 3 && <Step3ReviewPayment ... />}
    </>
  )
}
```

**Quy tắc Server vs Client:**
- **Server Component mặc định** — layouts, pages fetch dữ liệu, static sections
- `'use client'` **chỉ khi** cần: hooks, event handlers, browser APIs, animation
- Đẩy `'use client'` xuống **leaf node** — ví dụ `Step1VisaOptions` là client, `apply/page.tsx` có thể là server nếu tách hook ra

**Checklist khi refactor:**
- [ ] File >300 dòng → tách thành sub-components
- [ ] `'use client'` ở đầu page không cần thiết → kiểm tra có thể dùng Server Component không
- [ ] Section hiển thị tĩnh (HeroSection, TrustSignals) → nên là Server Component
- [ ] Section có animation/interactivity → `'use client'` ở component đó, không phải parent

---

## Nguyên tắc 6 — Quản lý Type/Interface (TypeScript)

**Quy tắc:**
- Types API dùng chung toàn app → `src/types/api.ts`
- Props types → định nghĩa **trong file component**

**Cấu trúc `src/types/api.ts` hiện tại:**
```typescript
// Base envelope
interface ApiResponse<T> { success: boolean; data: T; error: null }
interface PaginatedResponse<T> { ... }

// Enums (string literal types)
type VisaType = "E_VISA" | "VOA"
type ApplicationStatus = "PENDING" | "PAID" | "PROCESSING" | "COMPLETED" | "REJECTED"

// Domain types (nhóm theo comment section)
interface ApplicationDetail { ... }
interface ChatMessage { ... }
```

**Convention:**
- `type` cho union, primitive alias, mapped types
- `interface` cho object shape có khả năng extend
- Không export type từ component file ra ngoài (trừ khi là public API của component)

**Checklist khi refactor:**
- [ ] Type được dùng ở 2+ file → chuyển vào `src/types/api.ts`
- [ ] Zod schema types: dùng `z.infer<typeof Schema>` thay vì định nghĩa tay
- [ ] Không `any` — dùng `unknown` + type guard nếu chưa biết shape

---

## Nguyên tắc 7 — Edge Cases & Next.js Pitfalls

### 7.1 Server-Client Serialization Boundary

**Không truyền từ Server Component xuống Client:**
- Functions (callbacks, handlers)
- Class instances (`Date`, `Map`, `Set`)
- Non-serializable objects

**Đúng:**
```typescript
// Server Component trả string ISO
const arrivalDate = application.arrival_date // "2025-06-15" ✅

// Client Component format lại
const formatted = new Date(arrivalDate).toLocaleDateString() // ✅
```

### 7.2 PPR & Dynamic Values (Next.js 16)

**Quy tắc (từ GEMINI.md):** Không dùng `new Date()`, `Math.random()` trực tiếp trong Server Component.

```typescript
// ❌ SAI — làm opt-out khỏi PPR
export default function Page() {
  const year = new Date().getFullYear()
  return <footer>© {year}</footer>
}

// ✅ ĐÚNG — dùng Client Component cho dynamic value
// src/components/layout/CopyrightYear.tsx (đã có trong codebase)
'use client'
export function CopyrightYear() {
  return <>{new Date().getFullYear()}</>
}
```

### 7.3 Hydration Mismatch Prevention

**Không đọc browser API ngoài `useEffect`:**
```typescript
// ❌ SAI
const stored = localStorage.getItem("key") // crash SSR

// ✅ ĐÚNG — pattern trong useChat.ts
function readStoredSession() {
  if (typeof window === "undefined") return null
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? "null")
  } catch { return null }
}
```

### 7.4 Error Boundaries & Suspense

```tsx
// Bọc section có async data
<Suspense fallback={<PricingSkeleton />}>
  <PricingPreview />
</Suspense>

// error.tsx cho route nhạy cảm
// apply/error.tsx → bắt lỗi apply flow
```

### 7.5 API Error Handling Pattern

**Pattern chuẩn từ codebase:**
```typescript
try {
  const result = await submitApplication(payload)
  // success path
} catch (err) {
  if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR" && err.details) {
    // Map field errors sang user-readable message
    const messages = Object.entries(err.details).flatMap(([, msgs]) => msgs)
    throw new Error(messages.join(" "))
  }
  throw err // re-throw unexpected errors
}
```

---

## Nguyên tắc 8 — Thước Đo Code (SOLID, DRY, KISS, YAGNI, Early Return)

### Single Responsibility
```typescript
// ❌ SAI — function làm 3 việc
async function handleStep1(data: Step1FormValues) {
  setStep1Data(data)
  saveApplyDraft({ step1: data })
  const price = await calculatePrice(mapStep1ToCalculatePriceRequest(data))
  setApiPrice(price)
  setCurrentStep(2)
}

// ✅ ĐÚNG — tách handlers
const handleStep1Next = (data: Step1FormValues) => {
  setStep1Data(data)
  persistDraft({ step1: data, currentStep: 2 })
  setCurrentStep(2)
}
// Pricing được trigger riêng qua onChange debounce
```

### DRY — Tránh lặp
```typescript
// ❌ Lặp error message handling ở 3 chỗ trong useChat
setError(err instanceof ApiClientError ? err.message : "Failed. Please try again.")

// ✅ Extract helper
function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback
}
```

### Early Return
```typescript
// ❌ SAI — lồng if sâu
async function sendMessage(text: string) {
  if (text.trim()) {
    if (sessionId) {
      if (!isSending) {
        // ... logic
      }
    }
  }
}

// ✅ ĐÚNG
async function sendMessage(text: string) {
  if (!text.trim() || !sessionId || isSending) return
  // ... logic phẳng
}
```

---

## Nguyên tắc 9 — Quản lý Assets & Cleanup (SVG & Icons)

**Quy tắc:**
- Không hardcode mã SVG (hàng chục dòng `<path>`) trực tiếp vào JSX/TSX.
- Di chuyển toàn bộ file SVG vào `src/assets/icons/` và cấu hình `@svgr/webpack` để import dưới dạng React Component.
- Không để rác: Xóa file prototypes (`*.html`, `*.tsx`), mock data, và tài liệu `.md` cũ khi feature đã hoàn thành.

**Ví dụ chuẩn:**
```tsx
// ❌ SAI — Lồng mã SVG khổng lồ
<button>
  <svg viewBox="0 0 24 24">
    <path d="M12..."></path>
  </svg>
  Tiếp tục
</button>

// ✅ ĐÚNG — Import SVG dưới dạng Component
import CheckIcon from "@/assets/icons/ui/Check.svg"

<button>
  <CheckIcon className="w-5 h-5" />
  Tiếp tục
</button>
```

**Checklist khi refactor:**
- [ ] Tìm các thẻ `<svg>` dài ngoẵng trong component và tách ra thành file `.svg` vật lý tại `src/assets/icons/`.
- [ ] Tìm các thẻ `<img src="/icons/..."/>` (static asset) và xem xét đổi sang Component import nếu cần styling (color/fill) thông qua Tailwind classes.
- [ ] Xóa bỏ thư mục `ui/public/icons/` nếu tất cả icons đã được di chuyển vào `src/assets/`.
- [ ] Dọn dẹp thư mục `/docs` hoặc `/business/component-library` nếu các file bên trong đã được tích hợp hoàn toàn vào `ui/src`.

---

## Quy trình Refactor Từng Bước

### Bước 1: Phân tích file cần refactor
```bash
# Đo độ phức tạp
wc -l src/path/to/Component.tsx

# Tìm API call bên trong component
grep -n "apiClient\|fetch(" src/path/to/Component.tsx

# Tìm useState/useEffect nhiều
grep -c "useState\|useEffect" src/path/to/Component.tsx
```

### Bước 2: Xác định loại refactor cần thiết

| Triệu chứng | Hành động |
|-------------|-----------|
| File >300 dòng TSX | Tách sub-components |
| `apiClient.*` trong component | Di chuyển ra `lib/api/` |
| 3+ `useState` + async logic | Tạo custom hook |
| Cùng logic ở 2+ nơi | Extract helper/util |
| `process.env.*` inline | Kéo lên đầu file hoặc vào lib/ |
| `'use client'` ở page không cần | Kiểm tra Server Component |

### Bước 3: Thực hiện theo thứ tự ưu tiên
1. **Types trước** — đảm bảo `types/api.ts` có đủ types cần dùng
2. **API layer** — tạo/cập nhật `lib/api/[domain].api.ts`
3. **Hook** — tạo `hooks/use[Feature].ts` nếu cần
4. **Component** — refactor file gốc, import từ các module mới
5. **Verify** — `npm run build` hoặc `tsc --noEmit`

### Bước 4: Xác minh không có regression
```bash
# Trong thư mục ui/
npm run build
# Hoặc type check nhanh
npx tsc --noEmit
```

---

## Comment Rules (từ GEMINI.md)

```typescript
/**
 * TẠI SAO cần hàm này: Tập trung map form values UI → API enum để tránh
 * hardcode string magic trong nhiều component.
 *
 * @param value - UI value từ form (lowercase kebab)
 * @returns API enum value (SCREAMING_SNAKE_CASE)
 */
export function mapVisaType(value: UiVisaType): VisaType {
  return VISA_TYPE_MAP[value]
}
```

**Quy tắc:**
- Comment giải thích **TẠI SAO**, không giải thích **CÁI GÌ**
- JSDoc bằng **Tiếng Việt có dấu** cho public functions
- Tên biến/hàm giữ nguyên **Tiếng Anh**

---

## Red Flags — Dấu hiệu cần refactor ngay

- [ ] `'use client'` ở root page/layout không cần thiết
- [ ] `fetch()` hoặc `apiClient.*` trong JSX component
- [ ] `new Date()` / `Math.random()` trong Server Component
- [ ] `window.*` / `localStorage.*` ngoài `useEffect` hoặc không check `typeof window`
- [ ] File TSX >400 dòng
- [ ] Cùng error message string lặp 2+ lần
- [ ] Type/interface dùng ở nhiều file nhưng định nghĩa trong component file
- [ ] `any` type không có comment giải thích
- [ ] Không có `error.tsx` cho route có async data fetching quan trọng
