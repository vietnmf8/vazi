import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";

const navigateToPageDeclaration: FunctionDeclaration = {
    name: "navigate_to_page",
    description: "SỬ DỤNG công cụ này khi người dùng CÓ Ý ĐỊNH RÕ RÀNG muốn chuyển trang (VD: 'Đưa tôi đến trang nộp đơn', 'Mở trang liên hệ giúp'). KHÔNG dùng để trả lời các câu hỏi lấy thông tin ngắn gọn về đội ngũ hay công ty (dùng get_page_content thay thế). " +
        "TUYỆT ĐỐI KHÔNG gọi tool này cho các khái niệm có FLEX-routing đã được scroll_page tự xử lý " +
        "(vd 'quy trình thực hiện'/'how it works', 'bảng giá tổng quan') — với các khái niệm này, CHỈ " +
        "gọi DUY NHẤT scroll_page (không gọi thêm navigate_to_page trong cùng lượt), vì scroll_page đã " +
        "tự quyết định điều hướng sang trang chi tiết khi cần, gọi thêm navigate_to_page sẽ tạo 2 hành " +
        "động xung đột.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            path: {
                type: SchemaType.STRING,
                format: "enum",
                description: "Đường dẫn (path) của trang web. CHỈ ĐƯỢC CHỌN 1 TRONG CÁC ĐƯỜNG DẪN SAU, TUYỆT ĐỐI KHÔNG BỊA ĐƯỜNG DẪN KHÁC:\n" +
                             "- '/' (Trang chủ)\n" +
                             "- '/about-us' (Về chúng tôi)\n" +
                             "- '/check-status' (Tra cứu trạng thái)\n" +
                             "- '/contact-us' (Liên hệ)\n" +
                             "- '/emergency-inquiry' (Hỗ trợ khẩn cấp / Urgent)\n" +
                             "- '/faqs' (Hỏi đáp)\n" +
                             "- '/how-to-apply' (Hướng dẫn nộp đơn)\n" +
                             "- '/guide' (Cẩm nang chung)\n" +
                             "- '/guide/vietnam-visa-fees' (Bảng giá Visa)\n" +
                             "- '/guide/payment-guideline' (Hướng dẫn thanh toán)\n" +
                             "- '/guide/extra-services' (Dịch vụ bổ sung)\n" +
                             "- '/guide/visa-extension' (Gia hạn Visa)\n" +
                             "- '/guide/visa-exemptions' (Miễn thị thực)\n" +
                             "- '/apply' (Trang nộp đơn chính)",
                enum: [
                    "/",
                    "/about-us",
                    "/check-status",
                    "/contact-us",
                    "/emergency-inquiry",
                    "/faqs",
                    "/how-to-apply",
                    "/guide",
                    "/guide/vietnam-visa-fees",
                    "/guide/payment-guideline",
                    "/guide/extra-services",
                    "/guide/visa-extension",
                    "/guide/visa-exemptions",
                    "/apply"
                ]
            }
        },
        required: ["path"]
    } as FunctionDeclarationSchema
};

async function executeNavigateToPage(args: { path: string }) {
    // Với UI Action Tool, Backend thực chất không cần truy xuất DB.
    // Việc trả về JSON này chỉ để Gemini biết là tool đã được gọi thành công,
    // và để Frontend bắt được sự kiện tool_processing qua WebSockets (đã setup).
    return {
        action: "NAVIGATION_TRIGGERED",
        destination: args.path,
        message: `Đã kích hoạt chuyển hướng người dùng đến trang ${args.path}.`
    };
}

aiToolRegistry.register("navigate_to_page", {
    declaration: navigateToPageDeclaration,
    execute: executeNavigateToPage,
    category: "UI_MANIPULATION"
});
