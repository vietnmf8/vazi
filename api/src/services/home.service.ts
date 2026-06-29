import prisma from "@/lib/prisma";

export async function getNationalities(locale: string) {
    const defaultLocale = "en";
    const nationalities = await prisma.nationality.findMany({
        include: {
            translations: true,
        },
        orderBy: { countryName: "asc" },
    });

    return nationalities.map((n) => {
        const t = n.translations.find((tr) => tr.languageCode === locale) || n.translations.find((tr) => tr.languageCode === defaultLocale);
        return {
            id: n.id,
            code: n.countryCode.toLowerCase(),
            label: t ? t.countryName : n.countryName,
        };
    });
}

export async function getHowItWorks(locale: string) {
    const setting = await prisma.pageSetting.findUnique({
        where: { key: "HOME_HOW_IT_WORKS" }
    });
    
    if (!setting || !setting.value) return [];

    const steps = setting.value as any[];
    return steps.map((s, index) => {
        return {
            id: `step-${index + 1}`,
            step: index + 1,
            icon: s.icon,
            title: s.title?.[locale] || s.title?.en || s.title || "",
            description: s.description?.[locale] || s.description?.en || s.description || "",
        };
    });
}

export async function getPricingPreview(locale: string) {
    const defaultLocale = "en";
    const rules = await prisma.pricingRule.findMany({
        where: { isActive: true, ruleType: "BASE_FEE" },
        include: { translations: true },
        orderBy: { price: 'asc' },
        take: 3,
    });

    return rules.map((r) => {
        const t = r.translations.find((tr) => tr.languageCode === locale) || r.translations.find((tr) => tr.languageCode === defaultLocale);
        return {
            id: r.id,
            key: r.key,
            price: Number(r.price),
            name: t ? t.name : "",
            processing: t ? t.processing : "",
            features: t && t.features ? t.features : [],
        };
    });
}

export async function getTestimonials(_locale: string) {
    const reviews = await prisma.review.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
    });
    
    return reviews.map((r) => ({
        id: r.id,
        name: r.authorName,
        country: r.countryCode.toLowerCase(),
        rating: r.rating,
        text: r.content,
        avatar: r.avatarUrl,
    }));
}

export async function getHomeConfig(locale: string) {
    const setting = await prisma.pageSetting.findUnique({
        where: { key: "home" }
    });
    
    if (!setting) {
        return null;
    }
    
    // value is a Json object, return it as is or extract localized part
    return setting.value;
}
