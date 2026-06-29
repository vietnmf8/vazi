import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { NotFoundError } from "@/utils/errors";
import { httpCodes } from "@/configs/constants";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreatePricingRuleDto,
    AdminPricingRulesQueryDto,
    AdminUpdatePricingRuleDto,
} from "@/validators/admin/pricing-rules.validator";

export type AdminPricingRuleListItem = {
    id: string;
    rule_type: string;
    key: string;
    price: number;
    is_active: boolean;
    name: string;
};

export type AdminPricingRuleDetail = AdminPricingRuleListItem & {
    translations: Array<{
        language_code: string;
        name: string;
        processing: string | null;
        features: unknown;
    }>;
};

function toListItem(row: {
    id: string;
    ruleType: string;
    key: string;
    price: Prisma.Decimal;
    isActive: boolean;
    translations?: Array<{ languageCode: string; name: string }>;
}): AdminPricingRuleListItem {
    const vi = row.translations?.find((t) => t.languageCode === "vi");
    const defaultName = row.translations?.[0]?.name ?? row.key;
    return {
        id: row.id,
        rule_type: row.ruleType,
        key: row.key,
        price: Number(row.price),
        is_active: row.isActive,
        name: vi?.name ?? defaultName,
    };
}

export async function listAdminPricingRules(
    query: AdminPricingRulesQueryDto,
): Promise<{ rows: AdminPricingRuleListItem[]; total: number }> {
    const where: Prisma.PricingRuleWhereInput = {};
    if (query.rule_type) {
        where.ruleType = query.rule_type;
    }
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.search) {
        where.OR = [
            { key: { contains: query.search } },
            { translations: { some: { name: { contains: query.search } } } }
        ];
        const searchNum = Number(query.search);
        if (!isNaN(searchNum)) {
            where.OR.push({ price: searchNum });
        }
    }

    const orderBy: Prisma.PricingRuleOrderByWithRelationInput[] = [];
    if (query.sort) {
        const isDesc = query.sort.startsWith("-");
        const field = isDesc ? query.sort.slice(1) : query.sort;
        orderBy.push({ [field]: isDesc ? "desc" : "asc" });
    } else {
        orderBy.push({ ruleType: "asc" }, { key: "asc" });
    }

    const [total, rows] = await prisma.$transaction([
        prisma.pricingRule.count({ where }),
        prisma.pricingRule.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            include: { translations: true },
        }),
    ]);
    return { rows: rows.map(toListItem), total };
}

export async function getAdminPricingRuleById(id: string): Promise<AdminPricingRuleDetail> {
    const row = await prisma.pricingRule.findUnique({
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
            name: t.name,
            processing: t.processing,
            features: t.features,
        })),
    };
}

export async function createAdminPricingRule(
    input: AdminCreatePricingRuleDto,
): Promise<AdminPricingRuleDetail> {
    const dup = await prisma.pricingRule.findFirst({
        where: { ruleType: input.rule_type, key: input.key },
    });
    if (dup) {
        throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
    }

    const id = randomUUID();
    await prisma.pricingRule.create({
        data: {
            id,
            ruleType: input.rule_type,
            key: input.key,
            price: input.price,
            isActive: input.is_active ?? true,
            translations: input.translations?.length
                ? {
                      create: input.translations.map((t) => ({
                          id: randomUUID(),
                          languageCode: t.language_code,
                          name: t.name,
                          processing: t.processing ?? null,
                          features: t.features as Prisma.InputJsonValue | undefined,
                      })),
                  }
                : undefined,
        },
    });
    void revalidateCache("rules_config");
    return getAdminPricingRuleById(id);
}

export async function updateAdminPricingRule(
    id: string,
    input: AdminUpdatePricingRuleDto,
): Promise<AdminPricingRuleDetail> {
    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    await prisma.$transaction(async (tx) => {
        await tx.pricingRule.update({
            where: { id },
            data: {
                ruleType: input.rule_type,
                key: input.key,
                price: input.price,
                isActive: input.is_active,
            },
        });

        if (input.translations?.length) {
            for (const t of input.translations) {
                await tx.pricingRuleTranslation.upsert({
                    where: {
                        pricingRuleId_languageCode: {
                            pricingRuleId: id,
                            languageCode: t.language_code,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        pricingRuleId: id,
                        languageCode: t.language_code,
                        name: t.name,
                        processing: t.processing ?? null,
                        features: t.features as Prisma.InputJsonValue | undefined,
                    },
                    update: {
                        name: t.name,
                        processing: t.processing ?? null,
                        features: t.features as Prisma.InputJsonValue | undefined,
                    },
                });
            }
        }
    });

    void revalidateCache("rules_config");
    return getAdminPricingRuleById(id);
}

export async function deleteAdminPricingRule(id: string): Promise<void> {
    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.pricingRule.delete({ where: { id } });
    void revalidateCache("rules_config");
}
