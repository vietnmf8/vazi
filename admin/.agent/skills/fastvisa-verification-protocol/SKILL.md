---
name: fastvisa-verification-protocol
description: Bộ quy chuẩn kiểm chứng độc lập (Verification Protocol) toàn diện cho dự án FASTVISA. Đảm bảo tính toàn vẹn của code, data, UI và API.
---

# FASTVISA Verification Protocol

## Overview

Kỹ năng này định nghĩa bộ tiêu chuẩn kiểm chứng (Verification) TOÀN DIỆN và BẮT BUỘC thực hiện vào **cuối của mỗi Implementation Plan** hoặc **sau khi hoàn thành một Task**. 

Việc tuân thủ quy trình này giúp tránh các lỗi phổ biến được rút ra từ dự án như: sập SSR ngầm, lỗi Type runtime, lỗi bất đồng bộ validation, và rớt dữ liệu đa ngôn ngữ. Kỹ năng này không còn phụ thuộc vào bất kỳ tài liệu bên ngoài nào mà đã đúc kết mọi bài học kinh nghiệm quan trọng nhất.

## 10 Bước Kiểm Chứng Bắt Buộc

> **CẢNH BÁO:** Không được tự động kết luận thành công nếu chưa pass toàn bộ các bước dưới đây. Mọi báo cáo hoàn thành công việc đều phải đi kèm Verification Report.

### 1. TDD & Unit Testing
- Viết Unit/Integration test bằng Vitest. Cover đủ Happy, Secondary, Edge cases.
- Chạy `npx vitest run <test_file>` đảm bảo Pass 100% sau khi hoàn thiện code.

### 2. Strict Type Checking
- Chạy `npx tsc --noEmit` ở CẢ `@api` và `@ui`.
- Phải đảm bảo tuyệt đối không có lỗi Type ngầm (đặc biệt khi thêm Type/Interface mới, phải mở trực tiếp file để kiểm tra `export`).

### 3. Client/Server Validation Parity
- Với mọi form nhập liệu, đối chiếu rule validation của UI (Zod schema) phải khớp 100% với rule Backend.
- Test thủ công input sai định dạng trên giao diện, đảm bảo thông báo lỗi hiển thị ngay trên form (chứ không phải đợi submit mới báo lỗi từ API).

### 4. Live API Testing (cURL)
- Bắt buộc test API đang chạy thực tế bằng công cụ `curl.exe`.
- Đối chiếu đủ 100% cases (VD: truyền params hợp lệ, thiếu params, sai định dạng locale). Đảm bảo JSON trả về đúng cấu trúc (tránh lỗi bọc 2 lần `data.data`).

### 5. Live UI Server SSR Check (cURL)
- Dùng `curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/<route>` kiểm tra status code.
- Bắt buộc phải trả về `200` để chứng minh Server Component render an toàn, không bị crash SSR ngầm vì lỗi fetch hoặc undefined data.

### 6. System Log Analysis
- Bắt buộc theo dõi log thời gian thực: `app.log` (bên ui) và `api.log` (bên api).
- Xác nhận không có lỗi runtime (như `TypeError: Cannot read properties of undefined` hoặc lỗi thiếu bản dịch `MISSING_MESSAGE` của next-intl).

### 7. UI Integrity & Defensive Rendering
- Đảm bảo dữ liệu list/array render an toàn: luôn có fallback trống `(data || []).map(...)` để chống vỡ Server.
- Các thuộc tính có khả năng `null` hoặc rỗng phải được bọc điều kiện (VD: `{plan.processing && <span>...</span>}`) để UI tự sập gọn thay vì render thẻ HTML trống không.
- Đối với các phần tử Flex (như icon + text), hạn chế dùng `flex-wrap` tuỳ tiện, ưu tiên `whitespace-nowrap` để chống rớt dòng trên màn hình nhỏ.

### 8. Multi-Language & Data Seed Check
- Phải tự kiểm chứng giao diện/dữ liệu trên đủ 3 ngôn ngữ (English, Tiếng Việt, 한국어). Không được tự suy diễn "Tiếng Việt có thì Tiếng Hàn cũng có".
- Đảm bảo DB Seed chứa đủ bản dịch. Nếu DB dùng kiểu String, phải lưu định dạng JSON stringified và dùng `JSON.parse` trên Next.js Server.
- **Xóa cache triệt để:** Nếu có thay đổi Data Seed, phải xóa thư mục `.next` (`rm -rf .next` hoặc PowerShell `Remove-Item -Recurse -Force .next`) trước khi start lại Server để test UI.

### 9. Third-Party Asset Verification
- Tuyệt đối không dùng link ảnh trực tiếp từ bên thứ 3 (Unsplash, Picsum, v.v) làm giá trị mặc định/fallback vì dễ lỗi 404 do policy.
- Luôn sử dụng ảnh dự phòng lưu cục bộ trong source code (VD: `/public/images/...`) và cấu hình fallback ảnh `<Image src={apiImage || '/images/local-fallback.jpg'} />`.

### 10. Lint & Build Check
- Chạy lệnh `npm run lint` ở CẢ `@api` và `@ui` (Yêu cầu Pass 100%).
- Chạy lệnh `npm run build` ở CẢ `@api` và `@ui` (Yêu cầu Pass 100%).

## Báo Cáo Yêu Cầu (Verification Report)

Sau khi hoàn thành các bước kiểm tra, AI phải chốt báo cáo lại kết quả theo checklist dưới đây:

```markdown
### 🔍 FASTVISA Verification Report
- [ ] **1. Unit Tests:** Pass 100%
- [ ] **2. Type Check (tsc):** Pass 100% (cả @api & @ui)
- [ ] **3. Validation Parity:** Đồng bộ hoàn toàn UI và API
- [ ] **4. API cURL:** Pass 100% Cases (Main & Edge)
- [ ] **5. SSR cURL:** HTTP 200 OK
- [ ] **6. Log Analysis:** Clear (Không có lỗi ngầm trong app.log & api.log)
- [ ] **7. UI Integrity & Fallback:** Đã check an toàn
- [ ] **8. Multi-Language (EN/VI/KO):** Đã check đủ ngôn ngữ, xóa cache.
- [ ] **9. Asset Fallback:** Đã sử dụng local fallback image
- [ ] **10. Lint & Build:** Pass 100% (cả @api & @ui)
```
