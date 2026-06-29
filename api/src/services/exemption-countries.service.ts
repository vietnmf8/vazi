import prisma from "@/lib/prisma";

export const getExemptionCountries = async () => {
    const countries = await prisma.visaExemptionCountry.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
    });

    return countries.map((c) => ({
        id: c.id,
        country_code: c.countryCode,
        exemption_days: c.exemptionDays,
        display_order: c.displayOrder,
        is_active: c.isActive,
    }));
};
