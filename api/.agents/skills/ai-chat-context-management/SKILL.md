---
name: ai-chat-context-management
description: Best practices for managing AI tool call state, avoiding context loss across chat turns, and handling hidden system messages in Gemini UI integrations.
---

# AI Chat Context & Tool State Management

Kỹ năng này đúc kết kinh nghiệm xử lý luồng giao tiếp giữa AI Agent, Database và UI Frontend khi Agent thực thi các chức năng gọi Tool (Function Calling) nhưng bị giới hạn về việc sinh ra văn bản.

## 1. Vấn đề "Mất trí nhớ" (Context Loss) sau khi gọi Tool

**Nguyên nhân:**
- Khi Agent gọi Tool (ví dụ: `ui_fill_form`), chúng ta thường có System Prompt ép Agent phải im lặng (trả về chuỗi rỗng) để tránh sinh ra các câu chat thừa thãi trong quá trình xử lý ngầm.
- Phía Backend bắt được sự im lặng này và thay thế bằng một câu Fallback cứng (VD: *"Đã thực hiện xong thao tác trên giao diện."*).
- Câu Fallback này được lưu vào Database ở bảng `ChatMessage`. Thông tin về Tool Call (`functionCall`, `arguments`) **bị bỏ đi hoàn toàn** để tiết kiệm dung lượng hoặc do schema DB chỉ lưu Text.
- Ở lượt chat tiếp theo, khi User đưa ra yêu cầu tiếp nối (VD: *"đổi sang 1 ngày"* thay vì *"đổi thời gian xử lý sang 1 ngày"*), Agent đọc lại History từ DB nhưng không hề biết trước đó nó vừa tương tác với field nào. Hậu quả là Agent từ chối gọi Tool vì thiếu thông tin ngữ cảnh.

**Giải pháp (Hidden System Log):**
1. **Tại Backend (Gemini Service):** 
   - Sau khi thực thi Tool xong, nếu phải chèn câu Fallback, hãy NỐI THÊM (append) một thẻ HTML ẩn chứa thông tin Tool.
   - Ví dụ: `reply += \` <!--system_log:${JSON.stringify({ tool: callName, args: callArgs })}\-->\``
   - Chú ý: Phải đảm bảo thẻ này **LUÔN ĐƯỢC CHÈN** bất kể Agent có sinh ra text hay im lặng.
2. **Tại Database:**
   - Lưu trữ nguyên văn chuỗi chứa thẻ ẩn này vào DB. Điều này giúp lịch sử chat giữ được trạng thái thực thi.
3. **Tại Frontend (UI Component):**
   - Trước khi render tin nhắn, phải có bước Regex dọn dẹp để **ẩn đi thẻ HTML này khỏi mắt User**.
   - Ví dụ: `message.replace(/<!--[\s\S]*?(?:-->|$)/g, "").trim()`

Với mô hình này, UI vẫn hiển thị sạch đẹp, nhưng khi Backend query DB để gửi History cho Agent, Agent sẽ đọc được thẻ ẩn và "nhớ" lại chính xác thao tác nó vừa làm.

## 2. Vấn đề "Bóng ma gõ phím" (Ghost Typing Bubble)

**Nguyên nhân:**
- Khi hệ thống gửi các tin nhắn ẩn dạng `[SYSTEM_HIDDEN]` hoặc các prompt cập nhật state không dành cho User, UI chat thường có cơ chế Optimistic UI (hiện ngay bubble "AI đang gõ...") khi phát hiện có request gửi đi.
- Vì tin nhắn là ẩn, kết quả trả về không được hiển thị, dẫn đến việc bubble "đang gõ..." hiện lên một lúc rồi tự biến mất mà không có tin nhắn nào xuất hiện.

**Giải pháp:**
- Tại Hook `useChat` (hoặc hàm gửi tin), phải kiểm tra content của tin nhắn trước khi đưa vào mảng Optimistic.
- Nếu `message.startsWith("[SYSTEM_HIDDEN]")`, tuyệt đối không đẩy một tin nhắn giả (optimistic) có role `model` vào UI state. 

## 3. Quản lý Fallback Error Message hiệu quả

**Nguyên nhân:**
- Khi áp dụng Strict System Prompt (như *"TUYỆT ĐỐI KHÔNG GỌI TOOL nếu user đưa sai Enum"*), Agent sẽ ngoan ngoãn từ chối gọi tool. Nhưng do kèm theo rule *"Phải im lặng khi tương tác tool"*, Agent có thể bối rối và trả về chuỗi rỗng `""`.
- Khi Backend nhận chuỗi rỗng và `callCount === 0`, nó sẽ văng lỗi Fallback chung chung (VD: *"Hệ thống đang tải..."*) khiến User không hiểu mình sai ở đâu.

**Giải pháp:**
- Luôn kiểm tra song song `callCount` (số lần gọi tool) và text trả về.
- Nếu `callCount === 0` và chuỗi rỗng, đó là lỗi Agent không biết làm gì. Nên xử lý linh hoạt ở System Prompt. Thêm câu thần chú này vào Prompt: *"Nếu thiếu thông tin gọi tool, BẠN BẮT BUỘC PHẢI MỞ MIỆNG (sinh ra text) để hỏi ngược lại User"*.
- Fallback phía Server chỉ nên là chốt chặn cuối cùng cho các lỗi sập kết nối hoặc rate limit, không nên dùng để xử lý logic hội thoại.
