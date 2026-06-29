/**
 * Nén và resize hình ảnh phía Client sử dụng HTML Canvas API.
 *
 * TẠI SAO dùng phương pháp này:
 * - Giảm dung lượng ảnh Base64 từ vài MB xuống còn 100KB - 300KB (giảm hơn 90%), tránh việc xử lý các chuỗi
 *   dữ liệu quá lớn gây nghẽn Main Thread khi React cập nhật state. Điều này giúp các hiệu ứng và
 *   transition của Framer Motion hoạt động mượt mà ở mức 60fps mà không bị lag/giật.
 * - Giới hạn kích thước tối đa (rộng/cao) là 1600px để ảnh không quá nặng, nhưng vẫn đảm bảo độ sắc nét
 *   cực cao khi phóng to (zoom) toàn màn hình trên các màn hình Retina hoặc độ phân giải cao.
 * - Sử dụng định dạng JPEG với chất lượng 80% (0.8) là điểm cân bằng hoàn hảo giữa dung lượng tải và chất lượng
 *   hình ảnh hiển thị thực tế của người dùng.
 *
 * @param file Đối tượng File ảnh gốc được chọn từ thẻ input của trình duyệt
 * @returns Promise giải quyết ra chuỗi Base64 của ảnh đã được nén và resize tối ưu
 */
export function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        // TẠI SAO kiểm tra loại file: Đảm bảo chỉ xử lý hình ảnh hợp lệ nhằm tránh các lỗi phát sinh
        // khi cố gắng vẽ các tệp không phải ảnh lên Canvas.
        if (!file.type.startsWith("image/")) {
            reject(new Error("Tệp tin được chọn không phải là hình ảnh hợp lệ"));
            return;
        }

        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;

        // TẠI SAO dùng URL.createObjectURL thay vì FileReader ngay lập tức:
        // createObjectURL tạo ra một URL tham chiếu trực tiếp đến file trong bộ nhớ trình duyệt một cách
        // đồng bộ và nhanh chóng, không phải đọc và chuyển đổi toàn bộ dữ liệu file sang chuỗi nhị phân lớn
        // ở Main Thread, giúp tối ưu hóa hiệu năng khởi đầu.
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // TẠI SAO cần tính toán lại kích thước: Đảm bảo ảnh được thu nhỏ về dưới mức 1600px
            // nhưng vẫn giữ nguyên tỷ lệ khung hình (Aspect Ratio) gốc, tránh làm ảnh bị méo mó.
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                }
            }

            // TẠI SAO tạo canvas: Để thực hiện vẽ lại và nén ảnh trực tiếp trên Client thông qua
            // engine render đồ họa hiệu năng cao của trình duyệt.
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Không thể khởi tạo Context 2D của Canvas"));
                return;
            }

            // Vẽ ảnh gốc lên canvas ở kích thước mới đã được thu nhỏ tối ưu
            ctx.drawImage(img, 0, 0, width, height);

            // TẠI SAO chuyển sang image/jpeg với chất lượng 0.8:
            // PNG không hỗ trợ nén chất lượng và thường có dung lượng rất lớn. Việc ép sang JPEG chất lượng 80%
            // giúp loại bỏ các thông tin dư thừa của pixel mà mắt người không thể nhận biết được, giúp giảm
            // đáng kể dung lượng lưu trữ và truyền tải.
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

            // TẠI SAO giải phóng Object URL lập tức: Giải phóng vùng nhớ tạm thời của trình duyệt
            // đang liên kết với tệp tin ảnh gốc, ngăn ngừa rò rỉ bộ nhớ (memory leaks).
            URL.revokeObjectURL(objectUrl);
            resolve(compressedDataUrl);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };

        img.src = objectUrl;
    });
}
