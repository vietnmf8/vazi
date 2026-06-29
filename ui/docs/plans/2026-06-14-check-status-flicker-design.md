# Check Status Flicker Fix Design

## Overview
Giải quyết tình trạng layout shift và flicker tại form Check Status khi người dùng tra cứu kết quả.

## Vấn đề hiện tại
1. Khi gọi API, biến `result` lập tức bị gán bằng `null` (`setResult(null)`), khiến khối kết quả bên dưới biến mất ngay lập tức và đẩy toàn bộ nội dung dưới lên.
2. Khi API trả về, khối kết quả xuất hiện đột ngột đẩy giao diện xuống, gây giật lag.

## Giải pháp (Đã thống nhất qua /grill-me)
1. **Quản lý State Pending:**
   - Không gọi `setResult(null)` ngay trong hàm `onSubmit`.
   - Kết hợp biến `isSubmitting` để hiển thị spinner ở nút Check Status.
   - Thêm class `opacity-50 pointer-events-none` cho phần kết quả cũ (nếu có) trong lúc gọi API.

2. **Animation cho khối kết quả:**
   - Sử dụng `AnimatePresence` và `m.div` từ `framer-motion` (đã được cài sẵn trong dự án với package `@gsap/react` hoặc `framer-motion`).
   - Thiết lập `initial={{ height: 0, opacity: 0 }}`, `animate={{ height: "auto", opacity: 1 }}`, `exit={{ height: 0, opacity: 0 }}` để tạo hiệu ứng co giãn mượt mà.
   - Thêm thuộc tính `overflow="hidden"` để animation height không bị rác UI.
   - Di chuyển margin (gap) vào phần tử con bên trong m.div để margin cũng được ẩn hoàn toàn khi height co lại 0.

## Các file cần sửa
- `src/app/(main)/check-status/_components/CheckStatusForm.tsx`
