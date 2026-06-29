import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";

/**
 * scroll_page — UI Manipulation Tool (Track B Feature #5, mở rộng 2026-06-22)
 *
 * Cho phép AI giả lập thao tác CUỘN TRANG đến 1 SECTION lớn (không click), độc lập với
 * click_ui_element. Tool TỰ PHÁT HIỆN nếu section đích nằm ở trang khác với trang hiện tại
 * (so khớp với SECTION_PAGE_MAP) và tự kết hợp điều hướng trước khi cuộn — AI không cần
 * (và không nên) gọi navigate_to_page riêng cho mục đích cuộn tới section.
 *
 * Frontend nhận 1 trong 3 SSE action tùy mode/kết quả:
 *   - { action: "SCROLL_PAGE", mode: "top"|"bottom" }                  → cuộn lên đầu/xuống cuối, mọi trang
 *   - { action: "SCROLL_PAGE", mode: "element", target }               → cùng trang, cuộn ngay tới section
 *   - { action: "NAVIGATE_AND_SCROLL", destination, target }           → khác trang, chuyển trang rồi mới cuộn
 *
 * Quy ước attribute (khác `click_ui_element`):
 *   - `click_ui_element` dùng `[data-ai-element="..."]` (phần tử CLICK được — button/link).
 *   - `scroll_page` dùng `[data-ai-target="..."]` (SECTION LỚN cuộn tới được).
 *
 * Quy tắc sử dụng:
 *   - CHỈ dùng khi người dùng YÊU CẦU "cuộn", "kéo xuống/lên", "xem phần X", "cho tôi xem X"
 *     MÀ KHÔNG kèm ý định click/bấm nút. Nếu user vừa muốn cuộn vừa muốn click → dùng
 *     click_ui_element (tool đó đã tự động cuộn tới phần tử trước khi click).
 *   - FLEX với navigate_to_page: một số khái niệm có CẢ section preview trên Home VÀ trang
 *     chi tiết riêng — ưu tiên trang chi tiết khi không đứng ở Home:
 *       • "Quy trình thực hiện" → ở Home dùng scroll target 'how_it_works'; ở trang khác
 *         dùng navigate_to_page('/how-to-apply') (trang chi tiết đầy đủ, không phải combo
 *         scroll quay về Home).
 *       • "Bảng giá" (không chỉ rõ E-Visa/VOA) → ở Home dùng scroll target 'pricing'; nếu
 *         user hỏi cụ thể E-Visa/VOA → LUÔN dùng 'pricing_evisa'/'pricing_voa' (tool tự combo
 *         điều hướng sang /guide/vietnam-visa-fees nếu cần), KHÔNG dùng 'pricing'.
 */

// Map target → route(s) chứa section đó. Dùng để tool tự quyết định có cần điều hướng trước khi
// cuộn không, KHÔNG để Gemini tự suy luận (tránh hallucination định tuyến).
const SECTION_PAGE_MAP: Record<string, string | string[]> = {
    // Trang chủ
    "how_it_works": "/",
    "pricing": "/",
    "trust_signals": "/",
    "faq": ["/", "/how-to-apply"],
    "comments": "/",
    "nationalities": "/",
    "quick_apply": "/",
    "blog_preview": "/",
    "cta_section": "/",
    // About Us
    "about_mission": "/about-us",
    "about_scene_slider": "/about-us",
    "about_team": "/about-us",
    "about_features": "/about-us",
    // Check Status
    "check_status_form": "/check-status",
    "check_status_faqs": "/check-status",
    // Contact Us
    "contact_info": "/contact-us",
    "contact_form": "/contact-us",
    // Emergency Inquiry
    "emergency_pricing": "/emergency-inquiry",
    "emergency_timeline": "/emergency-inquiry",
    "emergency_form": "/emergency-inquiry",
    "emergency_correction": "/emergency-inquiry",
    // FAQs
    "faqs_list": "/faqs",
    // How To Apply
    "how_to_apply_timeline": "/how-to-apply",
    "how_to_apply_documents": "/how-to-apply",
    // Guide hub
    "guide_links": "/guide",
    // Guide — Vietnam Visa Fees
    "pricing_evisa": "/guide/vietnam-visa-fees",
    "pricing_voa": "/guide/vietnam-visa-fees",
    "pax_discount": "/guide/vietnam-visa-fees",
    "extra_services_guide": "/guide/vietnam-visa-fees",
    // Apply
    "apply_form": "/apply",
};

const scrollPageDeclaration: FunctionDeclaration = {
    name: "scroll_page",
    description:
        "SỬ DỤNG khi người dùng YÊU CẦU CUỘN/KÉO TRANG hoặc XEM 1 SECTION cụ thể (vd: 'cuộn xuống " +
        "đầu/cuối trang', 'cho tôi xem quy trình thực hiện', 'xem bảng giá VOA') MÀ KHÔNG kèm ý định " +
        "click/bấm nút. KHÔNG dùng tool này nếu user muốn click/bấm — dùng click_ui_element (tool đó " +
        "tự cuộn rồi click). Tool TỰ ĐỘNG phát hiện nếu section đích nằm ở trang khác và TỰ KẾT HỢP " +
        "chuyển trang trước khi cuộn — TUYỆT ĐỐI KHÔNG gọi navigate_to_page riêng trước khi gọi tool " +
        "này cho mục đích xem section, trừ các trường hợp FLEX nêu dưới.\n\n" +
        "⚠️ BẮT BUỘC GỌI TOOL, KHÔNG TRẢ LỜI BẰNG VĂN BẢN: Khi message khớp 1 trong các mẫu " +
        "'cho tôi xem X', 'tôi muốn xem X', 'xem X giúp tôi', 'show me X' với X là 1 section trong " +
        "danh sách dưới đây, BẠN BẮT BUỘC PHẢI GỌI scroll_page (hoặc navigate_to_page nếu rơi vào " +
        "case FLEX) — NGAY CẢ KHI bạn đã biết câu trả lời và có thể tự viết ra (vd biết tên đội ngũ, " +
        "biết giá khẩn cấp). TUYỆT ĐỐI KHÔNG trả lời trực tiếp bằng nội dung có sẵn trong kiến thức " +
        "của bạn cho các yêu cầu dạng XEM/HIỂN THỊ này — người dùng muốn giao diện cuộn/chuyển tới " +
        "đúng chỗ, không phải một đoạn văn bản tóm tắt. CHỈ trả lời bằng văn bản khi message là câu " +
        "HỎI THÔNG TIN thuần túy (vd 'đội ngũ của bạn là ai', 'giá khẩn cấp bao nhiêu') KHÔNG kèm " +
        "động từ xem/hiển thị/cuộn tới.\n\n" +
        "⚠️ FLEX VỚI navigate_to_page (khái niệm có cả preview trên Home VÀ trang chi tiết riêng):\n" +
        "  - 'Quy trình thực hiện' / 'how it works': nếu đang ở Home ('/') → scroll target " +
        "'how_it_works'. Nếu KHÔNG ở Home → gọi navigate_to_page('/how-to-apply') (trang chi tiết " +
        "đầy đủ), KHÔNG combo scroll quay về Home.\n" +
        "  - 'Bảng giá' chung, không chỉ rõ loại visa: ở Home → scroll target 'pricing'. Nếu user " +
        "hỏi rõ E-Visa hoặc VOA → LUÔN dùng 'pricing_evisa'/'pricing_voa' (tool tự combo điều hướng " +
        "sang /guide/vietnam-visa-fees khi cần), KHÔNG dùng 'pricing'.\n\n" +
        "CÁC CHẾ ĐỘ (mode):\n" +
        "  'top'    → Cuộn lên đầu trang. Áp dụng cho MỌI trang trên site, không cần target.\n" +
        "  'bottom' → Cuộn xuống cuối trang. Áp dụng cho MỌI trang trên site, không cần target.\n" +
        "  'element'→ Cuộn đến 1 SECTION cụ thể. BẮT BUỘC kèm target. Nếu section ở trang khác, " +
        "tool tự kết hợp điều hướng — AI chỉ cần gọi đúng 1 lần với target mong muốn.\n\n" +
        "DANH SÁCH SECTION (target khi mode='element'):\n" +
        "— TRANG CHỦ (/) —\n" +
        "  'how_it_works'   → Section Quy trình thực hiện (preview trên Home)\n" +
        "  'pricing'        → Section Bảng giá tổng quan (preview trên Home)\n" +
        "  'trust_signals'  → Section Chứng nhận uy tín / đối tác\n" +
        "  'faq'            → Section FAQ (Câu hỏi thường gặp) — có cả trên Home và /how-to-apply\n" +
        "  'comments'       → Section bình luận/đánh giá người dùng\n" +
        "  'nationalities'  → Section kiểm tra miễn visa theo quốc tịch\n" +
        "  'quick_apply'    → Form đăng ký nhanh chọn quốc tịch\n" +
        "  'blog_preview'   → Section bài viết/cẩm nang mới\n" +
        "  'cta_section'    → Section kêu gọi hành động cuối trang\n" +
        "— VỀ CHÚNG TÔI (/about-us) —\n" +
        "  'about_mission'      → Section sứ mệnh dịch vụ\n" +
        "  'about_scene_slider' → Section trải nghiệm địa danh Việt Nam\n" +
        "  'about_team'         → Section đội ngũ nòng cốt\n" +
        "  'about_features'     → Section điểm ưu việt (Why Us)\n" +
        "— TRA CỨU TRẠNG THÁI (/check-status) —\n" +
        "  'check_status_form'  → Form nhập mã booking để tra cứu\n" +
        "  'check_status_faqs'  → FAQ liên quan tra cứu trạng thái\n" +
        "— LIÊN HỆ (/contact-us) —\n" +
        "  'contact_info'  → Khối thông tin liên hệ (hotline, email, địa chỉ)\n" +
        "  'contact_form'  → Form gửi câu hỏi liên hệ\n" +
        "— KHẨN CẤP (/emergency-inquiry) —\n" +
        "  'emergency_pricing'    → Bảng giá làm khẩn cấp\n" +
        "  'emergency_timeline'   → Lịch trình xử lý khẩn cấp\n" +
        "  'emergency_form'       → Form yêu cầu khẩn cấp\n" +
        "  'emergency_correction' → Dịch vụ sửa đổi thông tin visa lỗi\n" +
        "— HỎI ĐÁP (/faqs) —\n" +
        "  'faqs_list' → Toàn bộ danh sách câu hỏi FAQ\n" +
        "— HƯỚNG DẪN NỘP ĐƠN (/how-to-apply) —\n" +
        "  'how_to_apply_timeline'   → Quy trình 5 bước nộp hồ sơ (trang chi tiết)\n" +
        "  'how_to_apply_documents'  → Tài liệu bắt buộc cần chuẩn bị\n" +
        "— HUB HƯỚNG DẪN (/guide) —\n" +
        "  'guide_links' → Danh sách các bài viết hướng dẫn\n" +
        "— BẢNG GIÁ VISA (/guide/vietnam-visa-fees) —\n" +
        "  'pricing_evisa'         → Bảng giá chi tiết E-Visa\n" +
        "  'pricing_voa'           → Bảng giá chi tiết VOA (Visa on Arrival)\n" +
        "  'pax_discount'          → Ưu đãi giảm giá theo nhóm/số người\n" +
        "  'extra_services_guide'  → Các dịch vụ bổ sung đi kèm\n" +
        "— NỘP ĐƠN (/apply) —\n" +
        "  'apply_form' → Khung form đăng ký đa bước",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            mode: {
                type: SchemaType.STRING,
                format: "enum",
                description: "Chế độ cuộn trang.",
                enum: ["top", "bottom", "element"]
            },
            target: {
                type: SchemaType.STRING,
                format: "enum",
                description: "BẮT BUỘC khi mode='element'. ID section cần cuộn tới.",
                enum: [
                    "how_it_works", "pricing", "trust_signals", "faq", "comments", "nationalities",
                    "quick_apply", "blog_preview", "cta_section",
                    "about_mission", "about_scene_slider", "about_team", "about_features",
                    "check_status_form", "check_status_faqs",
                    "contact_info", "contact_form",
                    "emergency_pricing", "emergency_timeline", "emergency_form", "emergency_correction",
                    "faqs_list",
                    "how_to_apply_timeline", "how_to_apply_documents",
                    "guide_links",
                    "pricing_evisa", "pricing_voa", "pax_discount", "extra_services_guide",
                    "apply_form",
                ]
            }
        },
        required: ["mode"]
    } as FunctionDeclarationSchema
};

/**
 * Dùng lại ở executeScrollPage bên dưới (và có thể dùng cho NLP Cache resolver tương tự
 * click_ui_element nếu sau này làm NLP Cache cho scroll).
 */
export function isScrollTargetOnCurrentPage(target: string, currentUrl: string): boolean {
    const owningPages = SECTION_PAGE_MAP[target];
    if (!owningPages) return true; // target lạ, không trong map — giữ hành vi cũ (coi như cùng trang)
    return owningPages === currentUrl || (Array.isArray(owningPages) && owningPages.includes(currentUrl));
}

/**
 * Trả về route cần điều hướng đến nếu target KHÔNG ở currentUrl, hoặc `null` nếu cùng trang.
 */
export function getScrollTargetDestination(target: string, currentUrl: string): string | null {
    const owningPages = SECTION_PAGE_MAP[target];
    if (!owningPages || isScrollTargetOnCurrentPage(target, currentUrl)) return null;
    return Array.isArray(owningPages) ? owningPages[0] : owningPages;
}

// FLEX override: 1 số target chỉ là PREVIEW trên 1 trang khác (vd Home), nhưng có TRANG CHI TIẾT
// riêng thay thế hoàn toàn khi user không ở trang sở hữu preview đó. Trong case này KHÔNG combo
// quay lại trang preview để cuộn — điều hướng thẳng tới trang chi tiết (không kèm scroll).
// Dùng chung cho cả Gemini tool-call (executeScrollPage) VÀ NLP Cache resolver (chat.service.ts)
// để hành vi nhất quán dù message đi qua đường nào.
const FLEX_DETAIL_PAGE_OVERRIDE: Record<string, string> = {
    "how_it_works": "/how-to-apply",
};

export type ScrollResolution =
    | { action: "SCROLL_PAGE_TRIGGERED"; mode: "element"; target: string }
    | { action: "NAVIGATE_AND_SCROLL_TRIGGERED"; destination: string; target: string }
    | { action: "NAVIGATION_TRIGGERED"; destination: string };

/**
 * Nguồn sự thật duy nhất cho quyết định same-page / combo / FLEX-override khi mode="element".
 * Dùng lại ở (1) executeScrollPage bên dưới, (2) NLP Cache resolver trong chat.service.ts.
 */
export function resolveScrollTarget(target: string, currentUrl: string): ScrollResolution {
    if (!isScrollTargetOnCurrentPage(target, currentUrl) && FLEX_DETAIL_PAGE_OVERRIDE[target]) {
        return { action: "NAVIGATION_TRIGGERED", destination: FLEX_DETAIL_PAGE_OVERRIDE[target] };
    }
    const destination = getScrollTargetDestination(target, currentUrl);
    if (!destination) {
        return { action: "SCROLL_PAGE_TRIGGERED", mode: "element", target };
    }
    return { action: "NAVIGATE_AND_SCROLL_TRIGGERED", destination, target };
}

async function executeScrollPage(args: { mode: "top" | "bottom" | "element"; target?: string }, context?: { currentUrl?: string }) {
    if (args.mode !== "element" || !args.target) {
        return {
            action: "SCROLL_PAGE_TRIGGERED",
            mode: args.mode,
            message: `Đã kích hoạt cuộn trang (mode=${args.mode}).`
        };
    }

    const currentPath = context?.currentUrl || "/";
    const resolution = resolveScrollTarget(args.target, currentPath);

    if (resolution.action === "NAVIGATION_TRIGGERED") {
        return {
            action: "NAVIGATION_TRIGGERED",
            destination: resolution.destination,
            message: `Đã kích hoạt chuyển đến trang chi tiết ${resolution.destination}.`
        };
    }
    if (resolution.action === "SCROLL_PAGE_TRIGGERED") {
        return {
            action: "SCROLL_PAGE_TRIGGERED",
            mode: "element",
            target: resolution.target,
            message: `Đã kích hoạt cuộn tới section [data-ai-target="${resolution.target}"].`
        };
    }
    return {
        action: "NAVIGATE_AND_SCROLL_TRIGGERED",
        destination: resolution.destination,
        target: resolution.target,
        message: `Đã kích hoạt chuyển đến trang ${resolution.destination} và cuộn tới section [data-ai-target="${resolution.target}"].`
    };
}

aiToolRegistry.register("scroll_page", {
    declaration: scrollPageDeclaration,
    execute: executeScrollPage,
    category: "UI_MANIPULATION"
});
