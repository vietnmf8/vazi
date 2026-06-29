import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";

/**
 * click_ui_element — UI Manipulation Tool (Track B)
 *
 * Cho phép AI giả lập thao tác click vật lý lên một phần tử UI bất kỳ.
 * Tool TỰ PHÁT HIỆN nếu target đang nằm ở trang khác với trang hiện tại
 * (so khớp với TARGET_PAGE_MAP) và tự kết hợp điều hướng trước khi click —
 * AI không cần (và không nên) gọi navigate_to_page riêng cho mục đích click.
 *
 * Frontend nhận 1 trong 2 SSE action tùy kết quả:
 *   - { action: "VIRTUAL_CLICK", target }                     → cùng trang, click ngay
 *   - { action: "NAVIGATE_AND_CLICK", destination, target }   → khác trang, chuyển trang rồi mới click
 *
 * Quy tắc sử dụng:
 *   - CHỈ dùng khi người dùng YÊU CẦU RÕ RÀNG "click", "bấm", "nhấn", "mở", "gửi"
 *     một nút hoặc phần tử cụ thể trên giao diện — DÙ phần tử đó ở trang hiện tại
 *     hay ở một trang khác.
 *   - KHÔNG dùng để chuyển trang đơn thuần không kèm ý định click (dùng navigate_to_page).
 *   - KHÔNG dùng để trả lời câu hỏi thông tin (dùng get_page_content thay thế).
 */

// Đánh dấu các target thuộc Header/Footer/ChatWidget — có mặt ở MỌI trang nên không bao giờ cần điều hướng.
const GLOBAL_PAGE = "GLOBAL" as const;

// Map target → route(s) chứa nó. Dùng để tool tự quyết định có cần điều hướng trước khi click không,
// KHÔNG để Gemini tự suy luận (tránh hallucination định tuyến — cùng nguyên tắc với navigate_to_page).
const TARGET_PAGE_MAP: Record<string, string | string[] | typeof GLOBAL_PAGE> = {
    // Header & Home
    "hero_apply": "/",
    "hero_check_status": "/",
    "btn-apply-header": GLOBAL_PAGE,
    "header_check_status": GLOBAL_PAGE,
    "lang-selector": GLOBAL_PAGE,
    "header_mobile_menu": GLOBAL_PAGE,
    "cta_apply": "/",
    "cta_check_status": "/",
    "chat-toggle": GLOBAL_PAGE,
    // Entry Gate Modal — render qua EntryGateProvider ở layout gốc, có thể mở ở MỌI trang
    // (hero_apply/btn-apply-header/cta_apply đều gọi openGate() bất kể đang ở route nào).
    "entry_gate_new_application": GLOBAL_PAGE,
    "entry_gate_fast_track_apply": GLOBAL_PAGE,
    "entry_gate_existing_urgent": GLOBAL_PAGE,
    // Quick Apply Form (focus_ui_field tool tái dùng map này qua getClickTargetDestination)
    "quick_apply_nationality": "/",
    "quick_apply_port": "/",
    "quick_apply_visa_option": "/",
    "quick_apply_processing_speed": "/",
    // Apply Step 1 (focus_ui_field tool tái dùng map này qua getClickTargetDestination)
    "apply_step1_visa_type": "/apply",
    "apply_step1_visa_category": "/apply",
    "apply_step1_port_of_entry": "/apply",
    "apply_step1_purpose_of_visit": "/apply",
    "apply_step1_applicant_count": "/apply",
    "apply_step1_processing_normal_7d": "/apply",
    "apply_step1_processing_urgent_4d": "/apply",
    "apply_step1_processing_urgent_2d": "/apply",
    "apply_step1_processing_urgent_1d": "/apply",
    "apply_step1_processing_urgent_4h": "/apply",
    "apply_step1_processing_urgent_2h": "/apply",
    "apply_step1_processing_last_minute": "/apply",
    // Guide — continue_to_apply xuất hiện cả ở Home (Quick Apply Form) và /apply
    "how_to_apply_start": "/how-to-apply",
    "continue_to_apply": ["/", "/apply"],
    // Check Status
    "check_status_submit": "/check-status",
    "check_status_download": "/check-status",
    // Contact
    "contact_submit": "/contact-us",
    "contact_send_another": "/contact-us",
    // Emergency
    "emergency_submit": "/emergency-inquiry",
    "emergency_ask_another": "/emergency-inquiry",
    "emergency_correction_whatsapp": "/emergency-inquiry",
    // FAQs
    "faqs_submit_question": "/faqs",
    "faqs_ask_another": "/faqs",
    // Apply flow
    "next_step2": "/apply",
    "next_step3": "/apply",
    "apply_step2_back": "/apply",
    "apply_step3_back": "/apply",
    "pay_with": "/apply",
};

const clickUiElementDeclaration: FunctionDeclaration = {
    name: "click_ui_element",
    description:
        "SỬ DỤNG khi người dùng YÊU CẦU CLICK/BẤM/NHẤN/MỞ/GỬI một nút cụ thể trên giao diện, " +
        "BẤT KỂ nút đó đang ở trang hiện tại hay ở một trang khác. " +
        "AI sẽ điều khiển con chuột ảo di chuyển đến đúng phần tử và click thật. " +
        "Tool TỰ ĐỘNG phát hiện nếu nút đích nằm ở trang khác và TỰ KẾT HỢP chuyển trang trước khi click — " +
        "TUYỆT ĐỐI KHÔNG gọi navigate_to_page riêng trước khi gọi tool này cho mục đích click, " +
        "chỉ gọi DUY NHẤT click_ui_element.\n\n" +
        "⚠️ QUY TẮC ƯU TIÊN KHI CÓ NHIỀU NÚT CÙNG TÊN:\n" +
        "  Trang chủ có nhiều nút 'Đăng ký ngay' / 'Apply Now'. Áp dụng ưu tiên sau:\n" +
        "  1. Nếu user KHÔNG chỉ định vị trí → LUÔN chọn 'hero_apply' (nút to lớn giữa màn hình,\n" +
        "     màu vàng nổi bật — đây là CTA chính mà mắt người dùng thấy đầu tiên khi vào trang).\n" +
        "  2. Chỉ chọn 'btn-apply-header' khi user nói RÕ 'trên header', 'thanh điều hướng', 'navigation bar'.\n" +
        "  3. BẮT BUỘC chọn 'cta_apply' khi user nói RÕ 'cuối trang', 'CTA section', 'phần dưới cùng' — " +
        "TUYỆT ĐỐI KHÔNG chọn 'btn-apply-header'/'hero_apply' trong trường hợp này dù tên nút hiển thị giống nhau.\n" +
        "  4. TƯƠNG TỰ cho 'Check Status': mặc định → 'hero_check_status'; header → 'header_check_status'; cuối trang → 'cta_check_status'.\n" +
        "  → KHÔNG HỎI LẠI user khi không chỉ định — tự áp dụng ưu tiên trên.\n" +
        "  5. NGOẠI LỆ QUAN TRỌNG: quy tắc 1-4 chỉ áp dụng khi mục đích là MỞ/ĐI ĐẾN trang Check Status. " +
        "Nếu current_url ĐÃ LÀ '/check-status' và user muốn TRA CỨU/SUBMIT mã booking đã điền → " +
        "LUÔN chọn 'check_status_submit', TUYỆT ĐỐI KHÔNG chọn hero/header/cta_check_status trong trường hợp này.\n" +
        "  6. NGOẠI LỆ #2: dù current_url CHƯA LÀ '/check-status', nếu user dùng động từ HÀNH ĐỘNG tra cứu " +
        "('tra cứu', 'kiểm tra trạng thái', 'check status của tôi') kèm ý muốn click/thực hiện ngay " +
        "('bấm', 'giúp tôi', 'làm ơn') — KHÔNG CHỈ muốn xem trang Check Status — thì PHẢI chọn " +
        "'check_status_submit' (tool tự kết hợp chuyển trang /check-status RỒI click Submit trong 1 bước), " +
        "TUYỆT ĐỐI KHÔNG chọn 'hero_check_status'/'header_check_status' (2 nút đó chỉ ĐƠN THUẦN dẫn tới " +
        "trang Check Status, không thực hiện hành động tra cứu nào, sẽ làm user phải tự bấm thêm 1 lần nữa).\n\n" +
        "DANH SÁCH PHẦN TỬ CÓ THỂ CLICK (chọn target phù hợp nhất):\n" +
        "— TRANG CHỦ & HEADER —\n" +
        "  'hero_apply'         → Nút 'Apply Now' to lớn ở giữa Hero section [ƯU TIÊN MẶC ĐỊNH]\n" +
        "  'hero_check_status'  → Nút 'Check Status' trong Hero section [ƯU TIÊN MẶC ĐỊNH]\n" +
        "  'btn-apply-header'   → Nút 'Apply Now' trên thanh header [CHỈ KHI user nói 'header']\n" +
        "  'header_check_status'→ Link 'Check Status' trên thanh header [CHỈ KHI user nói 'header']\n" +
        "  'lang-selector'      → Nút chọn ngôn ngữ / vùng miền (header)\n" +
        "  'header_mobile_menu' → Nút hamburger mở menu trên điện thoại\n" +
        "  'cta_apply'          → Nút 'Apply Now' ở CTA section cuối trang [CHỈ KHI user nói 'cuối trang']\n" +
        "  'cta_check_status'   → Nút 'Check Status' ở CTA section cuối trang [CHỈ KHI user nói 'cuối trang']\n" +
        "  'chat-toggle'        → Nút mở/đóng widget Chat\n" +
        "— HƯỚNG DẪN —\n" +
        "  'how_to_apply_start' → Nút 'Start Application' trên trang /how-to-apply\n" +
        "  'continue_to_apply'  → Nút 'Continue to Apply' trong Quick Apply Form\n" +
        "— FORM CHECK STATUS (/check-status) —\n" +
        "  'check_status_submit'   → Nút Submit để tra cứu hồ sơ theo mã booking\n" +
        "  'check_status_download' → Nút tải file visa đã duyệt (chỉ hiển thị khi status=COMPLETED)\n" +
        "— FORM LIÊN HỆ (/contact-us) —\n" +
        "  'contact_submit'      → Nút 'Send' gửi form liên hệ\n" +
        "  'contact_send_another'→ Nút 'Send Another' sau khi gửi thành công\n" +
        "— FORM KHẨN CẤP (/emergency-inquiry) —\n" +
        "  'emergency_submit'                → Nút Submit form yêu cầu khẩn cấp\n" +
        "  'emergency_ask_another'           → Nút gửi yêu cầu khác sau khi submit\n" +
        "  'emergency_correction_whatsapp'   → Nút WhatsApp để sửa hồ sơ\n" +
        "— FORM HỎI ĐÁP (/faqs) —\n" +
        "  'faqs_submit_question'→ Nút Submit gửi câu hỏi cho đội ngũ hỗ trợ\n" +
        "  'faqs_ask_another'   → Nút gửi câu hỏi khác sau khi submit. QUAN TRỌNG: nếu user VỪA submit " +
        "thành công 1 câu hỏi và giờ nói 'tôi muốn hỏi thêm'/'hỏi câu khác'/'một câu nữa'/'hỏi tiếp' — " +
        "BẮT BUỘC gọi click_ui_element(faqs_ask_another) NGAY, TUYỆT ĐỐI KHÔNG trả lời bằng text dù bạn " +
        "có thể tự trả lời câu hỏi đó — user muốn UI mở lại form để họ tự gõ, không phải bạn tự trả lời.\n" +
        "— QUY TRÌNH NỘP ĐƠN (/apply) —\n" +
        "  'continue_to_apply'  → Nút 'Continue to Apply' bắt đầu form\n" +
        "  'next_step2'         → Nút 'Next' chuyển từ bước 1 (chọn loại visa) → bước 2 (thông tin người nộp đơn)\n" +
        "  'next_step3'         → Nút 'Next' chuyển từ bước 2 (thông tin người nộp đơn) → bước 3 (thanh toán)\n" +
        "  'apply_step2_back'   → Nút 'Back' Ở BƯỚC 2, quay về BƯỚC 1 (chọn LOẠI VISA) — dùng khi user nói về " +
        "loại visa/visa option, KHÔNG nói về thông tin người nộp đơn/applicant\n" +
        "  'apply_step3_back'   → Nút 'Back' Ở BƯỚC 3, quay về BƯỚC 2 (THÔNG TIN NGƯỜI NỘP ĐƠN/applicant details) — " +
        "user nói 'người nộp đơn'/'applicant'/'thông tin đã điền' → LUÔN LÀ TARGET NÀY, không phải apply_step2_back\n" +
        "  'pay_with'           → Nút 'Proceed to Payment' (PayPal) ở bước 3\n" +
        "  'apply_step1_processing_normal_7d'    → Chọn tốc độ xử lý 'Normal · 7 Working Days' ở Bước 1\n" +
        "  'apply_step1_processing_urgent_4d'    → Chọn tốc độ xử lý 'Urgent · 4 Working Days' ở Bước 1\n" +
        "  'apply_step1_processing_urgent_2d'    → Chọn tốc độ xử lý 'Urgent · 2 Working Days' ở Bước 1\n" +
        "  'apply_step1_processing_urgent_1d'    → Chọn tốc độ xử lý 'Urgent · 1 Working Day' ở Bước 1\n" +
        "  'apply_step1_processing_urgent_4h'    → Chọn tốc độ xử lý 'Urgent · 4 Working Hours' ở Bước 1\n" +
        "  'apply_step1_processing_urgent_2h'    → Chọn tốc độ xử lý 'Urgent · 2 Working Hours' ở Bước 1\n" +
        "  'apply_step1_processing_last_minute'  → Chọn tốc độ xử lý 'Last Minute / Holiday' ở Bước 1\n" +
        "— ENTRY GATE MODAL (xuất hiện trên MỌI trang sau khi click hero_apply/btn-apply-header/cta_apply) —\n" +
        "  'entry_gate_new_application'  → Chọn 'No, I need a new E-Visa' — bắt đầu hồ sơ mới\n" +
        "  'entry_gate_fast_track_apply' → Chọn 'Yes, I have E-Visa & need Fast-Track' — đã có E-Visa, cần dịch vụ Fast-Track sân bay\n" +
        "  'entry_gate_existing_urgent'  → Chọn 'Yes, I applied but need urgent help' — đã nộp hồ sơ, cần hỗ trợ khẩn cấp",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            target: {
                type: SchemaType.STRING,
                format: "enum",
                description: "ID của phần tử cần click. CHỈ ĐƯỢC CHỌN 1 TRONG CÁC GIÁ TRỊ SAU:",
                enum: [
                    // Header & Home
                    "hero_apply",
                    "hero_check_status",
                    "btn-apply-header",
                    "header_check_status",
                    "lang-selector",
                    "header_mobile_menu",
                    "cta_apply",
                    "cta_check_status",
                    "chat-toggle",
                    // Guide
                    "how_to_apply_start",
                    "continue_to_apply",
                    // Check Status
                    "check_status_submit",
                    "check_status_download",
                    // Contact
                    "contact_submit",
                    "contact_send_another",
                    // Emergency
                    "emergency_submit",
                    "emergency_ask_another",
                    "emergency_correction_whatsapp",
                    // FAQs
                    "faqs_submit_question",
                    "faqs_ask_another",
                    // Apply flow
                    "next_step2",
                    "next_step3",
                    "apply_step2_back",
                    "apply_step3_back",
                    "pay_with",
                    "apply_step1_processing_normal_7d",
                    "apply_step1_processing_urgent_4d",
                    "apply_step1_processing_urgent_2d",
                    "apply_step1_processing_urgent_1d",
                    "apply_step1_processing_urgent_4h",
                    "apply_step1_processing_urgent_2h",
                    "apply_step1_processing_last_minute",
                    "entry_gate_new_application",
                    "entry_gate_fast_track_apply",
                    "entry_gate_existing_urgent",
                ]
            }
        },
        required: ["target"]
    } as FunctionDeclarationSchema
};

/**
 * Dùng lại ở 2 nơi: (1) executeClickUiElement bên dưới, (2) Guard của NLP Cache trong
 * chat.service.ts — NLP Cache trả actionPayload tĩnh { action:"VIRTUAL_CLICK", target }
 * không biết currentUrl, nên phải tự check lại bằng map này trước khi chấp nhận HIT,
 * nếu không sẽ phục vụ nhầm target ở trang khác (bypass hoàn toàn combo logic).
 */
export function isClickTargetOnCurrentPage(target: string, currentUrl: string): boolean {
    const owningPages = TARGET_PAGE_MAP[target];
    if (!owningPages) return true; // target lạ, không trong map — giữ hành vi cũ (coi như cùng trang)
    return (
        owningPages === GLOBAL_PAGE ||
        owningPages === currentUrl ||
        (Array.isArray(owningPages) && owningPages.includes(currentUrl))
    );
}

/**
 * Trả về route cần điều hướng đến nếu target KHÔNG ở currentUrl, hoặc `null` nếu cùng trang/GLOBAL.
 * Dùng lại ở NLP Cache resolver (chat.service.ts) để NLP cũng tự tính được combo NAVIGATE_AND_CLICK
 * mà KHÔNG cần rớt xuống Gemini — vẫn giữ zero-hallucination vì hoàn toàn dựa vào map tĩnh, không phải AI suy luận.
 */
export function getClickTargetDestination(target: string, currentUrl: string): string | null {
    const owningPages = TARGET_PAGE_MAP[target];
    if (!owningPages || isClickTargetOnCurrentPage(target, currentUrl)) return null;
    return Array.isArray(owningPages) ? owningPages[0] : owningPages;
}

async function executeClickUiElement(args: { target: string }, context?: { currentUrl?: string }) {
    const currentPath = context?.currentUrl || "/";
    const destination = getClickTargetDestination(args.target, currentPath);

    if (!destination) {
        // Cùng trang / GLOBAL (hoặc target không nằm trong map — fallback giữ hành vi cũ, click ngay tại chỗ)
        return {
            action: "ELEMENT_CLICK_TRIGGERED",
            target: args.target,
            message: `Đã kích hoạt click vào phần tử [data-ai-element="${args.target}"].`
        };
    }

    // Khác trang: kết hợp điều hướng trước rồi mới click — frontend tự lo phần scroll-nếu-cần sau khi mount
    return {
        action: "NAVIGATE_AND_CLICK_TRIGGERED",
        destination,
        target: args.target,
        message: `Đã kích hoạt chuyển đến trang ${destination} và click vào phần tử [data-ai-element="${args.target}"].`
    };
}

aiToolRegistry.register("click_ui_element", {
    declaration: clickUiElementDeclaration,
    execute: executeClickUiElement,
    category: "UI_MANIPULATION"
});
