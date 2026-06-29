import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { NotFoundError } from "@/utils/errors";
import { httpCodes } from "@/configs/constants";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateEligibilityRuleDto,
    AdminEligibilityRulesQueryDto,
    AdminUpdateEligibilityRuleDto,
} from "@/validators/admin/eligibility-rules.validator";

export type AdminEligibilityRuleListItem = {
    id: string;
    country_code: string;
    is_active: boolean;
};

export type AdminEligibilityRuleDetail = AdminEligibilityRuleListItem & {
    translations: Array<{
        language_code: string;
        status: string;
        stay: string;
        fee: string;
        processing: string;
        requirements: unknown;
        note: string | null;
    }>;
};

function toListItem(row: {
    id: string;
    countryCode: string;
    isActive: boolean;
}): AdminEligibilityRuleListItem {
    return {
        id: row.id,
        country_code: row.countryCode,
        is_active: row.isActive,
    };
}

export async function listAdminEligibilityRules(
    query: AdminEligibilityRulesQueryDto,
): Promise<{ rows: AdminEligibilityRuleListItem[]; total: number }> {
    const where: Prisma.EligibilityRuleWhereInput = {};
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.search) {
        where.countryCode = { contains: query.search };
    }

    const [total, rows] = await prisma.$transaction([
        prisma.eligibilityRule.count({ where }),
        prisma.eligibilityRule.findMany({
            where,
            orderBy: { countryCode: "asc" },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toListItem), total };
}

export async function getAdminEligibilityRuleById(
    id: string,
): Promise<AdminEligibilityRuleDetail> {
    const row = await prisma.eligibilityRule.findUnique({
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
            status: t.status,
            stay: t.stay,
            fee: t.fee,
            processing: t.processing,
            requirements: t.requirements,
            note: t.note,
        })),
    };
}

export async function createAdminEligibilityRule(
    input: AdminCreateEligibilityRuleDto,
): Promise<AdminEligibilityRuleDetail> {
    const code = input.country_code.toUpperCase();
    const dup = await prisma.eligibilityRule.findUnique({ where: { countryCode: code } });
    if (dup) {
        throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
    }

    const id = randomUUID();
    await prisma.eligibilityRule.create({
        data: {
            id,
            countryCode: code,
            isActive: input.is_active ?? true,
            translations: input.translations?.length
                ? {
                      create: input.translations.map((t) => ({
                          id: randomUUID(),
                          languageCode: t.language_code,
                          status: t.status,
                          stay: t.stay,
                          fee: t.fee,
                          processing: t.processing,
                          requirements: t.requirements as Prisma.InputJsonValue,
                          note: t.note ?? null,
                      })),
                  }
                : undefined,
        },
    });
    void revalidateCache("rules_config");
    return getAdminEligibilityRuleById(id);
}

export async function updateAdminEligibilityRule(
    id: string,
    input: AdminUpdateEligibilityRuleDto,
): Promise<AdminEligibilityRuleDetail> {
    const existing = await prisma.eligibilityRule.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    await prisma.$transaction(async (tx) => {
        await tx.eligibilityRule.update({
            where: { id },
            data: {
                countryCode: input.country_code?.toUpperCase(),
                isActive: input.is_active,
            },
        });

        if (input.translations?.length) {
            for (const t of input.translations) {
                await tx.eligibilityRuleTranslation.upsert({
                    where: {
                        eligibilityRuleId_languageCode: {
                            eligibilityRuleId: id,
                            languageCode: t.language_code,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        eligibilityRuleId: id,
                        languageCode: t.language_code,
                        status: t.status,
                        stay: t.stay,
                        fee: t.fee,
                        processing: t.processing,
                        requirements: t.requirements as Prisma.InputJsonValue,
                        note: t.note ?? null,
                    },
                    update: {
                        status: t.status,
                        stay: t.stay,
                        fee: t.fee,
                        processing: t.processing,
                        requirements: t.requirements as Prisma.InputJsonValue,
                        note: t.note ?? null,
                    },
                });
            }
        }
    });

    void revalidateCache("rules_config");
    return getAdminEligibilityRuleById(id);
}

export async function deleteAdminEligibilityRule(id: string): Promise<void> {
    const existing = await prisma.eligibilityRule.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.eligibilityRule.delete({ where: { id } });
    void revalidateCache("rules_config");
}
