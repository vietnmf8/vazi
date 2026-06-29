---
name: nextjs-performance-audit
description: Audit và fix performance issues trong Next.js App Router — RAM leak, SSR cost, Turbopack cache, framer-motion overhead
---

# Next.js Performance Audit

## Khi nào dùng

- RAM Node.js tăng liên tục theo thời gian trong dev (> 2GB sau vài giờ)
- `application-code` trong dev log cao bất thường (> 300ms cho trang không có API call)
- Trang load chậm, giật lag khi navigate
- Task Manager thấy tiến trình Node.js chiếm nhiều GB

## Quy trình chuẩn

### Bước 1 — Đo lường thực tế

```powershell
# Kiểm tra RAM từng Node.js process
Get-Process -Name "node" | Select-Object Id,
  @{N='RAM(MB)';E={[math]::Round($_.WorkingSet64/1MB,0)}},
  @{N='CPU(s)';E={[math]::Round($_.CPU,2)}},
  StartTime | Sort-Object 'RAM(MB)' -Descending | Format-Table -AutoSize
```

Đọc Next.js dev log: phân tích `next.js: Xms` vs `application-code: Yms`
- `next.js` cao → Turbopack compile cold start, bình thường cho lần đầu
- `application-code` cao liên tục → SSR render cost hoặc data fetching

### Bước 2 — Kiểm tra Turbopack cache

```powershell
# Xem .next/dev/ có phình to không
$turboDir = ".\ui\.next"  # điều chỉnh path
Get-ChildItem $turboDir -Directory | ForEach-Object {
  $s = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  "$($_.Name): $([math]::Round($s/1MB,0)) MB"
}
```

**Bước đầu tiên: kiểm tra flag trước khi kết luận.**

```ts
// next.config.ts — flag này mới là nguyên nhân tích lũy không giới hạn
experimental: {
  turbopackFileSystemCacheForDev: true,  // ← nếu có flag này thì mới là vấn đề
}
```

- Flag **CÓ** trong config + `.next/dev` > 500MB → xóa flag, xóa `.next/`, restart.
- Flag **KHÔNG** có (hoặc `experimental: {}`) → `.next/dev` lớn là bình thường từ build tích lũy qua các session. Không cần fix gì; xóa `.next/` chỉ để giải phóng disk space tùy chọn.

### Bước 3 — Kiểm tra next.config.ts

```ts
// ❌ Flag gây tích lũy cache không giới hạn — luôn xóa
experimental: {
  turbopackFileSystemCacheForDev: true,
}

// ✅ Config sạch
experimental: {}

// ─── cacheComponents: true — phụ thuộc vào việc có dùng "use cache" không ───

// ✅ GIỮ khi project dùng "use cache" directive
// cacheComponents là backing store bắt buộc cho "use cache" functions.
// Thiếu flag này, Next.js không có chỗ lưu kết quả cache → "use cache" vô hiệu.
cacheComponents: true,

// ❌ XÓA khi project KHÔNG có bất kỳ "use cache" function nào
// Khi không dùng "use cache", flag này chỉ thêm overhead mà không có lợi ích gì.
// cacheComponents: true,
```

### Bước 4 — Audit framer-motion imports

```bash
# Tìm motion.* còn sót
grep -rn "import { motion" src/ --include="*.tsx"
grep -rn "motion\." src/ --include="*.tsx"
```

Nếu còn `motion.*` → đổi sang `LazyMotion` + `m.*`:

```tsx
// src/components/providers/MotionProvider.tsx
"use client"
import { LazyMotion, domMax } from "framer-motion"
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>
}

// src/app/layout.tsx
<MotionProvider>{children}</MotionProvider>

// Trong components — thay motion.* bằng m.*
import { m, AnimatePresence } from "framer-motion"
<m.div animate={{ opacity: 1 }}>...</m.div>
```

### Bước 5 — Audit heavy static imports

```bash
# Tìm thư viện nặng được import static
grep -rn "import.*emoji-picker\|import.*react-markdown\|import.*recharts" src/
```

Bất kỳ library nào > 200kb và không cần SSR → dùng `next/dynamic`:

```tsx
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })
const Chart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false })
```

### Bước 6 — Audit memory leaks phổ biến

```bash
# useEffect không có cleanup
grep -rn "new Audio\|setInterval\|setTimeout\|addEventListener" src/ --include="*.tsx"
```

Checklist:
- `new Audio()` → thêm `audio.addEventListener("ended", () => { audio.src = "" }, { once: true })`
- `setInterval` → `return () => clearInterval(id)`
- `addEventListener` → `return () => removeEventListener(...)`
- Pusher/WebSocket → `return () => pusher.disconnect()`

### Bước 7 — Xác nhận kết quả

```powershell
# Sau khi fix, đo lại RAM
Get-Process -Name "node" | Measure-Object -Property WorkingSet64 -Sum |
  ForEach-Object { "Tổng RAM: $([math]::Round($_.Sum/1MB,0)) MB" }
```

Dev server lành mạnh: main process < 1GB, không tăng theo thời gian.

## Baseline kỳ vọng cho Next.js 16 + Turbopack

| Metric | Dev (có Strict Mode) | Dev (không Strict Mode) | Production |
|---|---|---|---|
| RAM main process | < 800MB | < 800MB | N/A |
| Trang tĩnh lần đầu | < 800ms | < 800ms | < 200ms |
| Trang tĩnh lần sau | < 350ms | < 200ms | < 100ms |
| Homepage nhiều sections | < 350ms | < 200ms | < 100ms |

## Nguyên nhân thường gặp theo triệu chứng

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| RAM tăng chóng mặt theo thời gian | `turbopackFileSystemCacheForDev: true` | Xóa flag + xóa `.next/` |
| RAM cao ngay từ đầu (> 3GB) | `.next/dev/cache` từ session cũ | Xóa `.next/` |
| `application-code` > 400ms cho trang mock | `motion.*` chạy SSR | Đổi sang `m.*` + LazyMotion |
| `application-code` > 400ms cho trang mock | `cacheComponents: true` (khi project KHÔNG dùng `"use cache"`) | Xóa flag |
| `application-code` double so với production | `reactStrictMode: true` double-render | Bình thường, không cần fix |
| RAM tăng dần khi chat | `new Audio()` không cleanup | Thêm cleanup |
