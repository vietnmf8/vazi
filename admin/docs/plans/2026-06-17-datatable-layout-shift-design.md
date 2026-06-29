# DataTable Layout & Loading Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

## 1. Checklist Theo Dõi Tiến Độ
- [ ] Phân tích User Flow & Kết quả kỳ vọng
- [ ] Task 1: Create `useDebouncedLoading` hook
- [ ] Task 2: Refactor `EditPanel` to use the new hook
- [ ] Task 3: Update `DataTable.tsx` Loading Overlay & Empty State
- [ ] Verification: cURL 100% cases (Main, Sub, Edge)
- [ ] Verification: Log Analysis (app.log, api.log)
- [ ] Verification: Build & Lint Pass

## 2. User Flow & Kết Quả Kỳ Vọng
- **User Flow:** 
  1. Người dùng bấm thay đổi trang (Pagination) hoặc nhấn Sort trên các cột của DataTable.
  2. Hệ thống gọi API (siêu nhanh, <50ms hoặc chậm 500ms).
  3. Người dùng filter tìm kiếm một từ khóa không tồn tại, kết quả trả về rỗng.
- **Kết Quả Kỳ Vọng:** 
  1. Nếu API trả về < 200ms: Bảng dữ liệu chớp đổi số liệu ngay lập tức mượt mà, **không hề có loading (flicker)**. Bảng không bị biến mất.
  2. Nếu API trả về > 200ms: Lớp phủ `Overlay Spinner` mờ mờ hiện lên đè ngay trên chính cái bảng cũ, giữ nguyên layout, không bị giật (Layout Shift).
  3. Khi không có dữ liệu (Empty State), khối thông báo "Chưa có dữ liệu" vẫn duy trì kích thước (width) đẩy khung EditPanel sang phải như bình thường, không bị teo nhỏ lại.

**Goal:** Fix DataTable layout shift when sorting/paginating and prevent container shrinkage on empty states.

**Architecture:** We will create a generic `useDebouncedLoading` hook, replacing the hardcoded `null` return in `DataTable` with an overlay spinner, and injecting `w-full` utility classes.

**Tech Stack:** React, Next.js, TailwindCSS, Lucide Icons

---

### Task 1: Tạo Hook `useDebouncedLoading`

**Files:**
- Create: `src/hooks/useDebouncedLoading.ts`

**Step 1: Write minimal implementation**

```typescript
import { useState, useEffect } from "react"

export function useDebouncedLoading(isLoading?: boolean, delay = 200) {
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay)
      return () => clearTimeout(timer)
    } else {
      setShowLoading(false)
    }
  }, [isLoading, delay])

  return showLoading
}
```

### Task 2: Refactor `EditPanel`

**Files:**
- Modify: `src/components/features/master/MasterPages.tsx`

**Step 1: Refactor implementation**
In `EditPanel`, import `useDebouncedLoading`, replace local `useState` and `useEffect` with the hook.

### Task 3: Cập Nhật `DataTable.tsx`

**Files:**
- Modify: `src/components/data-table/DataTable.tsx`

**Step 1: Write minimal implementation**
1. Nhập `Loader2` từ `lucide-react`.
2. Nhập `useDebouncedLoading` từ `@/hooks/useDebouncedLoading`.
3. Thay thế đoạn code `if (isLoading) return null`.
4. Gọi `const showLoading = useDebouncedLoading(isLoading)`.
5. Trong `return ( ... )` của bảng:
   - Thêm `w-full relative` vào outer `div`.
   - Render lớp phủ `<div className="absolute inset-0 z-10 bg-white/50 ..."><Loader2 .../></div>` nếu `showLoading` là `true`.
6. Tại phần hiển thị `emptyMessage`, thêm class `w-full` vào thẻ `div`.

## Verification Plan (Bắt Buộc)

> **CẢNH BÁO:** Bắt buộc áp dụng tiêu chuẩn kiểm chứng nghiêm ngặt tương tự `phase-verification`. Không được tự động kết luận thành công nếu chưa pass toàn bộ các bước dưới đây.

**1. Mô phỏng cURL Http Request Thực Tế (Báo cáo Input/Output):**
- Bắt buộc giả lập các tình huống thật như User/Admin Flow. Đảm bảo pass 100%.
- **Main Cases:** Pagination & Sorting UI test (thao tác trực tiếp trên giao diện Admin và kiểm tra không có Layout Shift).
- **Sub/Edge Cases:** Tìm kiếm rỗng -> Test độ rộng của khối Empty Data.

**2. System Log Analysis:**
- Bắt buộc theo dõi `app.log` và `api.log` trong lúc test UI.
- **Tiêu chí:** Không có dòng lỗi (Error) hay cảnh báo ẩn (Hidden Warning) nào xuất hiện.

**3. Build & Lint Check:**
- Chạy `npm run lint` ở `@api` và `@ui` (Pass 100%).
- Chạy `npm run build` ở `@api` và `@ui` (Pass 100%).
