import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import prisma from "@/lib/prisma";

export const GET_EXTRA_SERVICES_NAME = "get_extra_services";

export const getExtraServicesDeclaration: FunctionDeclaration = {
    name: GET_EXTRA_SERVICES_NAME,
    description: "Lấy thông tin và bảng giá các dịch vụ bổ sung (VD: Fast track, VIP, xe đưa đón).",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            language: {
                type: SchemaType.STRING,
                description: "The user's language code (e.g., 'vi', 'en', 'ko'). Defaults to 'vi'.",
            }
        },
    },
};

export async function executeGetExtraServices(args: { language?: string }) {
    try {
        const lang = args.language || "vi";

        const services = await prisma.pricingRule.findMany({
            where: { ruleType: "EXTRA_SERVICE", isActive: true },
            include: {
                translations: {
                    where: { languageCode: lang }
                }
            }
        });
        
        return {
            found: true,
            services: services.map(s => {
                const translation = s.translations[0];
                return { 
                    service: s.key, 
                    price: s.price,
                    name: translation ? translation.name : s.key,
                    features: translation ? translation.features : null
                };
            })
        };
    } catch (error: any) {
        return { error: true, message: "Database error" };
    }
}

import { aiToolRegistry } from "./tool-registry";
aiToolRegistry.register(GET_EXTRA_SERVICES_NAME, {
    declaration: getExtraServicesDeclaration,
    execute: executeGetExtraServices,
    category: "DATA_RETRIEVAL",
});
