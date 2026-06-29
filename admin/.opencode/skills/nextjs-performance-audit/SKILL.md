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

Nếu `.next/dev/cache` > 500MB → `turbopackFileSystemCacheForDev: true` đang bật và tích lũy.

**Fix:**
```ts
// next.config.ts — xóa hoặc để rỗng
experimental: {},
```
Sau đó xóa `.next/` và restart.

### Bước 3 — Kiểm tra next.config.ts

```ts
// ❌ Các flag gây memory/performance issues
cacheComponents: true,                     // thêm overhead nếu không dùng `use cache`
experimental: {
  turbopackFileSystemCacheForDev: true,    // tích lũy cache không giới hạn
}

// ✅ Config sạch
experimental: {}
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
| `application-code` > 400ms cho trang mock | `cacheComponents: true` | Xóa flag |
| `application-code` double so với production | `reactStrictMode: true` double-render | Bình thường, không cần fix |
| RAM tăng dần khi chat | `new Audio()` không cleanup | Thêm cleanup |
