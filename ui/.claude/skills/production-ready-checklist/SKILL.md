# Skill: Production-Ready Checklist

**Trigger:** "đã xong chưa", "done chưa", "ready chưa", "review giúp", "kiểm tra giúp", sau mỗi lần implement/build code
**Auto-trigger:** Khi AI sắp báo cáo "hoàn thành" — **BẮT BUỘC** chạy toàn bộ Phase 0 trước Phase 1

> Rule liên quan: `25-build-verify-production-ready.mdc` (always-on)

---

## Phase 0 — Build Verify Gate (BẮT BUỘC, chạy trước tiên)

**Iron Law:** Không báo done nếu Phase 0 chưa pass 100%.

### 0.1 Review implementation

- [ ] Tất cả yêu cầu task đã implement đầy đủ
- [ ] Logic hoạt động đúng
- [ ] Không dead code, import/biến/hàm không dùng
- [ ] Không `console.log` debug, `TODO`/`FIXME` thiếu context

### 0.2 `npm run dev`

```bash
cd ui && npm run dev
```

- [ ] App khởi động thành công (exit 0, server listening)
- [ ] Không runtime errors
- [ ] Không console errors nghiêm trọng
- [ ] Không warning nghiêm trọng ảnh hưởng chức năng
- [ ] **Sau verify:** kill dev process, giải phóng PORT (`:3000`)

### 0.3 `npm run build`

```bash
cd ui && npm run build
```

- [ ] Build exit 0 — 100% thành công
- [ ] Không compile / type / lint errors
- [ ] Không dependency issues
- [ ] PPR/cacheComponents: không lỗi runtime API (xem `next-cache-components` skill)

Chạy thêm: `npm run lint`

### 0.4 Auto Fix Loop

Nếu **bất kỳ** bước trên fail:

1. Phân tích nguyên nhân
2. Sửa code
3. Chạy lại `npm run dev` → `npm run build`
4. Lặp đến khi pass 100%

**Cấm** kết luận task hoàn thành khi loop chưa pass.

### 0.5 Verify Summary (báo cáo bắt buộc)

| Step | Command | Result | Notes |
| ---- | ------- | ------ | ----- |
| Dev | npm run dev | ✅/❌ | |
| Build | npm run build | ✅/❌ | |
| Review | implementation | ✅/❌ | |

**Production Ready Gate:** chỉ ✅ khi tất cả ✅

---

## Phase 1 — Checklist chi tiết (sau khi Phase 0 pass)

### Code Quality

- [ ] Không có `console.log` để debug
- [ ] Không có `// TODO` không có context
- [ ] Không có import không dùng
- [ ] Không có biến/hàm không dùng
- [ ] Đã chạy `npm run lint` pass
- [ ] Đã format đúng 4-space indent

### Next.js 16 + PPR (`cacheComponents: true`)

- [ ] `new Date()` / runtime APIs: `connection()` + `<Suspense>` hoặc Client trong Suspense
- [ ] `<Button asChild>`: Slot chỉ 1 child — không spinner sibling (xem `06-shadcn-semantic.mdc`)

### Functional

- [ ] Happy path: hoạt động đúng
- [ ] Loading state: có Skeleton/spinner
- [ ] Empty state: có placeholder rõ ràng
- [ ] Error state: có toast/inline message
- [ ] Auth check: protected actions có guard
- [ ] Edge: tested rapid clicks, offline, large data

### Multi-step forms (RHF) — nếu có `react-hook-form`

- [ ] **Không** `useEffect(() => ..., [watch()])` — dùng `watch((data) => ...)` subscription
- [ ] Auto-save draft: **không** `setState` parent mỗi keystroke cùng lúc với form đang edit
- [ ] Radix `Select` + RHF: bọc `Controller`, controlled `value`/`onValueChange`
- [ ] Test: vào form từ CTA (VD Apply Now) → Step 2 → mở Select không crash
- [ ] Xem `25-multi-step-apply-forms.mdc` khi sửa `app/apply/`

### UX

- [ ] Mobile responsive (test ≤700px)
- [ ] Dark mode: render đúng cả 2 mode
- [ ] i18n: text dùng `t("key")`, không hardcode
- [ ] A11y: aria-label cho icon-only button
- [ ] A11y: focus state visible
- [ ] A11y: keyboard navigation work

### Performance

- [ ] `"use client"` chỉ thêm khi thực sự cần
- [ ] Image: dùng next/image + alt
- [ ] Heavy component: dynamic import nếu non-critical
- [ ] List > 50 items: cân nhắc virtualization

### Integration

- [ ] API endpoint test pass
- [ ] Cache invalidation đúng (tags)
- [ ] Optimistic update có rollback
- [ ] Server Action: revalidatePath sau mutation

### Git Hygiene

- [ ] `git status` clean (chỉ changes liên quan task)
- [ ] Không có file test trong source
- [ ] Không commit `.env`, secret

### Confirmation

- [ ] Đã báo cáo dạng bảng cho user?
- [ ] Đã hỏi user confirm clean trước khi commit?

---

**Nếu BẤT KỲ item Phase 0 hoặc Phase 1 unchecked → FIX trước khi báo done.**
