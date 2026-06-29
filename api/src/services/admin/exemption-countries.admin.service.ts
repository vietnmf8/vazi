import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { NotFoundError } from "@/utils/errors";
import { httpCodes } from "@/configs/constants";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateExemptionCountryDto,
    AdminExemptionCountriesQueryDto,
    AdminUpdateExemptionCountryDto,
} from "@/validators/admin/exemption-countries.validator";

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import viLocale from "i18n-iso-countries/langs/vi.json";

countries.registerLocale(enLocale);
countries.registerLocale(viLocale);

export type AdminExemptionCountryListItem = {
    id: string;
    sequence_no: number;
    country_code: string;
    exemption_days: number;
    display_order: number;
    is_active: boolean;
};

function toDto(row: {
    id: string;
    countryCode: string;
    exemptionDays: number;
    displayOrder: number;
    isActive: boolean;
    sequenceNo: number;
}): AdminExemptionCountryListItem {
    return {
        id: row.id,
        country_code: row.countryCode,
        exemption_days: row.exemptionDays,
        display_order: row.displayOrder,
        is_active: row.isActive,
        sequence_no: row.sequenceNo,
    };
}

export async function listAdminExemptionCountries(
    query: AdminExemptionCountriesQueryDto,
): Promise<{ rows: AdminExemptionCountryListItem[]; total: number }> {
    const where: Prisma.VisaExemptionCountryWhereInput = {};
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.search) {
        const searchLower = query.search.toLowerCase();
        const searchUpper = query.search.toUpperCase();
        
        const codesEN = countries.getNames("en", { select: "official" });
        const codesVI = countries.getNames("vi", { select: "official" });
        
        const matchedCodes = new Set<string>();
        
        if (query.search.length <= 8) {
            matchedCodes.add(searchUpper);
        }
        
        for (const [code, name] of Object.entries(codesEN)) {
            if (name.toLowerCase().includes(searchLower)) {
                matchedCodes.add(code.toUpperCase());
            }
        }
        for (const [code, name] of Object.entries(codesVI)) {
            if (name.toLowerCase().includes(searchLower)) {
                matchedCodes.add(code.toUpperCase());
            }
        }
        
        where.countryCode = { in: Array.from(matchedCodes) };
    }

    let orderBy: Prisma.VisaExemptionCountryOrderByWithRelationInput | Prisma.VisaExemptionCountryOrderByWithRelationInput[] = [
        { displayOrder: "asc" },
        { countryCode: "asc" },
    ];

    if (query.sort) {
        const isDesc = query.sort.startsWith("-");
        const field = isDesc ? query.sort.slice(1) : query.sort;
        if (field === "sequenceNo" || field === "countryCode" || field === "exemptionDays" || field === "isActive") {
            orderBy = { [field]: isDesc ? "desc" : "asc" };
        }
    }

    const [total, rows] = await prisma.$transaction([
        prisma.visaExemptionCountry.count({ where }),
        prisma.visaExemptionCountry.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toDto), total };
}

export async function getAdminExemptionCountryById(
    id: string,
): Promise<AdminExemptionCountryListItem> {
    const row = await prisma.visaExemptionCountry.findUnique({ where: { id } });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return toDto(row);
}

export async function createAdminExemptionCountry(
    input: AdminCreateExemptionCountryDto,
): Promise<AdminExemptionCountryListItem> {
    const code = input.country_code.toUpperCase();
    const dup = await prisma.visaExemptionCountry.findUnique({ where: { countryCode: code } });
    if (dup) {
        throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
    }

    const row = await prisma.visaExemptionCountry.create({
        data: {
            id: randomUUID(),
            countryCode: code,
            exemptionDays: input.exemption_days,
            displayOrder: input.display_order ?? 0,
            isActive: input.is_active ?? true,
        },
    });
    void revalidateCache("exemption-countries");
    return toDto(row);
}

export async function updateAdminExemptionCountry(
    id: string,
    input: AdminUpdateExemptionCountryDto,
): Promise<AdminExemptionCountryListItem> {
    const existing = await prisma.visaExemptionCountry.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    const row = await prisma.visaExemptionCountry.update({
        where: { id },
        data: {
            countryCode: input.country_code?.toUpperCase(),
            exemptionDays: input.exemption_days,
            displayOrder: input.display_order,
            isActive: input.is_active,
        },
    });
    void revalidateCache("exemption-countries");
    return toDto(row);
}

export async function deleteAdminExemptionCountry(id: string): Promise<void> {
    const existing = await prisma.visaExemptionCountry.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.visaExemptionCountry.delete({ where: { id } });
    void revalidateCache("exemption-countries");
}
