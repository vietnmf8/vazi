import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";

export type AdminPageSettingItem = {
    key: string;
    value: unknown;
    updated_at: string;
};

/** Map DB key → cache tag khớp với cacheTag() trong UI home.api.ts */
const PAGE_TAG_MAP: Record<string, string> = {
    "HOME_HOW_IT_WORKS": "how-it-works",
    "HOME_PRICING":       "pricing-preview",
    "HOME_TESTIMONIALS":  "testimonials",
    "HOME_CONFIG":        "home-config",
    "about-us":           "about-us",
    "contact-us":         "contact-us",
    "guide-fees":         "guide-fees",
    "emergency-inquiry":  "emergency-inquiry",
};

function toDto(row: { key: string; value: unknown; updatedAt: Date }): AdminPageSettingItem {
    return {
        key: row.key,
        value: row.value,
        updated_at: row.updatedAt.toISOString(),
    };
}

export async function listPageSettings(): Promise<AdminPageSettingItem[]> {
    const rows = await prisma.pageSetting.findMany({ orderBy: { key: "asc" } });
    return rows.map(toDto);
}

export async function getPageSettingByKey(key: string): Promise<AdminPageSettingItem> {
    const row = await prisma.pageSetting.findUnique({ where: { key } });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return toDto(row);
}

export async function updatePageSetting(key: string, value: unknown): Promise<AdminPageSettingItem> {
    const updated = await prisma.pageSetting.upsert({
        where: { key },
        create: {
            key,
            value: value as Prisma.InputJsonValue,
        },
        update: {
            value: value as Prisma.InputJsonValue,
        },
    });

    const tag = PAGE_TAG_MAP[key];
    if (tag) {
        void revalidateCache(tag);
    }

    return toDto(updated);
}
