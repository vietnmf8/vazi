---
name: phase-verification
description: Quy trình kiểm chứng (Verification) bắt buộc 10 bước cho các Phase migration và phát triển tính năng. Đảm bảo chất lượng code, data integrity, SSR cache, và TDD.
---

# Quy Trình Kiểm Chứng (Verification) Bắt Buộc

**Sử dụng khi:** Hoàn thành mỗi Phase, mỗi Task hoặc khi kiểm chứng code trước khi kết thúc công việc.
Quy trình này chứa các kinh nghiệm đắt giá từ các lỗi thực tế (như lỗi MISSING_MESSAGE của next-intl, lỗi Cache, và lỗi Data Integrity của Phase 4).

## 10 Bước Kiểm Chứng Tiêu Chuẩn

Bạn **bắt buộc** phải thực hiện đầy đủ 10 bước dưới đây và báo cáo kết quả trước khi tuyên bố hoàn thành Phase:

1. **Write failing test**: Viết Unit/Integration test bằng Vitest. Cover Happy, Secondary, Edge cases (lỗi mạng, data null).
2. **Run test to verify it fails**: Chạy `npx vitest run <test_file>` để thấy test fail.
3. **Write minimal implementation**: Cập nhật schema, viết API, hoặc thay thế mockup data ở UI. Chú ý luôn viết dự phòng Fallback logic cho các trường hợp mất cấu hình.
4. **Run test to verify it passes**: Chạy lại `npx vitest run <test_file>` đảm bảo Pass 100%.
5. **Type Checking (Bắt buộc)**: Chạy `npx tsc --noEmit` ở CẢ `@api` và `@ui` để đảm bảo tuyệt đối không có lỗi Type ngầm trước khi test thực tế.
6. **Live API Testing (cURL)**: Bắt buộc test API đang chạy thực tế bằng `curl.exe` đối chiếu đủ 100% cases (VD: `?locale=en`, `?locale=vi`, missing locale, invalid locale). Đảm bảo data trả về như mong muốn.
7. **Live UI Server SSR Check (cURL)**: Dùng `curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/<route>` kiểm tra status code trả về. Bắt buộc phải là `200` để chứng minh Server Component render an toàn, không bị crash SSR ngầm (hydration mismatch / fetch lỗi).
8. **Live UI Log Analysis (BẮT BUỘC)**: Bắt buộc quan sát và kiểm tra log runtime được ghi ra file để phát hiện sớm các lỗi ngầm:

- @ui/app.log
- @api/api.log
  VD: Lỗi `[browser] Error: MISSING_MESSAGE...` từ `next-intl` khi truyền các khoá động từ Backend mà file `en.json` không có.

9. **UI Integrity Check & Data Mapping**:
    - Đảm bảo giao diện hiển thị ĐÚNG và ĐỦ so với lúc dùng mockup.
    - **KHÔNG DÙNG thẳng mảng cấu hình (raw DB keys)** từ Backend đổ vào map vòng lặp render UI nếu dữ liệu Backend là dạng tổ hợp quá chi tiết.
    - **Data Integrity (Kinh nghiệm từ Phase 4)**: SSR trả về HTTP 200 không có nghĩa là Data hiển thị đúng ngôn ngữ. Phải đối chiếu dữ liệu Seed/Database xem đã có đủ bản dịch (`vi`, `en`) hay chưa. Nếu thiếu dữ liệu dịch trong DB, fallback sẽ tự nhảy về tiếng Anh dù code đúng 100%. Phải viết lệnh Seed bù dữ liệu nếu phát hiện thiếu.
10. **Lint, Build & Commit**: Chạy `npm run lint` và `npm run build` ở CẢ `@api` và `@ui`. Fix 100% lỗi trước khi commit.

## Cách Báo Cáo

Khi dùng Skill này, hãy trả về một Checklist báo cáo trạng thái pass/fail cho 10 bước trên, kèm minh chứng ngắn gọn.

