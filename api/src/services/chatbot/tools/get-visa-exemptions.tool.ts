import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import prisma from "@/lib/prisma";

export const GET_VISA_EXEMPTIONS_NAME = "get_visa_exemptions";

export const getVisaExemptionsDeclaration: FunctionDeclaration = {
    name: GET_VISA_EXEMPTIONS_NAME,
    description: "Lấy TOÀN BỘ danh sách các quốc gia được miễn visa Việt Nam. Lưu ý: KHÔNG dùng tool này nếu người dùng chỉ hỏi về MỘT quốc tịch cụ thể (hãy dùng check_nationality thay thế). Chỉ dùng tool này khi người dùng hỏi chung chung 'Danh sách miễn visa', 'Những nước nào được miễn visa'.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {},
    },
};

export async function executeGetVisaExemptions() {
    try {
        const exemptions = await prisma.visaExemptionCountry.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
        });
        
        if (exemptions.length === 0) {
            return { found: false, message: "Hiện không có dữ liệu quốc gia được miễn visa." };
        }
        
        return {
            found: true,
            exemptions: exemptions.map(e => ({ countryCode: e.countryCode, exemptionDays: e.exemptionDays }))
        };
    } catch (error: any) {
        return { error: true, message: "Database error" };
    }
}

import { aiToolRegistry } from "./tool-registry";
aiToolRegistry.register(GET_VISA_EXEMPTIONS_NAME, {
    declaration: getVisaExemptionsDeclaration,
    execute: executeGetVisaExemptions,
    category: "DATA_RETRIEVAL",
});
