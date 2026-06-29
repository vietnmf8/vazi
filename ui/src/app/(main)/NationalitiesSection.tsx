import { FeaturedNationalities } from "@/components/sections"; // SmartEligibilityWidget tạm ẩn
import { getNationalities } from "@/lib/api/home.api";
import { getLocale } from "next-intl/server";

export default async function NationalitiesSection() {
    const locale = await getLocale();
    const rawNationalities = await getNationalities(locale).catch(() => []);
    const nationalities = Array.isArray(rawNationalities) ? rawNationalities.map(n => ({ 
        ...n, 
        code: n.countryCode || n.code,
        name: n.countryName || n.name,
        label: n.countryName || n.name || n.label,
        is_eligible_evisa: n.isEligibleEvisa !== undefined ? n.isEligibleEvisa : n.is_eligible_evisa
    })) : [];

    return (
        <div data-ai-target="nationalities">
            <FeaturedNationalities nationalities={nationalities} />
            {/* <SmartEligibilityWidget nationalities={nationalities} /> */}
        </div>
    );
}
