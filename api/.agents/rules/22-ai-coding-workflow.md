---
activation: always_on
description: AI coding assistant workflow — how Cursor/Claude should plan, ask, execute, verify.
---

# AI Coding Workflow Rules

> Rules cho AI coding assistant (Cursor / Claude Code / Antigravity) khi làm việc trên backend project này.

## 1. Trước khi code — Plan-First

Khi nhận yêu cầu, AI PHẢI:

1. **Đọc yêu cầu kỹ**, gạch chân scope (làm gì, KHÔNG làm gì)
2. **Grep existing code** xem đã có pattern tương tự chưa
3. **Liệt kê các câu hỏi** chưa rõ (4 nhóm Scope/Behavior/Suggest/Existing — xem rule clarifying-planning trong combo cũ)
4. **STOP** và đợi user confirm trước khi code

```
❌ KHÔNG: Nhận yêu cầu → code ngay → "Đây là solution của bạn"
✅ ĐÚNG: Nhận yêu cầu → 3-5 câu hỏi làm rõ → đợi → code
```

## 2. Khi code feature mới

PHẢI follow đúng MVCS skill (`mvcs-feature-scaffold`):

```
1. Schema (Prisma)
2. Validator (Zod)
3. Service (business logic + throw AppError)
4. Transformer (DB → DTO)
5. Controller (thin, dùng helpers)
6. Route (user / admin tách 2 file)
7. i18n keys (vi + en đồng thời)
8. Test (unit + integration)
```

KHÔNG được skip bước nào. KHÔNG được tự thêm bước không yêu cầu.

## 3. Khi ghép API (theo skill `api-integration-workflow` combo cũ)

7 bước bắt buộc:

1. Phân tích UI fields → API mapping
2. Lên plan production-ready (đợi approve)
3. Implement theo plan
4. Liệt kê test cases (Primary/Secondary/Edge)
5. Test ALL existing APIs (regression)
6. Report bảng chi tiết
7. Hỏi confirm clean trước commit

## 4. Cấm tuyệt đối

| Hành động                                                     | Lý do                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `res.json()` / `res.send()` direct                            | Phá envelope (rule 13)                                                  |
| `process.env.X` trong service/controller                      | Phá rule 15                                                             |
| Hardcode tiếng Việt/Anh trong service                         | Phá i18n (rule 19)                                                      |
| `throw new Error()` thay vì AppError                          | Phá error handling (rule 17)                                            |
| Sửa migration đã commit                                       | Migration là immutable                                                  |
| `prisma migrate dev` trong production                         | Reset DB                                                                |
| Sửa core middleware (response, errorHandler) khi thêm feature | Out of scope                                                            |
| Tự cài thêm package không cần thiết                           | Tăng bundle, security risk                                              |
| Tạo file test trong source code                               | Test chạy terminal, không lưu file (xem skill api-integration-workflow) |

## 5. Khi gặp ambiguity

```
❌ KHÔNG: Đoán → làm → "Tôi đoán bạn muốn..."
✅ ĐÚNG: Hỏi lại: "Tôi hiểu là [X], nếu khác vui lòng correct"
```

Đặc biệt khi:

- "Cải thiện X" → cải thiện theo hướng nào?
- "Thêm tính năng" → tính năng cụ thể nào?
- "Tối ưu performance" → metric nào? (response time? throughput? memory?)

## 6. Sau khi code — Build Verify Gate (BẮT BUỘC)

> **Iron Law:** Không báo "xong" cho đến khi `npm run build` + `npm run dev` + API smoke test đều pass 100%.

Trước khi báo "xong", chạy theo thứ tự (xem rule `25-build-verify-production-ready.mdc`, skill `production-ready-checklist` Phase 0):

### 6.1 Review & build

- [ ] Review implementation: yêu cầu đủ, logic đúng, không dead code/unused imports
- [ ] `npm run build` exit 0
- [ ] `npm run typecheck` exit 0

### 6.2 Dev & test

- [ ] `npm run dev` — server khởi động, không runtime errors
- [ ] Test endpoint với curl (không tạo file test trong source)
- [ ] **Kill tiến trình, giải phóng PORT** sau verify (xem `24-dev-server-verification.mdc`)

### 6.3 Auto Fix Loop

Fail bất kỳ bước trên → sửa → chạy lại build + dev + test → lặp đến pass.

### 6.4 Checklist bổ sung

- [ ] Đã handle 3 states (success, error, empty) nếu có UI impact
- [ ] Đã thêm i18n keys (vi + en)
- [ ] Đã grep `console.log`, `TODO`, unused imports
- [ ] Report Verify Summary dạng bảng cho user
- [ ] Hỏi `git status clean?` trước commit
- [ ] Báo user tự `npm run dev` trong terminal của họ để xác nhận cuối

Chỉ khi tất cả pass → **Production Ready ✅**

## 7. Code style

- 4-space indentation
- `import` không relative — dùng `@/` alias
- Named imports preferred over default (trừ default export của service singleton)
- Async controllers wrap với `asyncHandler`
- Function declarations cho top-level utilities, arrow functions cho callbacks
- Comment tiếng Việt, giải thích **WHY**: `00-vietnamese-comments.mdc` (JSDoc mô tả bằng tiếng Việt; `@param`/`@returns` giữ convention)

## 8. Khi PR / report

Format report dạng bảng:

```markdown
## Summary

- Total files changed: 8
- New tests added: 12 (10 pass, 2 pending)
- API endpoints added: 4 (2 user, 2 admin)

## Changes

| File                          | Type | Lines  |
| ----------------------------- | ---- | ------ |
| prisma/schema.prisma          | M    | +12 -0 |
| src/services/order.service.ts | A    | +85    |
| ...                           | ...  | ...    |

## Endpoints

| Method | Path           | Auth | Status   |
| ------ | -------------- | ---- | -------- |
| GET    | /api/v1/orders | ✓    | ✓ Tested |
| ...    | ...            | ...  | ...      |

## Next steps

- [ ] Run migration in staging
- [ ] Update FE API client types
```
