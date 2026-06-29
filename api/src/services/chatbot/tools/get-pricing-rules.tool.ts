import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import prisma from "@/lib/prisma";

export const GET_PRICING_RULES_NAME = "get_pricing_rules";

export const getPricingRulesDeclaration: FunctionDeclaration = {
    name: GET_PRICING_RULES_NAME,
    description: "Fetch pricing rules (visa fees). Use this ONLY when the user asks about the PRICE, COST, or FEE of a visa. DO NOT use this tool if the user only asks about processing time (how long it takes), use get_faq instead.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            language: {
                type: SchemaType.STRING,
                description: "The user's language code (e.g., 'vi', 'en', 'ko'). Defaults to 'vi'.",
            }
        }
    },
};

export async function executeGetPricingRules(args: { language?: string }) {
    try {
        const lang = args.language || "vi";

        const rules = await prisma.pricingRule.findMany({
            where: {
                isActive: true
            },
            include: {
                translations: {
                    where: { languageCode: lang }
                }
            },
            orderBy: {
                price: 'asc'
            }
        });

        if (rules.length === 0) {
            return {
                found: false,
                message: "Không tìm thấy thông tin bảng giá."
            };
        }

        const results = rules.map(rule => {
            const translation = rule.translations[0];
            return {
                ruleType: rule.ruleType,
                key: rule.key,
                price: rule.price,
                name: translation ? translation.name : "No name",
                processingTime: translation && translation.processing ? translation.processing : undefined,
                features: translation && translation.features ? translation.features : undefined
            };
        });

        return {
            found: true,
            results
        };
    } catch (error: any) {
        return {
            error: true,
            message: "Database error while fetching pricing rules",
            details: error.message
        };
    }
}

import { aiToolRegistry } from "./tool-registry";

aiToolRegistry.register(GET_PRICING_RULES_NAME, {
    declaration: getPricingRulesDeclaration,
    execute: executeGetPricingRules,
    category: "DATA_RETRIEVAL",
});
