import prisma from "@/lib/prisma";
import { mapNationalitiesToPublic } from "@/transformers/nationalities.transformer";
import type { NationalityPublicDto } from "@/transformers/nationalities.transformer";

// Cache riêng cho API layer — Next.js Data Cache không có tác dụng ở đây (Express server).
// TTL 10 phút: dữ liệu quốc tịch thay đổi rất hiếm, không cần revalidate liên tục.
const nationalityCache = new Map<string, { data: NationalityPublicDto[]; expiresAt: number }>();
const NATIONALITY_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listPublicNationalities(locale: string = "vi"): Promise<NationalityPublicDto[]> {
    const cached = nationalityCache.get(locale);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const rows = await prisma.nationality.findMany({
        orderBy: { countryName: "asc" },
        include: {
            translations: {
                where: { languageCode: locale }
            }
        }
    });
    const data = mapNationalitiesToPublic(rows);
    nationalityCache.set(locale, { data, expiresAt: Date.now() + NATIONALITY_CACHE_TTL_MS });
    return data;
}
