# Skill: Production-Ready Checklist (API)

**Trigger:** "đã xong chưa", "done chưa", "ready chưa", "review giúp", sau mỗi lần implement/build code
**Auto-trigger:** Khi AI sắp báo cáo "hoàn thành" — **BẮT BUỘC** chạy toàn bộ Phase 0 trước Phase 1

> Rule liên quan: `25-build-verify-production-ready.mdc`, `24-dev-server-verification.mdc`, `22-ai-coding-workflow.mdc`

---

## Phase 0 — Build Verify Gate (BẮT BUỘC, chạy trước tiên)

**Iron Law:** Không báo done nếu Phase 0 chưa pass 100%.

### 0.1 Review implementation

- [ ] Tất cả yêu cầu task đã implement (schema → validator → service → controller → route)
- [ ] Logic đúng, AppError + i18n keys đầy đủ
- [ ] Không dead code, import/biến/hàm không dùng
- [ ] Không `console.log` debug, `TODO`/`FIXME` thiếu context
- [ ] Không vi phạm MVCS / rule 22

### 0.2 `npm run build`

```bash
cd api && npm run build
```

- [ ] Build exit 0 — `tsc && tsc-alias` thành công
- [ ] Không compile errors
- [ ] Không type errors

```bash
npm run typecheck
```

- [ ] Typecheck exit 0

### 0.3 `npm run dev` + API smoke test

```bash
cd api && npm run dev
```

- [ ] Server khởi động thành công
- [ ] Không runtime errors khi boot
- [ ] Endpoint liên quan task test pass (curl — **không** tạo file test trong source)
- [ ] **Sau verify:** kill dev process, giải phóng PORT (xem `24-dev-server-verification.mdc`)

### 0.4 Auto Fix Loop

Nếu **bất kỳ** bước trên fail:

1. Phân tích nguyên nhân
2. Sửa code
3. Chạy lại `npm run build` → `npm run dev` → curl test
4. Lặp đến khi pass 100%

**Cấm** kết luận task hoàn thành khi loop chưa pass.

### 0.5 Verify Summary (báo cáo bắt buộc)

| Step | Command | Result | Notes |
| ---- | ------- | ------ | ----- |
| Build | npm run build | ✅/❌ | |
| Typecheck | npm run typecheck | ✅/❌ | |
| Dev | npm run dev | ✅/❌ | |
| API | curl smoke test | ✅/❌ | |
| Review | implementation | ✅/❌ | |

**Production Ready Gate:** chỉ ✅ khi tất cả ✅

---

## Phase 1 — Checklist chi tiết (sau khi Phase 0 pass)

### MVCS & Architecture

- [ ] Route user/admin tách file (rule 13)
- [ ] Controller thin, logic trong service
- [ ] Validator Zod tại boundary
- [ ] Response qua envelope (`res.success` / `res.error`)
- [ ] Env qua `unifiedConfig`, không `process.env` trong service/controller

### Error & i18n

- [ ] AppError hierarchy, không `throw new Error()`
- [ ] i18n keys vi + en cho message mới
- [ ] Expected errors không gửi Sentry

### Data & Security

- [ ] Prisma query đúng soft-delete pattern (nếu có)
- [ ] Auth middleware + role guard đúng scope
- [ ] Không leak stack/details trong production

### Code Quality

- [ ] Không import không dùng
- [ ] Comment tiếng Việt cho logic non-trivial
- [ ] 4-space indent, `@/` alias

### Regression

- [ ] Test endpoint liên quan task (Primary/Secondary/Edge)
- [ ] Test regression API liên quan (nếu có thay đổi shared code)

### Git Hygiene

- [ ] `git status` clean (chỉ changes liên quan task)
- [ ] Không file test trong source
- [ ] Không commit `.env`, secret
- [ ] Không sửa migration đã commit

### Confirmation

- [ ] Đã báo cáo dạng bảng cho user?
- [ ] Đã hỏi user confirm clean trước khi commit?

---

**Nếu BẤT KỲ item Phase 0 hoặc Phase 1 unchecked → FIX trước khi báo done.**
