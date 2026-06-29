import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";
import prisma from "../../../lib/prisma";

const checkVisaStatusDeclaration: FunctionDeclaration = {
    name: "check_visa_status",
    description: "Kiểm tra trạng thái hồ sơ xin visa (E-Visa) dựa trên mã hồ sơ (application id) hoặc số passport.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            applicationCode: {
                type: SchemaType.STRING,
                description: "Mã hồ sơ xin visa (ví dụ: E12345678)"
            },
            passportNumber: {
                type: SchemaType.STRING,
                description: "Số hộ chiếu của người xin visa"
            }
        },
        // Không bắt buộc trường nào, người dùng có thể nhập 1 trong 2
    } as FunctionDeclarationSchema
};

async function executeCheckVisaStatus(args: { applicationCode?: string; passportNumber?: string }) {
    try {
        const code = (args.applicationCode || "").trim();
        const passport = (args.passportNumber || "").trim();

        if (!code && !passport) {
            return {
                error: true,
                message: "Vui lòng cung cấp mã hồ sơ (application code) hoặc số passport để tra cứu."
            };
        }

        let application = null;

        if (code) {
            application = await prisma.visaApplication.findFirst({
                where: {
                    OR: [{ applicationCode: code }, { id: code }],
                },
            });
        }
        
        if (!application && passport) {
            const applicant = await prisma.applicant.findFirst({
                where: { passportNumber: passport },
                include: { application: true }
            });
            if (applicant && applicant.application) {
                application = applicant.application;
            }
        }

        if (!application) {
            return { 
                status: "NOT_FOUND",
                hintForAI: `Hãy thông báo cho người dùng: "Tôi không tìm thấy mã hồ sơ ${code || passport} trong hệ thống. Bạn có thể kiểm tra lại mã hoặc cung cấp số hộ chiếu để tôi tra cứu lại nhé!"`
            };
        }

        const displayCode = application.applicationCode ?? application.id;
        return {
            status: application.status,
            applicationCode: displayCode,
            applicantCount: application.applicantCount,
            visaType: application.visaType,
            processingTime: application.processingTime,
            message: `Hồ sơ của bạn (mã ${displayCode}) hiện đang ở trạng thái ${application.status}.`,
        };
    } catch (error: any) {
        return {
            error: true,
            message: "Hệ thống tra cứu đang bận hoặc gặp lỗi nội bộ. Vui lòng thử lại sau.",
            details: error?.message
        };
    }
}

aiToolRegistry.register("check_visa_status", {
    declaration: checkVisaStatusDeclaration,
    execute: executeCheckVisaStatus,
    category: "DATA_RETRIEVAL"
});
