# Hardware Acceleration Optimization Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Cải thiện hiệu suất và độ mượt mà (60fps) của các component tương tác nhiều nhất bằng cách đẩy (offload) quá trình animate sang GPU sử dụng thuộc tính `will-change`.

**Architecture:** Áp dụng `willChange: "transform, opacity"` một cách cố định (hardcoded) cho thẻ `<m.div>` của QuickApplyForm (khi bung phí phụ thu) và SmartEligibilityWidget (khi pop-up kết quả). Tránh dùng kỹ thuật gỡ layer để hạn chế layout shift, chấp nhận đánh đổi chút độ mờ chữ theo lựa chọn ưu tiên mượt mà tuyệt đối của user.

**Tech Stack:** React, Framer Motion, CSS GPU Compositing

---

### Task 1: Tối ưu Quick Apply Form

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/sections/QuickApplyForm.tsx:180-192`

**Step 1: Write the failing test**
(Skipped for UI CSS properties update, test directly via UI).

**Step 2: Run test to verify it fails**
Run: Start app and expand express delivery in Quick Apply form. Look for jank without hardware acceleration.

**Step 3: Write minimal implementation**

```tsx
                            <m.div
                                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                                animate={{ height: "auto", opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                                transition={{
                                    duration: 0.35,
                                    ease: [0.25, 1, 0.5, 1],
                                }}
                                className="overflow-hidden"
                                style={{ willChange: "transform, opacity, height" }}
                            >
```

**Step 4: Run test to verify it passes**
Run: Expand express delivery, observe smoothness and verify there are no extreme blurriness issues.

**Step 5: Commit**

```bash
git add src/components/sections/QuickApplyForm.tsx
git commit -m "perf(ui): add hardware acceleration to Quick Apply form expansion"
```

### Task 2: Tối ưu Smart Eligibility Widget

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/sections/SmartEligibilityWidget.tsx:219-232`

**Step 1: Write the failing test**
(Skipped for UI CSS properties update).

**Step 2: Run test to verify it fails**
Run: Select a country in Eligibility Checker. Watch for main thread blockage during the result popup.

**Step 3: Write minimal implementation**

```tsx
                            <m.div
                                key="result-panel"
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.25, ease: "easeOut", layout: { duration: 0.3, ease: "easeOut" } }}
                                role="status"
                                aria-live="polite"
                                className="mt-6"
                                style={{ willChange: "transform, opacity" }}
                            >
```

**Step 4: Run test to verify it passes**
Run: Select country, verify buttery smooth 60fps result popup.

**Step 5: Commit**

```bash
git add src/components/sections/SmartEligibilityWidget.tsx
git commit -m "perf(ui): add hardware acceleration to Eligibility result panel"
```

### Task 3: Verify Toàn diện Performance & Text Blurriness
**Files:**
- None

**Step 1: Write the failing test**
N/A

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Mở Chrome DevTools -> Performance tab. Bật CPU Throttling (4x slowdown). Tương tác với Quick Apply và Smart Eligibility. So sánh độ mượt so với trước. Kiểm tra mắt thường xem chữ có bị mờ không thể chấp nhận không.

**Step 4: Run test to verify it passes**
N/A

**Step 5: Commit**
N/A
