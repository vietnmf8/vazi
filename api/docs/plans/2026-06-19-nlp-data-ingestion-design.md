# Tích hợp Dữ liệu Động vào Local NLP Engine (Data Ingestion)

## 1. Mục tiêu (Overview)
- Biến Local NLP Engine (`node-nlp`) từ việc chỉ dùng dữ liệu tĩnh (`chatbot-scenarios.ts`) thành hệ thống có khả năng tự động học dữ liệu thực tế từ Database.
- Phạm vi dữ liệu: Bảng `Faq`, `PricingRule`, và `EligibilityRule`.
- Đảm bảo độ chính xác cực cao (chỉ bắt intent khi chắc chắn) và vẫn giữ nguyên ưu điểm phản hồi <5ms với 0 token lúc runtime.

## 2. Kiến trúc & Data Flow
1. **Thay đổi Schema (Prisma Migration)**:
   - Thêm cột `trainingPhrases` (dạng JSON) vào 3 model: `Faq`, `PricingRule`, `EligibilityRule`.
   - Cột này dùng để lưu trữ vĩnh viễn các câu hỏi biến thể (variations) do AI sinh ra.

2. **Quá trình Đồng bộ / Nạp dữ liệu (Ingestion Sync)**:
   - Khi Admin thêm/sửa một bản ghi trên hệ thống CMS, Admin sẽ gọi một API Webhook mới (VD: `POST /api/chat/nlp/sync`).
   - Server kiểm tra các bản ghi chưa có `trainingPhrases`.
   - Nếu thiếu, Server sẽ gọi một prompt nhanh lên Gemini API để sinh ra 5-10 biến thể câu hỏi (VD: "Phí xin visa là bao nhiêu?", "Hết bao nhiêu tiền để làm visa?", "Visa có đắt không?").
   - Lưu các biến thể này lại vào DB.
   - Gọi hàm `manager.addDocument()` để nạp vào bộ nhớ và tiến hành `manager.train()`.

3. **Quá trình Khởi động Server (Startup Load)**:
   - Khi Server khởi động lại (restart), đọc toàn bộ `trainingPhrases` từ 3 bảng trên và load thẳng vào `node-nlp` mà KHÔNG CẦN gọi lại Gemini API.

## 3. Cấu trúc Intent (Intent Architecture)
Thay vì các Intent tĩnh như hiện tại, các Intent động từ DB sẽ được đánh mã prefix để dễ phân biệt và map ngược lại ID trong DB:
- Khóa Intent cho FAQ: `db.faq.{id}`
- Khóa Intent cho Giá: `db.pricing.{id}`
- Khóa Intent cho Luật Miễn/Giảm: `db.eligibility.{id}`

Khi Chatbot nhận diện được Intent bắt đầu bằng `db.`, nó sẽ tách ID ra, truy vấn DB để lấy câu trả lời (Answer) tương ứng và trả về cho người dùng ngay lập tức.

## 4. Rủi ro & Đánh giá (Trade-offs)
- **Rủi ro**: Khi lượng dữ liệu quá lớn (hàng nghìn câu FAQ), `node-nlp` có thể bị loãng (Intent Overlap), nhận diện sai câu hỏi.
- **Giải pháp**: 
  - Chỉ tập trung vào 3 bảng cốt lõi (FAQ, Pricing, Eligibility), bỏ qua bài viết Blog.
  - Sử dụng tham số `score` của NLP (ví dụ chỉ chấp nhận nếu độ tự tin > 0.85). Nếu tự tin thấp -> Chuyển sang Gemini xử lý mặc định.
