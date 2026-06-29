import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";
import { calculatePriceFromRules } from "../../application-pricing.service";
import type { CalculatePriceDto } from "../../../validators/applications.validator";

const calculateVisaFeeDeclaration: FunctionDeclaration = {
    name: "calculate_visa_fee",
    description: "Tính toán tổng lệ phí xin visa (bao gồm phí cơ bản, phí xử lý khẩn cấp và dịch vụ thêm) dựa trên yêu cầu của khách hàng.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            visaType: {
                type: SchemaType.STRING,
                description: "Loại visa (E_VISA hoặc VOA)"
            },
            visaCategory: {
                type: SchemaType.STRING,
                description: "Hạng visa (30_DAYS_SINGLE, 90_DAYS_SINGLE, 90_DAYS_MULTIPLE, VOA_1M_SINGLE, VOA_1M_MULTIPLE, VOA_3M_SINGLE, VOA_3M_MULTIPLE)"
            },
            applicantCount: {
                type: SchemaType.INTEGER,
                description: "Số lượng người xin visa (tối thiểu là 1)"
            },
            processingTime: {
                type: SchemaType.STRING,
                description: "Thời gian xử lý mong muốn (NORMAL, URGENT_4D, URGENT_2D, URGENT_1D, URGENT_4H, URGENT_2H, LAST_MINUTE)"
            },
            vipFastTrack: {
                type: SchemaType.BOOLEAN,
                description: "Có muốn sử dụng dịch vụ đón VIP tại sân bay / cửa khẩu nhanh (Fast Track) hay không. Mặc định là false."
            }
        },
        required: ["visaType", "visaCategory", "applicantCount", "processingTime"]
    } as FunctionDeclarationSchema
};

async function executeCalculateVisaFee(args: any) {
    try {
        const { visaType, visaCategory, applicantCount, processingTime, vipFastTrack } = args;

        if (!visaType || !visaCategory || !applicantCount || !processingTime) {
            return {
                error: true,
                message: "Thiếu thông tin bắt buộc. Hãy yêu cầu người dùng cung cấp đủ thông tin: Loại visa, Số người, và Thời gian làm khẩn hay bình thường."
            };
        }

        const dto = {
            visa_type: visaType,
            visa_category: visaCategory,
            applicant_count: Number(applicantCount),
            processing_time: processingTime,
            extra_services: {
                vip_fast_track: Boolean(vipFastTrack)
            }
        } as CalculatePriceDto;

        const result = await calculatePriceFromRules(dto);

        return {
            success: true,
            totalFee: result.grand_total,
            currency: "USD",
            applicantCount: result.applicant_count,
            breakdown: result.breakdown,
            hintForAI: `Tính toán thành công. Hãy báo cho khách hàng tổng số tiền là $${result.grand_total} USD và render cấu trúc HTML comment như sau (KHÔNG TRẢ LỜI text dài dòng, chỉ in ra comment): <!--card:{"type":"fee_summary","data":{"total":${result.grand_total},"currency":"USD","breakdown":${JSON.stringify(result.breakdown)}}}-->`
        };
    } catch (error: any) {
        return {
            error: true,
            message: "Có lỗi khi tính toán phí. Có thể loại visa và thời gian khẩn không khớp nhau. Hãy gợi ý người dùng chọn lại.",
            details: error?.message
        };
    }
}

aiToolRegistry.register("calculate_visa_fee", {
    declaration: calculateVisaFeeDeclaration,
    execute: executeCalculateVisaFee,
    category: "DATA_RETRIEVAL"
});
