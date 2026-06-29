# Pay-First Application & Status Emails — Design Spec

**Date:** 2026-06-15  
**Status:** Approved for implementation

## Business decisions

| Topic | Decision |
|-------|----------|
| Hồ sơ DB | Chỉ tạo `VisaApplication` sau PayPal capture SUCCESS |
| Trước thanh toán | Lưu `ApplicationDraft` (TTL 48h) |
| Trạng thái ban đầu | **PAID** + `applicationCode` (VN-…) ngay lúc tạo |
| Email PAID | Gửi xác nhận kèm mã hồ sơ sau capture |
| Email PROCESSING | Admin đổi status → gửi user |
| Email COMPLETED | Admin đổi status → gửi user (+ link eVisa nếu có) |
| Abandoned cart | Query `ApplicationDraft` chưa thanh toán |
| Lifecycle admin | PAID → PROCESSING → COMPLETED / REJECTED |

## API

- `POST /applications/submit` → `{ draft_id, total_amount }`
- `POST /payments/create-session` → `{ draft_id }`
- `POST /payments/capture-order` → `{ application_code, application_id }` + email PAID
- `PATCH /admin/applications/:id/status` → email on PROCESSING / COMPLETED

## UI

- Payment flow dùng `draft_id` (sessionStorage)
- Success page lấy `application_id` từ capture response
