# Skill: API Integration Workflow (Production-Ready)

**Trigger:** "ghép api", "tích hợp api", "integrate api", "connect api", "wire up backend", "thêm endpoint vào frontend"

## ⚠️ NGUYÊN TẮC ĐẦU TIÊN — Confirm Clean State

**TRƯỚC khi bắt đầu, BẮT BUỘC hỏi user:**

```
Trước khi bắt đầu integrate API, tôi cần xác nhận:
1. Working directory đã clean chưa? (git status)
2. Branch hiện tại có phải branch dev/feature không?
3. Có file changes chưa commit nào không?
Vui lòng confirm để tôi tiến hành.
```

**KHÔNG được skip bước này dù user có vẻ vội.**

---

## 7 BƯỚC BẮT BUỘC (theo thứ tự)

### Bước 1: Phân tích UI

**Output:** Bảng các trường (fields) cần xử lý.

```markdown
| Trường    | Hiển thị (UI)         | Logic (validation/transform)            | Nguồn data              |
| --------- | --------------------- | --------------------------------------- | ----------------------- |
| email     | Input field           | Required, email format                  | API response.user.email |
| createdAt | Tooltip "2 giờ trước" | formatRelativeTime()                    | API response.created_at |
| status    | Badge variant         | Map "active"→success, "pending"→warning | API response.status     |
| ...       | ...                   | ...                                     | ...                     |
```

**Câu hỏi tự đặt:**

- Có field nào hiển thị mà chưa có trong API spec?
- Có field nào trong API nhưng không cần hiển thị?
- Có field cần transform (date format, currency, enum mapping)?

### Bước 2: Lên Plan (Production-Ready)

**Output:** Plan dạng checklist, KHÔNG code ngay.

```markdown
## Plan: Integrate [Feature Name] API

### 2.1 Backend touchpoints

- [ ] Endpoint: `GET /api/posts?page=:page&limit=:limit`
- [ ] Response shape: `{ data: Post[], meta: { total, page, limit } }`
- [ ] Auth required: Yes (Bearer token)
- [ ] Error codes: 401 (auto-refresh), 403, 500

### 2.2 Frontend changes

- [ ] Create RTK Query endpoint trong `src/services/post.js`
- [ ] Create Zod schema validation trong `src/schemas/postSchema.js`
- [ ] Create custom hook `usePostList` trong `src/features/post/hooks/`
- [ ] Wire vào component `PostList.jsx`
- [ ] Handle loading state (Skeleton)
- [ ] Handle error state (toast + retry button)
- [ ] Handle empty state (illustration + CTA)

### 2.3 Edge cases

- [ ] Network error (offline)
- [ ] 401 → trigger token refresh queue
- [ ] Pagination boundary (last page)
- [ ] Stale-while-revalidate behavior
- [ ] Race condition (rapid switch tabs)

### 2.4 Performance

- [ ] Cache strategy: tagTypes + invalidation rules
- [ ] Optimistic updates cho mutation?
- [ ] Debounce search input nếu có
```

**STOP và đợi user approve plan trước khi code.**

### Bước 3: Implement (theo Plan)

Code đúng plan, không thêm nghiệp vụ ngoài plan. Nếu phát hiện thiếu → quay về Bước 2 update plan.

### Bước 4: Viết Test Cases (3 nhóm)

**Output:** Bảng test cases, KHÔNG code test ngay.

```markdown
| #   | Loại      | Mô tả                         | Expected                 | Command                    |
| --- | --------- | ----------------------------- | ------------------------ | -------------------------- |
| 1   | Primary   | GET /posts với auth hợp lệ    | 200 + data array         | `curl -H "Auth..." ...`    |
| 2   | Primary   | POST /posts với body hợp lệ   | 201 + created object     | `curl -X POST ...`         |
| 3   | Secondary | GET /posts page=2             | data của page 2          | `curl ".../?page=2"`       |
| 4   | Secondary | POST /posts missing field     | 400 + error message      | `curl ... (missing field)` |
| 5   | Edge      | GET /posts không có auth      | 401                      | `curl ... (no token)`      |
| 6   | Edge      | POST /posts với token expired | 401 → refresh            | `curl ... (old token)`     |
| 7   | Edge      | Network timeout               | error handled gracefully | (simulate offline)         |
| 8   | Edge      | Large payload (10k chars)     | 413 hoặc trim            | `curl ... (huge body)`     |
```

### Bước 5: Test ALL Existing APIs (Regression)

**Quan trọng:** Không chỉ test API mới — test luôn TẤT CẢ APIs hiện có để đảm bảo không break gì.

**Cách thực hiện:**

```bash
# 1. List tất cả endpoints hiện có
grep -r "builder.query\|builder.mutation" src/services/

# 2. Tạo bash script chạy curl cho từng endpoint
# CHẠY TRỰC TIẾP TRONG TERMINAL của agent
# KHÔNG tạo file test trong source code

# Ví dụ:
echo "Testing GET /auth/me..."
curl -s -X GET "$BASE_API/auth/me" -H "Authorization: Bearer $TOKEN" | jq .

echo "Testing GET /posts/feed..."
curl -s -X GET "$BASE_API/posts/feed?type=for_you" -H "Authorization: Bearer $TOKEN" | jq .
# ... etc
```

**Lặp đến khi PASS 100%:**

```
IF có test fail:
    → Phân tích root cause
    → Fix code (không sửa test để pass)
    → Re-run TẤT CẢ tests (không chỉ test fail)
    → Lặp đến PASS 100%
```

### Bước 6: Report (Bảng chi tiết)

**Output:** Bảng cho user theo dõi.

```markdown
## 📋 Test Report

### Summary

- Total: 12 test cases
- Passed: 12 ✅
- Failed: 0
- Status: **READY FOR REVIEW**

### Detail

| #   | Endpoint        | Method | Test Case         | Status  | Response Time | Notes                |
| --- | --------------- | ------ | ----------------- | ------- | ------------- | -------------------- |
| 1   | /auth/me        | GET    | Valid token       | ✅ Pass | 120ms         | -                    |
| 2   | /auth/me        | GET    | No token          | ✅ Pass | 80ms          | Returns 401          |
| 3   | /auth/refresh   | POST   | Valid refresh     | ✅ Pass | 200ms         | Issues new token     |
| 4   | /posts/feed     | GET    | type=for_you      | ✅ Pass | 150ms         | Returns 10 items     |
| 5   | /posts/feed     | GET    | type=following    | ✅ Pass | 140ms         | -                    |
| 6   | /posts/feed     | GET    | Pagination page=2 | ✅ Pass | 145ms         | Cache merged         |
| 7   | /posts          | POST   | Valid body        | ✅ Pass | 180ms         | Returns created post |
| 8   | /posts          | POST   | Empty content     | ✅ Pass | 90ms          | 400 + i18n error     |
| 9   | /posts/:id/like | POST   | Valid             | ✅ Pass | 110ms         | Optimistic update OK |
| 10  | /posts/:id/like | POST   | Already liked     | ✅ Pass | 100ms         | Idempotent           |
| 11  | /posts/:id      | DELETE | Owner             | ✅ Pass | 120ms         | -                    |
| 12  | /posts/:id      | DELETE | Not owner         | ✅ Pass | 80ms          | Returns 403          |

### Changes Summary

- New files: `src/services/post.js` (+45 lines)
- Modified: `src/features/post/components/PostList.jsx` (+30 -15)
- Test commands logged trong: chat history (not committed)
```

### Bước 7: Final Confirmation

**Hỏi user:**

```
✅ Integration hoàn tất. Kết quả test 12/12 PASS.

Trước khi commit, vui lòng confirm:
1. Source code có CLEAN không (chỉ có changes liên quan task)?
2. Có file tạm/test/debug nào sót lại không?
3. Branch và commit message đã đúng chưa?

Khi bạn confirm → tôi sẽ:
- git status để verify clean
- Liệt kê files sẽ commit
- Đợi approval cuối cùng
```

---

## Checklist (cho AI tự kiểm)

- [ ] **Phase 0 Build Verify:** `npm run dev` + `npm run build` pass 100% (skill `production-ready-checklist`, rule `25-build-verify-production-ready.mdc`)
- [ ] Đã hỏi user confirm clean state trước khi bắt đầu?
- [ ] Đã phân tích UI fields → mapping với API?
- [ ] Đã trình plan và đợi approve TRƯỚC khi code?
- [ ] Đã liệt kê 3 nhóm test cases (Primary/Secondary/Edge)?
- [ ] Đã test ALL existing APIs, không chỉ API mới?
- [ ] Test chạy trong terminal, KHÔNG tạo file test trong source?
- [ ] Đã loop fix → re-test đến PASS 100%?
- [ ] Đã report dạng bảng chi tiết?
- [ ] Đã hỏi confirm clean trước khi commit?
