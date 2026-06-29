import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";
import { getClickTargetDestination } from "./click-ui-element.tool";
import { listPublicNationalities } from "../../nationalities.service";
import { listPublicPorts } from "../../ports.service";

/**
 * focus_ui_field — UI Manipulation Tool (Phase 1 + Phase 2 + Phase 3 của nhóm Input/Field/Combobox)
 *
 * Phase 1: click mở Combobox/field để user tự gõ/chọn tiếp.
 * Phase 2 (2026-06-23): thêm `value` cho 'quick_apply_nationality' — validate qua DB thật
 * (nationalities.service.ts), trả FOCUS_AND_SELECT_TRIGGERED/NAVIGATE_AND_SELECT_TRIGGERED.
 * Phase 3 (2026-06-24): thêm 3 target dùng component Select (Radix UI) — 'quick_apply_port'
 * (validate qua DB thật, ports.service.ts, giống nationality vì cửa khẩu admin-configurable),
 * 'quick_apply_visa_option' và 'quick_apply_processing_speed' (validate qua hằng số TĨNH ngay
 * trong file này, vì đây là TypeScript union type cố định ở code, KHÔNG phải dữ liệu DB).
 *
 * Tái dùng 100% cơ chế SSE + VirtualMouseEngine của click_ui_element: trả về action string nội bộ
 * mà gemini.service.ts đã map sẵn sang SSE wire format:
 *   - { action: "ELEMENT_CLICK_TRIGGERED", target }                          → VIRTUAL_CLICK
 *   - { action: "NAVIGATE_AND_CLICK_TRIGGERED", destination, target }        → NAVIGATE_AND_CLICK
 *   - { action: "FOCUS_AND_SELECT_TRIGGERED", target, optionCode }           → VIRTUAL_SELECT
 *   - { action: "NAVIGATE_AND_SELECT_TRIGGERED", destination, target, optionCode } → NAVIGATE_AND_SELECT
 */

// Hằng số TĨNH — bản sao tối thiểu của ui/src/components/sections/quick-apply/constants.ts
// (VISA_OPTIONS ids, PROCESSING_OPTIONS ids). Không import cross-package từ ui/ vào api/ (2 repo
// tách biệt, không có package dùng chung) — đây là TypeScript union type cố định ở code, không
// phải dữ liệu admin-configurable, nên hardcode lại ở đây là hợp lý (khác port/nationality, vốn
// là dữ liệu DB thật).
const VALID_VISA_OPTIONS = [
    "code-fasttrack", "basic-fasttrack",
    "evisa-30-single", "evisa-90-single", "evisa-90-multiple",
    "voa-1m-single", "voa-1m-multiple", "voa-3m-single", "voa-3m-multiple",
] as const;

const VALID_PROCESSING_SPEEDS = ["normal", "urgent-4d", "urgent-2d", "urgent-1d"] as const;

// Bản sao tối thiểu của ui/src/app/apply/_components/priceCalculator.ts — danh sách field hữu hạn
// lựa chọn của /apply Step 1 (visa_type, visa_category, purpose_of_visit). Cùng rationale như
// VALID_VISA_OPTIONS: đây là TS union cố định ở code, không phải dữ liệu DB.
const VALID_APPLY_STEP1_VISA_TYPES = ["evisa", "voa"] as const;

const VALID_APPLY_STEP1_VISA_CATEGORIES = [
    "evisa_30d_single", "evisa_90d_single", "evisa_90d_multiple",
    "voa_1m_single", "voa_1m_multiple", "voa_3m_single", "voa_3m_multiple",
] as const;

const VALID_APPLY_STEP1_PURPOSES = ["tourism", "business", "family", "other"] as const;

const focusUiFieldDeclaration: FunctionDeclaration = {
    name: "focus_ui_field",
    description:
        "SỬ DỤNG khi người dùng muốn MỞ/CHỌN/FOCUS vào một ô nhập liệu (field) hoặc Combobox/Select cụ thể " +
        "trên giao diện để tự gõ/chọn giá trị tiếp theo — KHÁC với click_ui_element (dùng cho nút/link " +
        "có hành động kết thúc ngay, như Submit/Next). " +
        "Tool TỰ ĐỘNG phát hiện nếu field đích nằm ở trang khác và TỰ KẾT HỢP chuyển trang trước khi mở field — " +
        "TUYỆT ĐỐI KHÔNG gọi navigate_to_page riêng cho mục đích này.\n\n" +
        "⚠️ BẮT BUỘC GỌI LẠI TOOL MỖI LẦN, KỂ CẢ KHI LƯỢT TRƯỚC ĐÃ THÀNH CÔNG: nếu user yêu cầu chọn " +
        "MỘT GIÁ TRỊ MỚI (khác giá trị đã chọn ở lượt trước, dù cùng field hay field khác) — kể cả khi " +
        "lượt ngay trước đó bạn đã gọi tool này thành công cho field tương tự — BẮT BUỘC gọi lại tool " +
        "với giá trị MỚI. TUYỆT ĐỐI KHÔNG chỉ trả lời bằng văn bản khẳng định 'đã chọn xong' dựa trên " +
        "lượt thành công trước nếu CHƯA thực sự gọi tool cho yêu cầu lần này — mỗi yêu cầu chọn giá trị " +
        "là 1 hành động UI thật cần được kích hoạt riêng, không thể suy ra từ lịch sử hội thoại.\n\n" +
        "⚠️ PHÂN BIỆT VỚI scroll_page: nếu user CHỈ muốn XEM/CUỘN TỚI cả khối Form Đăng Ký Nhanh nói " +
        "chung (vd 'tôi muốn xem phần đăng ký nhanh', 'cuộn tới form đăng ký nhanh giúp tôi' — có động " +
        "từ xem/cuộn, KHÔNG nhắm riêng vào 1 field cụ thể) → đó là scroll_page(target='quick_apply'), " +
        "TUYỆT ĐỐI KHÔNG gọi focus_ui_field. CHỈ gọi focus_ui_field khi user có động từ MỞ/CHỌN nhắm " +
        "RÕ RÀNG vào 1 field cụ thể (vd 'mở ô chọn cửa khẩu', 'chọn loại visa 1 tháng 1 lần giúp tôi').\n\n" +
        "DANH SÁCH FIELD CÓ THỂ MỞ:\n" +
        "  'quick_apply_nationality' → Ô chọn Quốc tịch trong Form Đăng Ký Nhanh ở trang chủ\n" +
        "  'quick_apply_port' → Ô chọn Cửa khẩu nhập cảnh trong Form Đăng Ký Nhanh\n" +
        "  'quick_apply_visa_option' → Ô chọn Loại Visa cụ thể (thời hạn + số lần nhập cảnh) trong Form Đăng Ký Nhanh\n" +
        "  'quick_apply_processing_speed' → Ô chọn Tốc độ xử lý hồ sơ trong Form Đăng Ký Nhanh\n" +
        "  'apply_step1_visa_type' → Ô chọn Loại Visa (E-Visa / Visa on Arrival) ở Bước 1 trang /apply\n" +
        "  'apply_step1_visa_category' → Ô chọn Hạng mục Visa cụ thể (thời hạn + số lần nhập cảnh) ở Bước 1 trang /apply\n" +
        "  'apply_step1_port_of_entry' → Ô chọn Cửa khẩu nhập cảnh ở Bước 1 trang /apply\n" +
        "  'apply_step1_purpose_of_visit' → Ô chọn Mục đích chuyến đi ở Bước 1 trang /apply\n" +
        "  'apply_step1_applicant_count' → Ô chọn Số lượng người nộp đơn ở Bước 1 trang /apply\n\n" +
        "THAM SỐ value (TÙY CHỌN): nếu user ĐÃ NÓI RÕ muốn chọn giá trị nào, BẮT BUỘC truyền value " +
        "tương ứng với target — tool sẽ tự mở field VÀ chọn luôn giá trị trong 1 lần gọi. Nếu user " +
        "CHƯA chỉ định giá trị (chỉ muốn mở field để tự chọn), TUYỆT ĐỐI KHÔNG truyền value — không tự " +
        "suy đoán giá trị nào cả. Quy tắc value theo từng target:\n" +
        "  - 'quick_apply_nationality': mã ISO 2 ký tự (vd 'vn', 'us', 'kr').\n" +
        "  - 'quick_apply_port' / 'apply_step1_port_of_entry': mã cửa khẩu (vd 'SGN' cho Tân Sơn Nhất, 'HAN' cho Nội Bài, 'DAD' cho Đà Nẵng, " +
        "'PQC' cho Phú Quốc, 'MOC_BAI' cho cửa khẩu đường bộ Mộc Bài).\n" +
        "  - 'quick_apply_visa_option': BẮT BUỘC 1 trong: 'code-fasttrack' (mã vạch siêu nhanh), " +
        "'basic-fasttrack' (mã vạch cơ bản), 'evisa-30-single' (E-Visa 30 ngày 1 lần), " +
        "'evisa-90-single' (E-Visa 90 ngày 1 lần), 'evisa-90-multiple' (E-Visa 90 ngày nhiều lần), " +
        "'voa-1m-single' (VOA 1 tháng 1 lần), 'voa-1m-multiple' (VOA 1 tháng nhiều lần), " +
        "'voa-3m-single' (VOA 3 tháng 1 lần), 'voa-3m-multiple' (VOA 3 tháng nhiều lần).\n" +
        "  - 'quick_apply_processing_speed': BẮT BUỘC 1 trong: 'normal' (7 ngày, miễn phí), " +
        "'urgent-4d' (4 ngày, phụ phí), 'urgent-2d' (2 giờ khẩn), 'urgent-1d' (1 ngày khẩn).\n" +
        "  - 'apply_step1_visa_type': BẮT BUỘC 1 trong: 'evisa', 'voa'.\n" +
        "  - 'apply_step1_visa_category': BẮT BUỘC 1 trong: 'evisa_30d_single', 'evisa_90d_single', " +
        "'evisa_90d_multiple', 'voa_1m_single', 'voa_1m_multiple', 'voa_3m_single', 'voa_3m_multiple' " +
        "(PHẢI khớp với 'apply_step1_visa_type' đã/đang chọn — evisa_* chỉ hợp lệ khi visa_type='evisa', voa_* khi visa_type='voa').\n" +
        "  - 'apply_step1_purpose_of_visit': BẮT BUỘC 1 trong: 'tourism', 'business', 'family', 'other'.\n" +
        "  - 'apply_step1_applicant_count': số nguyên từ 1 đến 5.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            target: {
                type: SchemaType.STRING,
                format: "enum",
                description: "ID của field cần mở. CHỈ ĐƯỢC CHỌN 1 TRONG CÁC GIÁ TRỊ SAU:",
                enum: [
                    "quick_apply_nationality",
                    "quick_apply_port",
                    "quick_apply_visa_option",
                    "quick_apply_processing_speed",
                    "apply_step1_visa_type",
                    "apply_step1_visa_category",
                    "apply_step1_port_of_entry",
                    "apply_step1_purpose_of_visit",
                    "apply_step1_applicant_count",
                ],
            },
            value: {
                type: SchemaType.STRING,
                description:
                    "Giá trị cụ thể cần chọn — CHỈ truyền khi user đã chỉ rõ muốn chọn gì. Quy tắc theo " +
                    "target xem ở description tool. Để trống nếu chỉ muốn mở field.",
            },
        },
        required: ["target"],
    } as FunctionDeclarationSchema,
};

async function executeFocusUiField(args: { target: string; value?: string }, context?: { currentUrl?: string }) {
    const currentPath = context?.currentUrl || "/";
    const destination = getClickTargetDestination(args.target, currentPath);

    if (args.target === "quick_apply_nationality" && args.value) {
        const normalized = args.value.trim().toLowerCase();
        const nationalities = await listPublicNationalities();
        const country = nationalities.find((n) => n.code.toLowerCase() === normalized);

        if (!country) {
            return {
                error: true,
                message:
                    `Không tìm thấy quốc gia với mã "${args.value}" trong danh sách quốc tịch hỗ trợ. ` +
                    `Hãy hỏi lại người dùng tên quốc gia chính xác (hoặc xin lỗi nếu quốc gia không được hỗ trợ).`,
            };
        }

        return buildSelectResult(args.target, destination, country.code, `quốc gia "${country.name}"`);
    }

    if (args.target === "quick_apply_port" && args.value) {
        const normalized = args.value.trim().toUpperCase();
        const ports = await listPublicPorts();
        const port = ports.find((p) => p.code.toUpperCase() === normalized);

        if (!port) {
            return {
                error: true,
                message:
                    `Không tìm thấy cửa khẩu với mã "${args.value}" trong danh sách cửa khẩu hỗ trợ. ` +
                    `Hãy hỏi lại người dùng tên cửa khẩu chính xác.`,
            };
        }

        return buildSelectResult(args.target, destination, port.code, `cửa khẩu "${port.name}"`);
    }

    if (args.target === "quick_apply_visa_option" && args.value) {
        const normalized = args.value.trim().toLowerCase();
        const match = VALID_VISA_OPTIONS.find((v) => v === normalized);

        if (!match) {
            return {
                error: true,
                message:
                    `Giá trị "${args.value}" không phải loại visa hợp lệ. Các giá trị hợp lệ: ` +
                    `${VALID_VISA_OPTIONS.join(", ")}. Hãy chọn lại đúng 1 trong các giá trị này.`,
            };
        }

        return buildSelectResult(args.target, destination, match, `loại visa "${match}"`);
    }

    if (args.target === "quick_apply_processing_speed" && args.value) {
        const normalized = args.value.trim().toLowerCase();
        const match = VALID_PROCESSING_SPEEDS.find((v) => v === normalized);

        if (!match) {
            return {
                error: true,
                message:
                    `Giá trị "${args.value}" không phải tốc độ xử lý hợp lệ. Các giá trị hợp lệ: ` +
                    `${VALID_PROCESSING_SPEEDS.join(", ")}. Hãy chọn lại đúng 1 trong các giá trị này.`,
            };
        }

        return buildSelectResult(args.target, destination, match, `tốc độ xử lý "${match}"`);
    }

    if (args.target === "apply_step1_visa_type" && args.value) {
        const normalized = args.value.trim().toLowerCase();
        const match = VALID_APPLY_STEP1_VISA_TYPES.find((v) => v === normalized);

        if (!match) {
            return {
                error: true,
                message:
                    `Giá trị "${args.value}" không phải loại visa hợp lệ ở Bước 1. Các giá trị hợp lệ: ` +
                    `${VALID_APPLY_STEP1_VISA_TYPES.join(", ")}. Hãy chọn lại đúng 1 trong các giá trị này.`,
            };
        }

        return buildSelectResult(args.target, destination, match, `loại visa "${match}"`);
    }

    if (args.target === "apply_step1_visa_category" && args.value) {
        const normalized = args.value.trim().toLowerCase();
        const match = VALID_APPLY_STEP1_VISA_CATEGORIES.find((v) => v === normalized);

        if (!match) {
            return {
                error: true,
                message:
                    `Giá trị "${args.value}" không phải hạng mục visa hợp lệ ở Bước 1. Các giá trị hợp lệ: ` +
                    `${VALID_APPLY_STEP1_VISA_CATEGORIES.join(", ")}. Hãy chọn lại đúng 1 trong các giá trị này.`,
            };
        }

        return buildSelectResult(args.target, destination, match, `hạng mục visa "${match}"`);
    }

    if (args.target === "apply_step1_port_of_entry" && args.value) {
        const normalized = args.value.trim().toUpperCase();
        const ports = await listPublicPorts();
        const port = ports.find((p) => p.code.toUpperCase() === normalized);

        if (!port) {
            return {
                error: true,
                message:
                    `Không tìm thấy cửa khẩu với mã "${args.value}" trong danh sách cửa khẩu hỗ trợ. ` +
                    `Hãy hỏi lại người dùng tên cửa khẩu chính xác.`,
            };
        }

        return buildSelectResult(args.target, destination, port.code, `cửa khẩu "${port.name}"`);
    }

    if (args.target === "apply_step1_purpose_of_visit" && args.value) {
        const normalized = args.value.trim().toLowerCase();
        const match = VALID_APPLY_STEP1_PURPOSES.find((v) => v === normalized);

        if (!match) {
            return {
                error: true,
                message:
                    `Giá trị "${args.value}" không phải mục đích chuyến đi hợp lệ. Các giá trị hợp lệ: ` +
                    `${VALID_APPLY_STEP1_PURPOSES.join(", ")}. Hãy chọn lại đúng 1 trong các giá trị này.`,
            };
        }

        return buildSelectResult(args.target, destination, match, `mục đích chuyến đi "${match}"`);
    }

    if (args.target === "apply_step1_applicant_count" && args.value) {
        const count = Number(args.value.trim());

        if (!Number.isInteger(count) || count < 1 || count > 5) {
            return {
                error: true,
                message:
                    `Giá trị "${args.value}" không phải số lượng người nộp đơn hợp lệ. Phải là số nguyên từ 1 đến 5.`,
            };
        }

        return buildSelectResult(args.target, destination, String(count), `${count} người nộp đơn`);
    }

    if (!destination) {
        return {
            action: "ELEMENT_CLICK_TRIGGERED",
            target: args.target,
            message: `Đã kích hoạt mở field [data-ai-element="${args.target}"].`,
        };
    }

    return {
        action: "NAVIGATE_AND_CLICK_TRIGGERED",
        destination,
        target: args.target,
        message: `Đã kích hoạt chuyển đến trang ${destination} và mở field [data-ai-element="${args.target}"].`,
    };
}

/** Dùng chung cho cả 4 target khi có `value` hợp lệ — tránh lặp lại nhánh same-page/combo 4 lần. */
function buildSelectResult(target: string, destination: string | null, optionCode: string, label: string) {
    if (!destination) {
        return {
            action: "FOCUS_AND_SELECT_TRIGGERED",
            target,
            optionCode,
            message: `Đã kích hoạt mở field [data-ai-element="${target}"] và chọn ${label}.`,
        };
    }

    return {
        action: "NAVIGATE_AND_SELECT_TRIGGERED",
        destination,
        target,
        optionCode,
        message: `Đã kích hoạt chuyển đến trang ${destination}, mở field [data-ai-element="${target}"] và chọn ${label}.`,
    };
}

aiToolRegistry.register("focus_ui_field", {
    declaration: focusUiFieldDeclaration,
    execute: executeFocusUiField,
    category: "UI_MANIPULATION",
});
