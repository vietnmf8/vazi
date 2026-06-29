# Kế hoạch nâng cấp CommentSection

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Hoàn thiện trải nghiệm bình luận, sửa lỗi UI hiển thị văn bản ở ZoomModal và tích hợp Cloudinary upload cho phép gửi bình luận có chứa hình ảnh (có hoặc không có nội dung chữ).

**Architecture:** Sử dụng presigned URL của Cloudinary (API backend đã có) để UI upload ảnh trực tiếp lên Cloudinary, sau đó gửi mảng URL cùng bình luận về backend. Cập nhật Prisma model `Comment` để có thể nhận `images` và cho phép `content` trống.

**Tech Stack:** Next.js (App Router), Prisma, Zod, Cloudinary, Framer Motion.

---

### Task 1: Sửa lỗi giao diện ZoomModal và CommentForm (Flow 1 & 2)

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\comments\ZoomModal.tsx`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\comments\CommentForm.tsx`

**Step 1: Sửa Placeholder trong ZoomModal**
- Mở `ZoomModal.tsx`.
- Sửa giá trị placeholder thành `"Gõ tiếp bình luận..."` cho case type pending.

**Step 2: Đồng bộ state gõ chữ từ ZoomModal sang CommentForm**
- Mở `CommentForm.tsx`.
- Thêm logic vào block `useEffect` lắng nghe giá trị `value` để lấy `getCleanText(el)`, nếu khác với `value` (từ props gửi vào), ta sẽ gán `el.innerHTML` bằng dữ liệu text mới cộng với HTML của chip tag hiện tại.

### Task 2: Cập nhật Database Schema (Flow 4)

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\api\prisma\schema.prisma`

**Step 1: Sửa Model Comment**
- Trong model `Comment`, đổi kiểu của trường `content` thành optional (`String?`).
- Thêm trường `images Json? @map("images")`.
- Chạy: `npx prisma format` và `npx prisma db push` (hoặc `migrate dev`).

### Task 3: Cập nhật Backend API (Validators & Services)

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\api\src\validators\comment.validator.ts`
- Modify: `d:\F8_K15_BTVN\FASTVISA\api\src\services\comment.service.ts`

**Step 1: Sửa Zod schema `comment.validator.ts`**
- Làm cho `content` thành optional.
- Thêm `images: z.array(z.string().url()).max(5).optional()`.
- Thêm validate `.refine` báo lỗi "Cần nhập nội dung hoặc thêm ảnh" nếu cả hai đều trống.

**Step 2: Cập nhật `comment.service.ts`**
- Cập nhật payload lưu DB có chứa `images` (nếu có).
- Select trả về thêm trường `images: true`.

### Task 4: Cập nhật Frontend Data Fetching & Cloudinary Upload

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\lib\comments.client.ts`
- Modify: `d:\F8_K15_BTVN\FASTVISA\ui\src\components\sections\comments\hooks\useCommentSection.ts`

**Step 1: Cập nhật API Types**
- Bổ sung `images` vào `ApiComment` và `CreateCommentPayload`.

**Step 2: Viết logic Upload ảnh qua Presigned URL**
- Bổ sung hàm convert Base64 -> Blob -> FormData.
- Gọi `/api/v1/uploads/presigned-url` để lấy public_id, timestamp, upload_endpoint, upload_params, ...
- Gửi fetch `POST` upload ảnh đó lên Cloudinary.

**Step 3: Gắn Upload Cloudinary trước khi tạo Comment**
- Trong `useCommentSection.ts` hàm `handleInlineSubmit` và `handleReplySubmit`: await upload danh sách pendingImages.
- Đổi các URL base64 tạm sang URL cloudinary sau upload, đẩy vào `qimages` tạo request chính thức.
