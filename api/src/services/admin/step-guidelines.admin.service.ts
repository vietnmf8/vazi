import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateStepGuidelineDto,
    AdminStepGuidelinesQueryDto,
    AdminUpdateStepGuidelineDto,
} from "@/validators/admin/step-guidelines.validator";

export type AdminStepGuidelineListItem = {
    id: string;
    step_number: number;
    icon: string | null;
    display_order: number;
    is_active: boolean;
    created_at: string;
};

export type AdminStepGuidelineDetail = AdminStepGuidelineListItem & {
    translations: Array<{
        language_code: string;
        title: string;
        description: string;
    }>;
};

function toListItem(row: {
    id: string;
    stepNumber: number;
    icon: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
}): AdminStepGuidelineListItem {
    return {
        id: row.id,
        step_number: row.stepNumber,
        icon: row.icon,
        display_order: row.displayOrder,
        is_active: row.isActive,
        created_at: row.createdAt.toISOString(),
    };
}

export async function listAdminStepGuidelines(
    query: AdminStepGuidelinesQueryDto,
): Promise<{ rows: AdminStepGuidelineListItem[]; total: number }> {
    const where: Prisma.StepGuidelineWhereInput = {};
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }

    const [total, rows] = await prisma.$transaction([
        prisma.stepGuideline.count({ where }),
        prisma.stepGuideline.findMany({
            where,
            orderBy: [{ stepNumber: "asc" }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toListItem), total };
}

export async function getAdminStepGuidelineById(id: string): Promise<AdminStepGuidelineDetail> {
    const row = await prisma.stepGuideline.findUnique({
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
            title: t.title,
            description: t.description,
        })),
    };
}

export async function createAdminStepGuideline(
    input: AdminCreateStepGuidelineDto,
): Promise<AdminStepGuidelineDetail> {
    const id = randomUUID();
    await prisma.stepGuideline.create({
        data: {
            id,
            stepNumber: input.step_number,
            icon: input.icon ?? null,
            displayOrder: input.display_order ?? 0,
            isActive: input.is_active ?? true,
            translations: input.translations?.length
                ? {
                      create: input.translations.map((t) => ({
                          id: randomUUID(),
                          languageCode: t.language_code,
                          title: t.title,
                          description: t.description,
                      })),
                  }
                : undefined,
        },
    });
    await revalidateCache("how-it-works");
    return getAdminStepGuidelineById(id);
}

export async function updateAdminStepGuideline(
    id: string,
    input: AdminUpdateStepGuidelineDto,
): Promise<AdminStepGuidelineDetail> {
    const existing = await prisma.stepGuideline.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    await prisma.$transaction(async (tx) => {
        await tx.stepGuideline.update({
            where: { id },
            data: {
                stepNumber: input.step_number,
                icon: input.icon,
                displayOrder: input.display_order,
                isActive: input.is_active,
            },
        });

        if (input.translations?.length) {
            for (const t of input.translations) {
                await tx.stepGuidelineTranslation.upsert({
                    where: {
                        stepGuidelineId_languageCode: {
                            stepGuidelineId: id,
                            languageCode: t.language_code,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        stepGuidelineId: id,
                        languageCode: t.language_code,
                        title: t.title,
                        description: t.description,
                    },
                    update: {
                        title: t.title,
                        description: t.description,
                    },
                });
            }
        }
    });

    await revalidateCache("how-it-works");
    return getAdminStepGuidelineById(id);
}

export async function deleteAdminStepGuideline(id: string): Promise<void> {
    const existing = await prisma.stepGuideline.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.stepGuideline.delete({ where: { id } });
    await revalidateCache("how-it-works");
}

