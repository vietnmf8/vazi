# Optimistic UI & Background Upload cho Reels Admin

## Mục tiêu
Cải thiện trải nghiệm UX khi Admin tải lên (upload) số lượng lớn ảnh cùng lúc trong phần "Tạo Reel mới" (`/content/reels`). Giảm thiểu thời gian chờ bằng cách áp dụng **Optimistic UI**, hiển thị trước hình ảnh ở trạng thái mờ kèm spinner, và tối ưu hóa tốc độ tải lên ngầm (Background Upload) với cơ chế chạy song song theo nhóm.

## Cấu trúc Design (Quyết định đã được phê duyệt)

### 1. Visual Representation (Hiển thị Lạc quan - Optimistic UI)
- **Thiết kế:** Thay vì hiển thị một Spinner chặn (block) toàn bộ giao diện hoặc một thanh tiến trình tổng đơn điệu, các hình ảnh ngay lập tức được load từ máy local bằng `URL.createObjectURL` và đưa vào khung lưới (Grid) hiển thị trước.
- **Trạng thái đang tải:** Mỗi ảnh đang trong quá trình upload sẽ được áp dụng class `opacity-60` và bị che phủ bởi một Spinner xoay (Overlay). Sau khi ảnh đó upload thành công, nó sẽ tự động xóa lớp mờ và ẩn Spinner đi, hiện rõ ràng. Giống hệt UX của phần đính kèm ảnh trong Live Chat.

### 2. Error Handling (Xử lý lỗi cục bộ)
- **Thiết kế:** Thay vì hủy bỏ toàn bộ tiến trình hoặc vứt bỏ ảnh khi có 1 ảnh bị lỗi mạng, ảnh bị lỗi vẫn được giữ lại trên lưới (Grid). 
- **Tương tác:** Ảnh lỗi sẽ hiển thị 1 icon báo lỗi (VD: Dấu chấm than đỏ) thay cho Spinner, kèm theo một nút "Thử lại" (Retry) để Admin bấm tải lại bức ảnh đó, hoặc "Xóa" (Delete) để bỏ ảnh đó ra khỏi danh sách.

### 3. Concurrency Model (Xử lý đồng thời)
- **Thiết kế:** Hiện tại hệ thống đang sử dụng vòng lặp tuần tự (`for...of`) khiến việc chờ đợi diễn ra rất lâu. Thay vì dùng `Promise.all` tung toàn bộ ảnh lên cùng lúc (nguy cơ bị Rate Limit từ Backend/Cloudinary), ta áp dụng thuật toán **Concurrency Limit (Batching)**.
- **Cơ chế:** Upload đồng thời tối đa 3-5 ảnh cùng một lúc. Ngay khi có 1 ảnh tải xong, slot trống sẽ được điền bằng ảnh tiếp theo trong hàng đợi cho đến khi hết danh sách.

## Kế hoạch chuyển tiếp
- Thực hiện lưu trữ file Design này theo quy trình của FASTVISA.
- Triển khai Skill `writing-plans` để chia nhỏ task kỹ thuật cho implementation.
