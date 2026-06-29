import { getLocale } from "next-intl/server";
import { getPorts, getEligibilityRules } from "@/lib/api/config";
import { getHomeConfig, getNationalities } from "@/lib/api/home.api";
import { HeroSection } from "@/components/sections";

export default async function HeroSectionServer() {
    const locale = await getLocale();

    const [ports, rules, homeConfigData, apiNationalities] = await Promise.all([
        getPorts(),
        getEligibilityRules(locale),
        getHomeConfig(locale),
        getNationalities(locale)
    ]);

    const heroData = homeConfigData?.hero?.[locale] || homeConfigData?.hero?.en || {};

    return (
        <HeroSection 
            ports={ports} 
            rules={rules} 
            data={heroData} 
            apiNationalities={apiNationalities} 
        />
    );
}
