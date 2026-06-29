import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import prisma from "@/lib/prisma";

export const GET_FAQ_NAME = "get_faq";

export const getFaqDeclaration: FunctionDeclaration = {
    name: GET_FAQ_NAME,
    description: "BẮT BUỘC SỬ DỤNG CÔNG CỤ NÀY để tra cứu FAQ khi người dùng hỏi về: thời gian làm visa (processing time), thủ tục, điều kiện, quy định, hoặc bất kỳ thắc mắc chung nào. Tuyệt đối không tự trả lời dựa trên kiến thức có sẵn.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            keyword: {
                type: SchemaType.STRING,
                description: "The main keyword or concept to search for in FAQs (e.g. 'điều kiện', 'phí', 'thời gian', 'ảnh thẻ')",
            },
            language: {
                type: SchemaType.STRING,
                description: "The user's language code (e.g., 'vi', 'en', 'ko'). Defaults to 'vi'.",
            }
        },
        required: ["keyword"],
    },
};

export async function executeGetFaq(args: { keyword: string; language?: string }) {
    try {
        const lang = args.language || "vi";
        const keyword = args.keyword.toLowerCase();

        const faqs = await prisma.faq.findMany({
            where: {
                isActive: true,
                OR: [
                    {
                        question: { contains: keyword }
                    },
                    {
                        answer: { contains: keyword }
                    },
                    {
                        translations: {
                            some: {
                                languageCode: lang,
                                OR: [
                                    { question: { contains: keyword } },
                                    { answer: { contains: keyword } }
                                ]
                            }
                        }
                    }
                ]
            },
            include: {
                translations: {
                    where: { languageCode: lang }
                }
            },
            take: 3
        });

        if (faqs.length === 0) {
            return {
                found: false,
                message: `Không tìm thấy câu hỏi thường gặp nào liên quan đến từ khóa '${keyword}'.`
            };
        }

        const results = faqs.map(faq => {
            const translation = faq.translations[0];
            return {
                category: faq.category,
                question: translation ? translation.question : faq.question,
                answer: translation ? translation.answer : faq.answer
            };
        });

        return {
            found: true,
            results
        };
    } catch (error: any) {
        return {
            error: true,
            message: "Database error while fetching FAQs",
            details: error.message
        };
    }
}

import { aiToolRegistry } from "./tool-registry";

aiToolRegistry.register(GET_FAQ_NAME, {
    declaration: getFaqDeclaration,
    execute: executeGetFaq,
    category: "DATA_RETRIEVAL",
});
