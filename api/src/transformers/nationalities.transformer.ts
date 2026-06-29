import { NationalityGroup, type Nationality } from "@prisma/client";

/**
 * Bản ghi quốc tịch trả ra public — snake_case cho FE roadmap.
 */
export type NationalityPublicDto = {
    code: string;
    name: string;
    exemption_days: number;
    group: NationalityGroup;
    is_custom_name?: boolean;
};

/**
 * Map Prisma → DTO public (không lộ id nội bộ).
 *
 * @param rows - Bản ghi từ DB
 * @returns Danh sách đúng field contract GET /nationalities
 */
export function mapNationalitiesToPublic(rows: any[]): NationalityPublicDto[] {
    return rows.map((row) => {
        const trans = row.translations?.[0];
        return {
            code: row.countryCode,
            name: trans ? trans.countryName : row.countryName,
            exemption_days: row.exemptionDays,
            group: row.group,
            is_custom_name: !!trans,
        };
    });
}
