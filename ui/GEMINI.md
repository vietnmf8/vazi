# FASTVISA UI - Gemini CLI Instructions

Tài liệu này định nghĩa các quy tắc, tiêu chuẩn và quy trình làm việc cho Gemini CLI trong dự án FASTVISA UI.

## 1. Ngôn ngữ & Comment Code
- **BẮT BUỘC** viết comment bằng **Tiếng Việt có dấu**.
- Giải thích **TẠI SAO (WHY)**, không giải thích CÁI GÌ (WHAT). Tránh lặp lại code trong comment.
- **JSDoc**: Viết bằng Tiếng Việt cho các hàm public, export, class methods.
- **TODO/FIXME**: Giữ nguyên marker `TODO(tên):` hoặc `FIXME:`, nhưng nội dung mô tả bằng Tiếng Việt.
- **Ngoại lệ**: Tên biến/hàm/class, JSDoc tags (`@param`, `@returns`), và các định danh kỹ thuật giữ nguyên Tiếng Anh.

## 2. Tiêu chuẩn TypeScript
- **Strict Mode**: Luôn tuân thủ `strict: true`.
- **Type vs Interface**:
    - Dùng `type` cho union types, primitives, và các shape đơn giản.
    - Dùng `interface` cho các object shape có khả năng được mở rộng.
- **Error Handling**: Ưu tiên dùng `Result<T, E>` pattern (`{ success: true, data: T } | { success: false, error: E }`) thay vì throw exception cho các lỗi nghiệp vụ.
- **Validation**: Dùng `zod` để validate dữ liệu từ API và Form.

## 3. Quy tắc Next.js 16 (App Router)
- **React Compiler**: Đã bật `reactCompiler: true`. Không cần viết `useMemo` hay `useCallback` thủ công trừ trường hợp đặc biệt.
- **PPR (Partial Prerendering)**: Đã bật `cacheComponents: true`.
    - **Cảnh báo**: Không gọi `new Date()`, `Math.random()` trực tiếp trong Server Component.
    - **Giải pháp**: Dùng `await connection()` trước khi gọi giá trị dynamic, hoặc đưa vào Client Component bọc trong `<Suspense>`.
- **Data Fetching**:
    - Dùng directive `'use cache'` kết hợp `cacheLife()` và `cacheTag()`.
    - `params` và `searchParams` trong Page/Layout là **Promise**, phải `await` trước khi dùng.
- **Middleware**: Sử dụng file `proxy.ts` (Next.js 16) thay cho `middleware.ts`.
- **Server Components**: Là mặc định. Chỉ dùng `'use client'` khi cần interactivity hoặc browser APIs.

## 4. Cấu trúc Thư mục & Naming
- `src/app`: Routes, layouts, loading, error UI.
- `src/components/ui`: Các base components (Shadcn UI).
- `src/components/features`: Components chứa logic nghiệp vụ theo tính năng.
- `src/lib`, `src/hooks`, `src/types`: Logic, custom hooks và định nghĩa kiểu.
- **Naming**:
    - `PascalCase` cho React Components và thư mục component.
    - `camelCase` cho hooks, utils, variables.
    - `kebab-case` cho folder routes.

## 5. Quy trình làm việc của Gemini CLI
1. **Nghiên cứu**: Luôn kiểm tra các file rules trong `.agents/rules/` và code hiện có trước khi thực hiện.
2. **Thực hiện**: Viết code sạch, đúng type, comment đầy đủ tiếng Việt.
3. **Kiểm chứng**: Chạy `npm run build` hoặc `tsc` để đảm bảo không có lỗi type/build mới, đặc biệt là các lỗi liên quan đến PPR và `new Date()`.
4. **Bắt buộc**: Luôn gọi và thực thi đúng Skill `phase-verification` trước khi báo cáo hoàn thành bất kỳ Task/Phase phát triển nào.

---
*Lưu ý: Các hướng dẫn trong file này có ưu tiên cao nhất khi làm việc trong dự án này.*
