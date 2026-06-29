# Skill: Clarifying & Planning Before Action

**Trigger:** "lên plan", "lập kế hoạch", "planning", "phân tích yêu cầu", hoặc tự động khi nhận yêu cầu mơ hồ

## Nguyên tắc cốt lõi

> **TUYỆT ĐỐI KHÔNG** tự ý làm thêm nghiệp vụ ngoài yêu cầu.  
> **Nếu thấy nên có** → hỏi user, KHÔNG tự quyết.

---

## 4 Loại câu hỏi BẮT BUỘC tự kiểm

### A. Câu hỏi về Scope (cái gì làm, cái gì không)

**Tự hỏi:**

- Yêu cầu này gồm những "nghiệp vụ" gì?
- Có nghiệp vụ nào user **không nói rõ** nhưng ngầm hiểu cần có?
- Có nghiệp vụ nào "tốt nếu có" nhưng có thể user quên?

**Ví dụ user nói:** "Làm chức năng like cho bài viết"

**AI tự đặt câu hỏi:**

- Anonymous user có like được không? (Auth required hay không?)
- Có giới hạn rate-limit không? (Spam like)
- Like có notification không?
- Unlike có cần xác nhận không?
- Số like có cập nhật realtime hay refresh page mới thấy?
- Có hiển thị "ai đã like" (danh sách user) không?
- Optimistic update hay đợi server response?

### B. Câu hỏi về Edge Cases

**Tự hỏi:**

- Empty state thế nào?
- Loading state có Skeleton, spinner, hay text?
- Error state hiển thị toast hay inline message?
- Network offline thì sao?
- User chưa login mà thực hiện thì sao?
- Concurrent action (2 click nhanh) thì sao?

### C. Câu hỏi về Existing Code

**Tự hỏi (PHẢI grep TRƯỚC khi hỏi):**

- Đã có hook nào tương tự chưa? (`grep -r "useLike" src/`)
- Đã có Redux slice chưa?
- Đã có API endpoint chưa?
- Có pattern nào trong codebase đã handle case tương tự?

### D. Câu hỏi về Acceptance Criteria

**Tự hỏi:**

- Done là khi nào? (UI hiển thị đúng? Test pass? Deploy?)
- Có cần document gì không?
- Có cần i18n (vi/en) không?
- Có cần dark mode support không?

---

## Format khi hỏi user

**KHÔNG hỏi 1 cục dài.** Phân nhóm:

```markdown
## 📋 Trước khi lên Plan, tôi cần làm rõ một số điểm:

### 🔵 Scope (bạn xác nhận làm hay không làm)

1. Chức năng "Like" có cần lưu lịch sử ai đã like không?
   (Ảnh hưởng: cần thêm bảng `likes` + endpoint `GET /posts/:id/likes`)
2. Có cần notify owner bài viết khi có người like không?
   (Ảnh hưởng: cần WebSocket hoặc polling)

### 🟡 Behavior (lựa chọn UX)

3. Khi guest user click like → hiển thị popup login, hay disable button?
    - [ ] A: Popup login (giữ scroll position)
    - [ ] B: Disable + tooltip "Đăng nhập để like"
4. Update count realtime hay sau refresh?
    - [ ] A: Optimistic (đẹp UX nhưng có thể flicker nếu rollback)
    - [ ] B: Pessimistic (chờ server, an toàn)

### 🟢 Tôi thấy NÊN CÓ (xin permission)

5. Tôi đề xuất thêm animation heart-burst khi like (Framer Motion).
    - Lý do: tăng "delight moment", chuẩn UX 2026.
    - Cost: +5KB framer-motion (đã có sẵn trong project).
    - **Bạn cho phép thêm không?** [Y/N]

6. Tôi đề xuất thêm haptic feedback trên mobile (`navigator.vibrate(10)`).
    - Lý do: native feel.
    - **Cho phép không?** [Y/N]

### ⚪ Existing code tôi đã grep

- Đã tìm thấy `useLikePost` trong `src/features/post/hooks/usePostActions.js` ✅
- Đã có RTK Query `useLikePostMutation` trong `src/services/post.js` ✅
- Đã có optimistic update pattern ✅
  → Tôi sẽ reuse, không tạo mới.

---

⏸ **Tôi đợi câu trả lời rồi mới lên Plan chính thức.**
```

---

## Anti-pattern (AI thường mắc)

### ❌ Tự ý thêm tính năng không yêu cầu

User: "Làm form login"  
AI sai: _Làm form login + thêm "Remember me" + "Login with Google" + "Forgot password" + reCAPTCHA_  
AI đúng: _Chỉ form login. Hỏi: "Có cần Remember me / Social login / Forgot password / CAPTCHA không?"_

### ❌ Code ngay khi yêu cầu mơ hồ

User: "Cải thiện UI feed"  
AI sai: _Đổi color, thêm animation, redesign card layout, ..._  
AI đúng: _"Cải thiện theo hướng nào? Visual hierarchy / Performance / Engagement / A11y? Cho tôi 1-2 ví dụ cụ thể."_

### ❌ Bỏ qua existing code

User: "Thêm chức năng comment"  
AI sai: _Tạo `useComment` hook từ đầu_  
AI đúng: _Grep `src/features/` trước. Báo: "Đã có `useReply` rất gần với requirement. Tôi có nên extend hay tạo riêng?"_

---

## Khi nào KHÔNG cần hỏi?

- Task quá rõ ràng + scope nhỏ + low-risk (đổi color text, sửa typo)
- User đã cung cấp đầy đủ spec từ trước (file requirement, mockup)
- Đang trong middle of execution và task break thành sub-tasks rõ

→ Vẫn nên báo: _"Tôi sẽ làm X, không thêm Y. OK?"_ — nhanh nhưng vẫn confirm.

---

## Checklist

- [ ] Đã đọc kỹ yêu cầu, gạch chân từ khóa?
- [ ] Đã grep existing code để tránh duplicate?
- [ ] Đã phân loại 4 nhóm câu hỏi (Scope/Behavior/Suggest/Existing)?
- [ ] Đã format câu hỏi rõ ràng, có option lựa chọn?
- [ ] Đã pause và đợi user trả lời?
- [ ] KHÔNG tự thêm nghiệp vụ chưa được phép?
