import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateFaqDto,
    AdminFaqsQueryDto,
    AdminUpdateFaqDto,
} from "@/validators/admin/faqs.validator";
import { autoTranslateContent } from "@/services/translate.service";

export type AdminFaqListItem = {
    id: string;
    category: string;
    question: string;
    answer: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    translations?: Array<{
        language_code: string;
        question: string;
        answer: string;
    }>;
};

export type AdminFaqDetail = AdminFaqListItem & {
    translations: Array<{
        language_code: string;
        question: string;
        answer: string;
    }>;
};

function toListItem(row: {
    id: string;
    category: string;
    question: string;
    answer: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    translations?: any[];
}): AdminFaqListItem {
    return {
        id: row.id,
        category: row.category,
        question: row.question,
        answer: row.answer,
        display_order: row.displayOrder,
        is_active: row.isActive,
        created_at: row.createdAt.toISOString(),
        translations: row.translations?.map((t: any) => ({
            language_code: t.languageCode,
            question: t.question,
            answer: t.answer,
        })),
    };
}

/** FAQ how-to-apply hiển thị trên /how-to-apply — cần bust tag guidelines ngoài faqs. */
async function revalidateFaqCaches(category?: string): Promise<void> {
    await revalidateCache("faqs");
    if (category === "how-to-apply") {
        void revalidateCache("guidelines");
    }
}

function buildWhere(query: AdminFaqsQueryDto): Prisma.FaqWhereInput {
    const where: Prisma.FaqWhereInput = {};
    if (query.category) {
        where.category = query.category;
    }
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.search) {
        where.OR = [
            { question: { contains: query.search } },
            { answer: { contains: query.search } },
            { category: { contains: query.search } },
        ];
    }
    return where;
}

export async function listAdminFaqs(
    query: AdminFaqsQueryDto,
): Promise<{ rows: AdminFaqListItem[]; total: number }> {
    const where = buildWhere(query);
    
    let orderBy: Prisma.FaqOrderByWithRelationInput | Prisma.FaqOrderByWithRelationInput[] = [
        { displayOrder: "desc" },
        { createdAt: "desc" }
    ];

    if (query.sort) {
        const isDesc = query.sort.startsWith("-");
        const sortField = isDesc ? query.sort.substring(1) : query.sort;
        let dbSortField = sortField;
        if (sortField === "display_order") dbSortField = "displayOrder";
        if (sortField === "is_active") dbSortField = "isActive";
        if (sortField === "created_at") dbSortField = "createdAt";
        if (sortField === "category") dbSortField = "category";
        
        orderBy = [
            { [dbSortField]: isDesc ? "desc" : "asc" },
            { createdAt: "desc" }
        ];
    }

    const [total, rows] = await prisma.$transaction([
        prisma.faq.count({ where }),
        prisma.faq.findMany({
            where,
            include: { translations: true },
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toListItem), total };
}

async function generateTranslationsInBackground(
    faqId: string,
    input: AdminCreateFaqDto | AdminUpdateFaqDto
) {
    if (input.translations && input.translations.length > 0) return;

    try {
        const [enQuestion, enAnswer, koQuestion, koAnswer] = await Promise.all([
            autoTranslateContent(input.question || "", "en"),
            autoTranslateContent(input.answer || "", "en"),
            autoTranslateContent(input.question || "", "ko"),
            autoTranslateContent(input.answer || "", "ko")
        ]);
        
        const translations = [
            { language_code: "en", question: enQuestion, answer: enAnswer },
            { language_code: "ko", question: koQuestion, answer: koAnswer }
        ];

        for (const t of translations) {
            await prisma.faqTranslation.upsert({
                where: {
                    faqId_languageCode: {
                        faqId,
                        languageCode: t.language_code,
                    },
                },
                create: {
                    id: randomUUID(),
                    faqId,
                    languageCode: t.language_code,
                    question: t.question,
                    answer: t.answer,
                },
                update: {
                    question: t.question,
                    answer: t.answer,
                },
            });
        }
        console.log(`[Background] Translated FAQ ${faqId}`);
        await revalidateCache("faqs");
    } catch (err) {
        console.error("Failed to generate background translations for FAQ", faqId, err);
    }
}

export async function getAdminFaqById(id: string): Promise<AdminFaqDetail> {
    const row = await prisma.faq.findUnique({
        where: { id },
        include: { translations: true },
    });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return {
        ...toListItem(row),
        translations: row.translations.map((t) => ({
            language_code: t.languageCode,
            question: t.question,
            answer: t.answer,
        })),
    };
}

export async function createAdminFaq(input: AdminCreateFaqDto): Promise<AdminFaqDetail> {
    const id = randomUUID();

    let displayOrder = input.display_order;
    if (displayOrder === undefined || displayOrder === null || displayOrder === 0) {
        const agg = await prisma.faq.aggregate({ _max: { displayOrder: true } });
        displayOrder = (agg._max.displayOrder ?? 0) + 1;
    }

    await prisma.faq.create({
        data: {
            id,
            category: input.category,
            question: input.question,
            answer: input.answer,
            displayOrder,
            isActive: input.is_active ?? true,
            translations: input.translations?.length
                ? {
                      create: input.translations.map((t) => ({
                          id: randomUUID(),
                          languageCode: t.language_code,
                          question: t.question,
                          answer: t.answer,
                      })),
                  }
                : {
                      create: [{
                          id: randomUUID(),
                          languageCode: "vi",
                          question: input.question,
                          answer: input.answer,
                      }]
                  },
        },
    });
    generateTranslationsInBackground(id, input).catch(console.error);
    await revalidateFaqCaches(input.category);
    return getAdminFaqById(id);
}

export async function updateAdminFaq(id: string, input: AdminUpdateFaqDto): Promise<AdminFaqDetail> {
    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    await prisma.$transaction(async (tx) => {
        await tx.faq.update({
            where: { id },
            data: {
                category: input.category,
                question: input.question,
                answer: input.answer,
                displayOrder: input.display_order,
                isActive: input.is_active,
            },
        });

        await tx.faqTranslation.upsert({
            where: { faqId_languageCode: { faqId: id, languageCode: "vi" } },
            create: { id: randomUUID(), faqId: id, languageCode: "vi", question: input.question ?? existing.question, answer: input.answer ?? existing.answer },
            update: { question: input.question ?? existing.question, answer: input.answer ?? existing.answer },
        });

        if (input.translations?.length) {
            for (const t of input.translations) {
                await tx.faqTranslation.upsert({
                    where: {
                        faqId_languageCode: {
                            faqId: id,
                            languageCode: t.language_code,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        faqId: id,
                        languageCode: t.language_code,
                        question: t.question,
                        answer: t.answer,
                    },
                    update: {
                        question: t.question,
                        answer: t.answer,
                    },
                });
            }
        }
    });

    generateTranslationsInBackground(id, input).catch(console.error);

    const category = input.category ?? existing.category;
    await revalidateFaqCaches(category);
    if (existing.category === "how-to-apply" && category !== "how-to-apply") {
        void revalidateCache("guidelines");
    }
    return getAdminFaqById(id);
}

export async function deleteAdminFaq(id: string): Promise<void> {
    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.faq.delete({ where: { id } });
    await revalidateFaqCaches(existing.category);
}
