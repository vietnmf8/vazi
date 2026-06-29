---
name: debug-ui-layout-shift
description: Kỹ năng và tư duy để debug các lỗi Layout Shift, Flicker, Jerk trong UI. Định hình cách AI phải yêu cầu người dùng cung cấp bằng chứng DevTools để điều tra lỗi giao diện.
---

# Kỹ năng: Debug UI Layout Shift & Tương tác với người dùng

Skill này được sử dụng khi AI nhận được báo cáo về các lỗi liên quan đến **UI giật lag, Layout Shift, Flicker, khoảng trống bất thường (gap/margin/padding sai lệch)** hoặc các lỗi vi giao diện (micro-interactions) rất khó phát hiện.

## 1. Nguyên tắc cốt lõi trong tư duy giải quyết sự cố UI
- **Không bao giờ đoán mò hoàn toàn dựa trên mã nguồn:** React và CSS (đặc biệt là Flexbox, Grid, AnimatePresence) có những Edge Cases cực kỳ phức tạp về Rendering Flow, Margin Collapse, và Flex Gap.
- **Quan tâm đến "Khung xương" (DOM Hierarchy):** Layout Shift thường xảy ra do:
  - Khối lượng layout (width/height) thay đổi đột ngột khi một DOM Node unmount/mount (VD: `AnimatePresence mode="wait"` không bọc chiều cao cố định).
  - Thuộc tính Margin/Padding/Gap được áp dụng sai phân cấp DOM (VD: dùng `marginTop` âm để triệt tiêu Flex Gap nhưng lại áp dụng cho thẻ con thay vì thẻ Flex Item trực tiếp).
  - Khối lượng bị dồn lên dồn xuống do `flex-col-reverse` kết hợp với `flex-grow`.

## 2. Quy tắc BẮT BUỘC: Chủ động yêu cầu Bằng chứng (Evidence-Based Debugging)
Khi người dùng báo cáo lỗi UI siêu nhỏ (OCD-level bugs) mà việc đọc code không thể ngay lập tức nhìn thấy vấn đề, **AI phải yêu cầu người dùng cung cấp bằng chứng trực quan**. 

**Hãy chủ động hỏi người dùng:**
1. *"Bạn có thể mở Chrome DevTools (Inspect Element), trỏ vào khu vực bị lỗi và chụp lại màn hình (như Frame 3) giúp tôi được không?"*
2. *"Bạn hãy để ý kỹ xem khi lỗi xảy ra, vùng xanh (content), vùng xanh lá (padding), hay vùng cam (margin) trong DevTools đang bị thay đổi kích thước?"*
3. *"Điều gì đang lấp đầy khoảng trống lúc bị giật? (Là margin của phần tử trên, padding của container, hay là một khoảng không do Flex Gap?)"*

Bằng chứng trực quan từ trình duyệt (DevTools) là "kim chỉ nam" duy nhất để khoanh vùng chính xác 100% nguyên nhân Layout Shift.

## 3. Checklist khi Debug Flexbox Layout Shift
Nếu lỗi liên quan đến Flexbox (đặc biệt là `flex-col-reverse`):
- **Flex Item vs Child Node:** Kiểm tra xem class/style tác động lên Layout đang nằm ở Flex Item hay Child Node. Nhớ rằng: *Flex Gap chỉ tác động lên Flex Item. Để triệt tiêu Flex Gap bằng Margin âm, Margin âm phải nằm trên Flex Item.*
- **Unmount/Mount Delay:** Kiểm tra các đoạn render có điều kiện (`if`, `&&`, hoặc `AnimatePresence`). Có khoảng thời gian nào (như transition delay) mà phần tử bị biến mất hoàn toàn khỏi DOM gây sập chiều cao container không?
- **Scroll Anchor:** Kiểm tra cơ chế tự động cuộn (auto-scroll) và vị trí đặt `flex-grow`.

## 4. Đúc kết bài học từ lỗi ChatMessageList (Margin Negative & Flex Gap)
- **Vấn đề:** Tin nhắn mới xuất hiện bị giật lên 12px tạo ra khoảng trống đáy.
- **Nguyên nhân gốc rễ:** Dùng `marginTop: -12px` ở thẻ con để mong triệt tiêu Flex Gap của container cha. Hậu quả là Flex Gap vẫn nới rộng container, còn thẻ con bị kéo lệch lên trên, để lại một khoảng trống ảo 12px.
- **Cách khắc phục chuẩn mực:** Đảo ngược phân cấp DOM (Swap Hierarchy). Đưa phần tử cần áp dụng Margin âm ra ngoài làm Flex Item trực tiếp. Lúc này Margin âm sẽ bù trừ hoàn hảo với Flex Gap.

## 5. Đúc kết bài học về Ánh xạ Index trong Danh sách đảo ngược (Reversed List)
- **Vấn đề:** Day Separator (dấu phân cách ngày) bị nhảy sai vị trí, tin nhắn bị đẩy giật cục khi có tin nhắn mới.
- **Nguyên nhân gốc rễ:** Khi dùng `column-reverse`, mảng tin nhắn đã bị đảo ngược (`renderedMessages = [...activeMessagesList].reverse()`). Tuy nhiên, thuật toán xác định vị trí của tin nhắn lại dùng `indexOf()` hoặc index cục bộ của mảng đã đảo ngược để tham chiếu lại mảng gốc. Điều này làm sai lệch hoàn toàn thứ tự khi có phần tử mới được thêm vào.
- **Cách khắc phục (O(1) thay vì O(n²)):** Ánh xạ chính xác Index toàn cục dựa vào Index cục bộ.
  Công thức: `globalIdx = activeMessagesList.length - 1 - idx` (với `idx` là index trong `renderedMessages`).
- **Ghi nhớ:** Luôn tính toán index dựa trên độ dài của mảng và vị trí tương đối, tuyệt đối tránh dùng `indexOf` trong vòng lặp render (`.map()`) vì nó gây ra độ phức tạp `O(n²)`.

## 6. Đúc kết bài học về "Đóng băng" (Freeze) Hiệu ứng CSS do Main Thread Blocking
- **Vấn đề:** Animation Exit (như thu nhỏ hoặc mờ dần) bị "đứng hình" (freeze) một tích tắc ngay trước khi biến mất, để lại một vệt mờ hoặc phần chữ bị cắt cụt.
- **Nguyên nhân gốc rễ:** Quá trình dọn dẹp DOM (unmount) dựa trên `setTimeout` chạy trên Main Thread của Javascript. Nếu ngay trước khi unmount (ví dụ ở 90% tiến trình animation), có một Component nặng được mount (như việc render một cục Markdown lớn của tin nhắn mới), Main Thread sẽ bị nghẽn (block).
- Cơ chế của trình duyệt: Khi Main Thread nghẽn, các Layout Transition (như `grid-template-rows`) sẽ bị đóng băng. Hệ quả là element đang animate dở dang sẽ kẹt lại trên màn hình lâu hơn dự kiến.
- **Cách khắc phục:** Căn chỉnh lại Timing. Đảm bảo thời gian Unmount (VD: 360ms) phải nhỏ hơn thời gian bắt đầu thực thi Render nặng (VD: Delay 380ms). Hãy để DOM được dọn dẹp sạch sẽ *trước khi* nhồi nhét xử lý nặng vào Main Thread.

> **Ghi nhớ:** Với UI/UX, mắt người dùng và DevTools luôn đúng. Hãy để DevTools dẫn đường!
