---
name: guide-page-redesign-workflow
description: >-
  Tự động hóa quy trình crawl dữ liệu thô từ URL bài viết và phân tích, thiết kế lại thành trang React Component tĩnh (hardcoded .tsx) theo chuẩn Art Gallery của dự án FASTVISA UI.
---

# Guide Page Redesign Workflow

## Overview
Skill này cung cấp quy trình (workflow) từng bước để chuyển đổi một bài viết thô trên trang web thành một trang giao diện tuyệt đẹp (Next.js App Router Component) mang phong cách "Art Gallery". Skill này đặc biệt hữu ích khi cần thiết kế nhanh hàng loạt các trang Hướng dẫn (Guide) hoặc Tin tức (News) tĩnh mà không cần thông qua hệ thống Database hay CMS phức tạp.

## Dependencies
Để đảm bảo giao diện đầu ra luôn đạt chất lượng "Premium", Agent phải kế thừa tư duy từ các skill sau:
- `design-taste-frontend`: Thẩm định chất lượng UI, cấu trúc Bento Grid, Timeline, Animation.
- `frontend-design`: Đảm bảo clean code React (TypeScript), Tailwind CSS và Next.js patterns.

## Quick Start
Gõ lệnh sau vào chat để kích hoạt Skill:
`Hãy dùng guide-page-redesign-workflow để lấy dữ liệu từ https://vietnamevisa.com/Guide/... và tạo trang /guide/ten-slug`

## Workflow

### 1. Crawl Dữ liệu (Read URL Content)
- Sử dụng công cụ `read_url_content` để đọc URL gốc (ví dụ từ `vietnamevisa.com`) do người dùng cung cấp.
- Lưu ý: Dữ liệu trả về sẽ là định dạng Markdown hoặc Text thô. Bỏ qua các thành phần rác như Header, Footer, Sidebar của trang gốc, chỉ tập trung vào phần ruột (Heading, Paragraph, List).

### 2. Phân tích Nội dung (Content Analysis & LLM Inference)
- Trích xuất các luồng thông tin chính: Đâu là Title, Subtitle, Mở bài, Các bước thực hiện (Procedures), Bảng giá (nếu có), và Câu hỏi thường gặp (FAQ).
- **Flexibility & Error Handling:** Nếu dữ liệu thô bị lộn xộn hoặc không chia cấu trúc rõ ràng, Agent phải tự động dùng logic (Inference) để gộp nhóm, sắp xếp lại các đoạn văn bản sao cho hợp lý và tối ưu nhất cho thiết kế UI (không dừng lại hỏi User nếu không thực sự nghiêm trọng).

### 3. Lựa chọn UI Components mẫu (Map to Design System)
Dựa vào nội dung đã phân tích, ánh xạ vào các Components có sẵn hoặc phong cách của FASTVISA:
- **Title/Subtitle:** Dùng `ArticleHero` (với full-width background image, gradient overlay đen mờ). Ảnh Unplash tự động fallback nếu không có ảnh tĩnh.
- **Mục lục:** Dùng `FloatingTOC` tái sử dụng từ dự án.
- **Bố cục Visual (QUAN TRỌNG):** Phải bổ sung ảnh minh hoạ sinh động vào bài viết, TUYỆT ĐỐI KHÔNG để một trang có quá nhiều chữ khô khan. Sử dụng các cấu trúc **Bento Grid** (layout lưới bất đối xứng) hoặc **Image Gallery** cho các phần danh sách, định nghĩa, so sánh. Đối với các khối nội dung dài (như danh sách yêu cầu, quy định), BẮT BUỘC phải chia layout 2 cột (grid-cols-2) và chèn thêm hình ảnh minh họa thật (Unsplash) kế bên để phá vỡ sự nhàm chán.
- **Bảng dữ liệu (Data Tables):** Đối với các bảng dữ liệu (như danh sách quốc gia), BẮT BUỘC bổ sung **Cờ quốc gia (Flags - dùng API flagcdn.com hoặc component tương đương)** nằm bên trái tên nước. Phải tích hợp thêm tính năng tìm kiếm (Search) và sắp xếp (Sort) cơ bản ở Client-side để nâng cao trải nghiệm UX.
- **Hình ảnh & Next.js Image:** 
  - Nếu URL ảnh Unsplash bị lỗi (404, cần đăng nhập), tự động thay thế/trám bằng bất kỳ URL ảnh public nào khác có cùng chủ đề để đảm bảo UI không bị vỡ. Khuyên dùng các link cố định hoặc resource minh họa có sẵn.
  - **Lưu ý Code:** Khi dùng `<Image fill />` của Next.js, THẺ WRAPPER BÊN NGOÀI BẮT BUỘC PHẢI CÓ `className="relative"` để tránh lỗi `Invalid "position"`.
- **Các bước (Quy trình):** Thiết kế dạng Timeline thả dọc hoặc Horizontal Scroll kết hợp hình ảnh.
- **Tính năng/Quyền lợi (Why Us):** BẮT BUỘC dùng cấu trúc Bento 2.0 (Premium Cards) giống hệt trang `/about-us` của dự án (ví dụ: `rounded-[2rem] bg-(--color-surface-2) hover:-translate-y-1 shadow-lg`, có icon box riêng và micro-interactions). Không dùng các thẻ Div xám/trắng đơn điệu.
- **FAQ:** Dùng Accordion Component chuẩn.

### 4. Viết Code Component tĩnh (Generate Code)
- Sử dụng công cụ `write_to_file` (hoặc `replace_file_content`) để viết thẳng mã nguồn JSX/TSX vào file: `d:\F8_K15_BTVN\FASTVISA\ui\src\app\(main)\guide\[slug]\page.tsx` (hoặc tạo custom component trong thư mục `features/guide/`).
- Code sinh ra phải đảm bảo:
  - 100% Type-safe (TypeScript).
  - Tích hợp chuẩn Tailwind CSS v4.
  - Hỗ trợ hoàn hảo Dark Mode (sử dụng CSS Variables của hệ thống như `bg-(--color-bg)`, `text-(--color-text-primary)`). KHÔNG dùng các hardcode background như `bg-white` ở các thẻ wrap lớn.
  - Hiệu ứng xuất hiện mượt mà (Framer Motion: `reveal-on-scroll`, `initial/animate`).

### 5. Xác nhận & Báo cáo (Verification)
- Agent sử dụng lệnh `npx tsc --noEmit` để kiểm tra lỗi Type.
- Báo cáo kết quả thành công cho người dùng (hoặc tạo Walkthrough Artifact nếu cần thiết) và mời người dùng refresh trình duyệt để chiêm ngưỡng tác phẩm.

## Common Mistakes
1. **Quên Dark Mode:** Lạm dụng `bg-white` hoặc màu tĩnh thay vì dùng biến CSS của theme hệ thống, dẫn đến trang web bị vỡ giao diện khi người dùng chuyển Dark Mode.
2. **Sử dụng raw HTML:** Dùng `dangerouslySetInnerHTML` để nhét thẳng dữ liệu thô bị lẫn `style` inline của web cũ thay vì tách text ra nhét vào các React Component. Điều này CẤM tuyệt đối.
3. **Quên xoá inline style:** Nếu phải dùng một phần HTML, không dùng Regex để clean sạch các attributes rác (`style`, `class`) từ trang gốc.
