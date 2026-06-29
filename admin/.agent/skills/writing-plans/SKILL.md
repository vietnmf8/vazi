---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. 

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

## 1. Checklist Theo Dõi Tiến Độ
- [ ] Phân tích User Flow & Kết quả kỳ vọng
- [ ] Task 1: [Tên Task]
- [ ] Task N: [Tên Task]
- [ ] Verification: cURL 100% cases (Main, Sub, Edge)
- [ ] Verification: Log Analysis (app.log, api.log)
- [ ] Verification: Build & Lint Pass

## 2. User Flow & Kết Quả Kỳ Vọng
- **User Flow:** [Mô tả chi tiết các bước user/admin thao tác trên giao diện/API]
- **Kết Quả Kỳ Vọng:** [Mô tả cụ thể màn hình, data, state sau khi flow hoàn tất]

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `tests/exact/path/to/test.ts`

**Step 1: Write the failing test**

```typescript
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/path/test.ts`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```typescript
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/path/test.ts`
Expected: PASS
```

## Verification Plan (Bắt Buộc)

**Phải chèn phần này vào CUỐI của mỗi file Plan:**

```markdown
## Verification Plan (Bắt Buộc)

> **CẢNH BÁO:** Bắt buộc áp dụng tiêu chuẩn kiểm chứng nghiêm ngặt tương tự `phase-verification`. Không được tự động kết luận thành công nếu chưa pass toàn bộ các bước dưới đây.

**1. Mô phỏng cURL Http Request Thực Tế (Báo cáo Input/Output):**
- Bắt buộc giả lập các tình huống thật như User/Admin Flow. Đảm bảo pass 100%.
- **Main Cases:** (Lệnh cURL -> Kết quả thực tế đạt được)
- **Sub/Edge Cases:** (Lệnh cURL cho data sai, thiếu params -> Kết quả thực tế đạt được)

**2. System Log Analysis:**
- Bắt buộc theo dõi `app.log` và `api.log` trong lúc test cURL/UI.
- **Tiêu chí:** Không có dòng lỗi (Error) hay cảnh báo ẩn (Hidden Warning) nào xuất hiện.

**3. Build & Lint Check:**
- Chạy `npm run lint` ở `@api` và `@ui` (Pass 100%).
- Chạy `npm run build` ở `@api` và `@ui` (Pass 100%).
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD

## Execution Handoff

After saving the plan, use a single execution path:

**"Plan complete and saved to `docs/plans/<filename>.md`.**
**Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode."**

Execution requirements:
- **Entry workflow:** `.agent/workflows/execute-plan.md`
- **Execution skill:** `.agent/skills/executing-plans/SKILL.md`
- **Enforced execution model:** `.agent/skills/single-flow-task-execution/SKILL.md`
- **Tracking:** update `<project-root>/docs/plans/task.md` (table-only tracker)
