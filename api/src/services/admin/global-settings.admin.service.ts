import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";

/** Map prefix key global → ISR tag trên @ui */
const TAG_MAP: Record<string, string> = {
    SITE_: "footer",
    HOME_: "home-data",
    ABOUT_: "about-us",
    FAQ_: "faqs",
    GUIDE_: "guidelines",
    CONFIG_: "rules_config",
};

export type AdminSettingItem = {
    key: string;
    value: unknown;
    updated_at: string;
};

function toDto(row: { key: string; value: unknown; updatedAt: Date }): AdminSettingItem {
    return {
        key: row.key,
        value: row.value,
        updated_at: row.updatedAt.toISOString(),
    };
}

/** Danh sách toàn bộ global settings cho admin */
export async function listGlobalSettings(): Promise<AdminSettingItem[]> {
    const rows = await prisma.globalSetting.findMany({ orderBy: { key: "asc" } });
    return rows.map(toDto);
}

/** Chi tiết một key */
export async function getGlobalSettingByKey(key: string): Promise<AdminSettingItem> {
    const row = await prisma.globalSetting.findUnique({ where: { key } });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return toDto(row);
}

/** Cập nhật value global settings qua admin JWT — thay thế flow `x-admin-secret` đã gỡ ở Sprint E */
export async function updateGlobalSetting(key: string, value: unknown): Promise<AdminSettingItem> {
    const existing = await prisma.globalSetting.findUnique({ where: { key } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    const updated = await prisma.globalSetting.update({
        where: { key },
        data: { value: value as Prisma.InputJsonValue },
    });

    const tag = Object.entries(TAG_MAP).find(([prefix]) => key.startsWith(prefix))?.[1];
    if (tag) {
        void revalidateCache(tag);
    }

    return toDto(updated);
}
