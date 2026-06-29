import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";

export type ExemptionPublicDto = {
    country_code: string;
    country_name: string;
    exemption_days: number;
    /** Không có cột riêng trong DB — placeholder để FE hiển thị tip cố định hoặc để trống */
    notes: string;
};

/**
 * Lookup một quốc gia theo ISO alpha-2 — phục vụ trang exemption checker.
 *
 * @param countryCodeAlpha2 - ISO 3166-1 alpha-2 uppercase
 */
export async function getExemptionByCountryCode(countryCodeAlpha2: string): Promise<ExemptionPublicDto> {
    const row = await prisma.nationality.findUnique({
        where: { countryCode: countryCodeAlpha2 },
        select: {
            countryCode: true,
            countryName: true,
            exemptionDays: true,
        },
    });

    if (!row) {
        throw new NotFoundError("errors.exemption_not_found");
    }

    /** Gợi ý ngắn cho UX — không thay thế tư vấn pháp lý */
    let notes = "";
    if (row.exemptionDays > 0) {
        notes =
            `Visa exemption may apply for stays up to ${row.exemptionDays} days ` +
            `(informational — verify with official immigration rules before travel).`;
    }

    return {
        country_code: row.countryCode,
        country_name: row.countryName,
        exemption_days: row.exemptionDays,
        notes,
    };
}
