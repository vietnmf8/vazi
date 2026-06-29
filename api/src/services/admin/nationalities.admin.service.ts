import { randomUUID } from "node:crypto";

import { NationalityGroup, type Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { NotFoundError } from "@/utils/errors";
import { httpCodes } from "@/configs/constants";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateNationalityDto,
    AdminNationalitiesQueryDto,
    AdminUpdateNationalityDto,
} from "@/validators/admin/nationalities.validator";

export type AdminNationalityListItem = {
    id: string;
    sequence_no: number;
    country_name: string;
    country_code: string;
    exemption_days: number;
    group: NationalityGroup;
};

export type AdminNationalityDetail = AdminNationalityListItem & {
    translations: Array<{ language_code: string; country_name: string }>;
};

function toListItem(row: {
    id: string;
    sequenceNo: number;
    countryName: string;
    countryCode: string;
    exemptionDays: number;
    group: NationalityGroup;
}): AdminNationalityListItem {
    return {
        id: row.id,
        sequence_no: row.sequenceNo,
        country_name: row.countryName,
        country_code: row.countryCode,
        exemption_days: row.exemptionDays,
        group: row.group,
    };
}

export async function listAdminNationalities(
    query: AdminNationalitiesQueryDto,
): Promise<{ rows: AdminNationalityListItem[]; total: number }> {
    const where: Prisma.NationalityWhereInput = {};
    if (query.search) {
        where.OR = [
            { countryName: { contains: query.search } },
            { countryCode: { contains: query.search } },
        ];
    }
    if (query.group) {
        where.group = query.group;
    }

    let orderBy: Prisma.NationalityOrderByWithRelationInput = { countryName: "asc" };
    if (query.sort) {
        const isDesc = query.sort.startsWith("-");
        const field = isDesc ? query.sort.slice(1) : query.sort;
        if (field === "countryCode" || field === "countryName" || field === "exemptionDays" || field === "group" || field === "sequenceNo") {
            orderBy = { [field]: isDesc ? "desc" : "asc" };
        }
    }

    const [total, rows] = await prisma.$transaction([
        prisma.nationality.count({ where }),
        prisma.nationality.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toListItem), total };
}

export async function getAdminNationalityById(id: string): Promise<AdminNationalityDetail> {
    const row = await prisma.nationality.findUnique({
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
            country_name: t.countryName,
        })),
    };
}

export async function createAdminNationality(
    input: AdminCreateNationalityDto,
): Promise<AdminNationalityDetail> {
    const codeTaken = await prisma.nationality.findUnique({
        where: { countryCode: input.country_code.toUpperCase() },
    });
    if (codeTaken) {
        throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
    }

    const id = randomUUID();
    await prisma.nationality.create({
        data: {
            id,
            countryName: input.country_name,
            countryCode: input.country_code.toUpperCase(),
            exemptionDays: input.exemption_days,
            group: input.group,
            translations: input.translations?.length
                ? {
                      create: input.translations.map((t) => ({
                          id: randomUUID(),
                          languageCode: t.language_code,
                          countryName: t.country_name,
                      })),
                  }
                : undefined,
        },
    });
    void revalidateCache("nationalities");
    return getAdminNationalityById(id);
}

export async function updateAdminNationality(
    id: string,
    input: AdminUpdateNationalityDto,
): Promise<AdminNationalityDetail> {
    const existing = await prisma.nationality.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    if (input.country_code && input.country_code.toUpperCase() !== existing.countryCode) {
        const codeTaken = await prisma.nationality.findUnique({
            where: { countryCode: input.country_code.toUpperCase() },
        });
        if (codeTaken) {
            throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.nationality.update({
            where: { id },
            data: {
                countryName: input.country_name,
                countryCode: input.country_code?.toUpperCase(),
                exemptionDays: input.exemption_days,
                group: input.group,
            },
        });

        if (input.translations?.length) {
            for (const t of input.translations) {
                await tx.nationalityTranslation.upsert({
                    where: {
                        nationalityId_languageCode: {
                            nationalityId: id,
                            languageCode: t.language_code,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        nationalityId: id,
                        languageCode: t.language_code,
                        countryName: t.country_name,
                    },
                    update: { countryName: t.country_name },
                });
            }
        }
    });

    void revalidateCache("nationalities");
    return getAdminNationalityById(id);
}

export async function deleteAdminNationality(id: string): Promise<void> {
    const existing = await prisma.nationality.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.nationality.delete({ where: { id } });
    void revalidateCache("nationalities");
}
