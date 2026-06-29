import { ApplyClient } from "./_components/ApplyClient";
import { getNationalities, getPorts } from "@/lib/api/pricing.api";
import { getPricingConfig } from "./_components/priceCalculator";
import { getLocale } from "next-intl/server";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Apply for Vietnam E-Visa | FASTVISA",
    description: "Apply for your Vietnam E-Visa online in 3 easy steps.",
};

export default async function ApplyPage() {
    const locale = await getLocale();
    const [rawPorts, rawNationalities, pricingConfig] = await Promise.all([
        getPorts().catch(() => []),
        getNationalities().catch(() => []),
        getPricingConfig(locale).catch(() => null),
    ]);
    
    const ports = Array.isArray(rawPorts) ? rawPorts : [];
    const nationalities = Array.isArray(rawNationalities) ? rawNationalities : [];

    return (
        <ApplyClient ports={ports} nationalities={nationalities} pricingConfig={pricingConfig} />
    );
}
