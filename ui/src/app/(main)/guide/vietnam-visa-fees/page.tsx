import type { Metadata } from "next";
import Link from "next/link";
import {
    AlertTriangle,
    Info,
    User,
    Users,
    UsersRound,
    Building2,
    Globe2,
    Plane,
} from "lucide-react";
import { PageBanner } from "@/components/layout/PageBanner";
import { Button } from "@/components/ui/Button";
import { FloatingTOC } from "@/components/features/FloatingTOC";
import { getTranslations, getLocale } from "next-intl/server";
import { getCalculatorConfig } from "@/lib/api/pricing.api";
import { getGuideFeesSettings } from "@/lib/api/guide-fees.api";

/**
 * Tạo metadata động hỗ trợ đa ngôn ngữ.
 * WHY: Đảm bảo SEO chính xác theo từng ngôn ngữ đã chọn của người dùng.
 */
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("VietnamVisaFeesPage");
    return {
        title: t("title"),
        description: t("subtitle"),
    };
}

const IconMap: Record<string, any> = {
    User, Users, UsersRound, Building2
};

/**
 * Bảng giá dịch vụ visa kèm theo các tính toán ưu đãi nhóm và các dịch vụ thêm.
 * Hỗ trợ đa ngôn ngữ đầy đủ.
 * 
 * WHY: Cải thiện trải nghiệm người dùng toàn cầu khi tra cứu chi phí dịch vụ visa.
 */
export default async function VietnamVisaFeesPage() {
    const t = await getTranslations("VietnamVisaFeesPage");
    const locale = await getLocale() as "en" | "vi" | "ko";
    
    const config = await getCalculatorConfig(locale);
    const guideFeesSettings = await getGuideFeesSettings();
    
    // WHY: Lấy dữ liệu động cho các mức ưu đãi nhóm, dịch vụ phụ và chú thích từ API
    const paxDiscountTiersData = guideFeesSettings?.paxDiscountTiers || [];
    const disclaimerData = guideFeesSettings?.disclaimer || {};
    const extraServicesData = guideFeesSettings?.extraServices || [];

    const paxDiscountTiers = paxDiscountTiersData.map((tier: any) => ({
        ...tier,
        label: tier.label[locale] || tier.label.en,
        Icon: IconMap[tier.icon] || User
    }));

    const getTranslation = (data: any, key: string, fallbackKey: string) => {
        return data?.[key]?.[locale] || data?.[key]?.en || t(fallbackKey as any);
    };
    
    const baseFees = config.BASE_FEES || {};
    const labels = config.VISA_CATEGORY_LABELS || {};
    const processing = config.PROCESSING_OPTIONS || [];

    const getProcessingFee = (key: string) => {
        const opt = processing.find((p: any) => p.value === key);
        return opt ? opt.price : 0;
    };

    const generateRows = (groupKeys: string[], groupName: string) => {
        return groupKeys.map(key => {
            const is30 = key.includes("30_DAYS") || key.includes("1_MONTH");
            const suffix = is30 ? "_30" : (key.includes("90_DAYS") || key.includes("3_MONTHS") ? "_90" : "");
            
            const base = baseFees[key] || 0;
            const urgent4d = base + getProcessingFee(`URGENT_4WD${suffix}`);
            const urgent2d = base + getProcessingFee(`URGENT_2WD${suffix}`);
            const urgent1d = base + getProcessingFee(`URGENT_1WD`);
            
            return {
                visaType: labels[key] || key,
                group: groupName,
                normal: base,
                urgent4d,
                urgent2d,
                urgent1d,
            };
        });
    };

    const eVisaRows = generateRows([
        "E_VISA_30_DAYS_SINGLE", 
        "E_VISA_90_DAYS_SINGLE", 
        "E_VISA_90_DAYS_MULTIPLE"
    ], "E-Visa");
    
    const voaRows = generateRows([
        "VOA_1_MONTH_SINGLE", 
        "VOA_1_MONTH_MULTIPLE", 
        "VOA_3_MONTHS_SINGLE", 
        "VOA_3_MONTHS_MULTIPLE"
    ], "VOA");

    const tocSections = [
        { id: "pax-discount", label: t("groupDiscountPricing") },
        { id: "evisa-pricing", label: t("eVisa") },
        { id: "voa-pricing", label: t("voa") },
        { id: "extra-services", label: t("extraServicesTitle") },
    ];

    return (
        <div className="min-h-screen font-[family-name:var(--font-inter)]">
            <FloatingTOC sections={tocSections} />
            <PageBanner
                title={t("title")}
                subtitle={t("subtitle")}
                breadcrumb={[
                    { label: t("breadcrumbHome"), href: "/" },
                    { label: t("breadcrumbGuide"), href: "/guide" },
                    { label: t("title") },
                ]}
            />

            <div className="max-w-275 mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
                {/* ── Fee Structure Disclaimer Banner ── */}
                <div className="rounded-xl border border-amber-500/25 bg-[rgba(251,191,36,0.06)] p-5 flex gap-4">
                    <AlertTriangle className="size-5 text-(--color-primary) shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-(--color-text-primary)">
                            {getTranslation(disclaimerData, "title", "disclaimerTitle")}
                        </p>
                        <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                            <strong className="text-(--color-text-primary)">{getTranslation(disclaimerData, "serviceFee", "disclaimerServiceFee")}</strong>
                            {getTranslation(disclaimerData, "serviceFeeDesc", "disclaimerServiceFeeDesc")}
                        </p>
                        <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                            <strong className="text-(--color-text-primary)">{getTranslation(disclaimerData, "govFee", "disclaimerGovFee")}</strong>
                            {getTranslation(disclaimerData, "govFeeDesc1", "disclaimerGovFeeDesc1")}
                            <span className="text-(--color-primary) font-semibold">{getTranslation(disclaimerData, "govFeeDesc2", "disclaimerGovFeeDesc2")}</span>
                            {getTranslation(disclaimerData, "govFeeDesc3", "disclaimerGovFeeDesc3")}
                            <span className="font-semibold">{getTranslation(disclaimerData, "govFeeDesc4", "disclaimerGovFeeDesc4")}</span>
                            {getTranslation(disclaimerData, "govFeeDesc5", "disclaimerGovFeeDesc5")}
                            <span className="font-semibold">{getTranslation(disclaimerData, "govFeeDesc6", "disclaimerGovFeeDesc6")}</span>
                            {getTranslation(disclaimerData, "govFeeDesc7", "disclaimerGovFeeDesc7")}
                        </p>
                    </div>
                </div>

                {/* ── Group / Pax Discount Tier Table ── */}
                <section id="pax-discount" aria-labelledby="pax-discount-heading" data-ai-target="pax_discount">
                    <p className="section-label mb-3">{t("saveMoreTogether")}</p>
                    <h2 id="pax-discount-heading" className="section-subtitle mb-2">
                        {t("groupDiscountPricing")}
                    </h2>
                    <p className="body-text-sm mb-8">
                        {t("groupDiscountDesc")}
                    </p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {paxDiscountTiers.map((tier: any) => (
                            <div
                                key={tier.label}
                                className="rounded-xl border border-(--color-border) bg-(--color-surface-2) p-5 text-center hover:border-(--color-primary)/40 hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <div className="flex justify-center mb-3">
                                    <tier.Icon className="size-7 text-(--color-primary) opacity-70" />
                                </div>
                                <p className="section-label mb-3">{tier.label}</p>
                                {tier.discount > 0 ? (
                                    <p className="font-family-mono text-2xl font-extrabold text-(--color-primary)">
                                        {t("paxTiers.off", { discount: tier.discount })}
                                    </p>
                                ) : (
                                    <p className="font-family-mono text-2xl font-extrabold text-(--color-text-primary)">
                                        {t("paxTiers.standard")}
                                    </p>
                                )}
                                <p className="mt-1.5 text-xs text-(--color-text-muted)">
                                    {tier.discount > 0
                                        ? t("paxTiers.save_per_person", { discount: tier.discount })
                                        : t("paxTiers.base_service_price")}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Pax Tier Sample Price Matrix */}
                    <div className="mt-6 rounded-xl border border-(--color-border) bg-(--color-surface-2) overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-(--color-border) bg-(--color-surface-1)">
                            <Info className="size-4 text-(--color-secondary)" />
                            <p className="text-xs font-semibold text-(--color-text-primary)">
                                {t("sampleCalcTitle")}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-100 text-sm" aria-label="Group pricing sample table" data-ai-id="pax-discount-table" data-ai-desc="Bảng giá mẫu ưu đãi khi đăng ký theo nhóm (Group / Pax Discount). Số lượng người càng lớn, giá dịch vụ trên một người càng giảm.">
                                <thead>
                                    <tr className="border-b border-(--color-border) bg-(--color-surface-1)">
                                        <th scope="col" className="px-5 py-3 text-left section-label">{t("tableGroupSize")}</th>
                                        <th scope="col" className="px-5 py-3 text-right section-label">{t("tablePricePerson")}</th>
                                        <th scope="col" className="px-5 py-3 text-right section-label">{t("tableTotal")}</th>
                                        <th scope="col" className="px-5 py-3 text-right section-label">{t("tableYouSave")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { groupKey: "1_person", count: 1, rate: 85 },
                                        { groupKey: "2_persons", count: 2, rate: Math.round(85 * (paxDiscountTiers.find((t: any) => t.key === "2_3_persons")?.multiplier || 0.93)) },
                                        { groupKey: "3_persons", count: 3, rate: Math.round(85 * (paxDiscountTiers.find((t: any) => t.key === "2_3_persons")?.multiplier || 0.93)) },
                                        { groupKey: "4_persons", count: 4, rate: Math.round(85 * (paxDiscountTiers.find((t: any) => t.key === "4_5_persons")?.multiplier || 0.88)) },
                                        { groupKey: "6_persons", count: 6, rate: Math.round(85 * (paxDiscountTiers.find((t: any) => t.key === "6_plus_persons")?.multiplier || 0.82)) },
                                    ].map((row) => {
                                        const saved = (85 - row.rate) * row.count;
                                        return (
                                            <tr
                                                key={row.groupKey}
                                                className="border-b border-(--color-border) last:border-0 hover:bg-(--color-primary-subtle) transition-all"
                                            >
                                                <td className="px-5 py-3.5 text-(--color-text-secondary)">{t(`sampleGroups.${row.groupKey}`)}</td>
                                                <td className="px-5 py-3.5 text-right font-family-mono font-medium text-(--color-text-primary)">
                                                    ${row.rate}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-family-mono font-bold text-(--color-text-primary)">
                                                    ${row.rate * row.count}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-family-mono font-semibold text-(--color-primary)">
                                                    {saved > 0 ? `$${saved}` : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ── Standard Pricing Tables ── */}
                <PricingTable id="evisa-pricing" title={t("eVisa")} rows={eVisaRows} t={t} target="pricing_evisa" />
                <PricingTable id="voa-pricing" title={t("voa")} rows={voaRows} t={t} target="pricing_voa" />

                {/* ── Extra Services ── */}
                <aside id="extra-services" className="rounded-xl border border-(--color-border) bg-(--color-surface-2) p-8" data-ai-target="extra_services_guide">
                    <p className="section-label mb-3">{t("addOnsLabel")}</p>
                    <h2 className="section-subtitle mb-4">{t("extraServicesTitle")}</h2>
                    <ul className="space-y-3 text-sm text-(--color-text-secondary)">
                        {extraServicesData.map((service: any) => (
                            <li key={service.id} className="flex items-start gap-2">
                                <span className="text-(--color-primary) font-bold mt-0.5">›</span>
                                <span>
                                    <strong className="text-(--color-text-primary)">{service.name[locale] || service.name.en}</strong>
                                    {service.desc[locale] || service.desc.en}
                                </span>
                            </li>
                        ))}
                        {extraServicesData.length === 0 && (
                            <>
                                <li className="flex items-start gap-2">
                                    <span className="text-(--color-primary) font-bold mt-0.5">›</span>
                                    <span>
                                        <strong className="text-(--color-text-primary)">{t("vipFastTrack")}</strong>
                                        {t("vipFastTrackDesc")}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-(--color-primary) font-bold mt-0.5">›</span>
                                    <span>
                                        <strong className="text-(--color-text-primary)">{t("carPickUp")}</strong>
                                        {t("carPickUpDesc")}
                                    </span>
                                </li>
                            </>
                        )}
                        <li className="flex items-start gap-2">
                            <span className="text-(--color-secondary) font-bold mt-0.5">›</span>
                            <Link
                                href="/guide/extra-services"
                                className="text-(--color-secondary) hover:text-(--color-text-link) underline-offset-4 hover:underline transition-all"
                            >
                                {t("viewAllExtraServices")}
                            </Link>
                        </li>
                    </ul>
                    <Button asChild className="mt-6">
                        <Link href="/apply">{t("applyNow")}</Link>
                    </Button>
                </aside>
            </div>
        </div>
    );
}

interface PricingTableProps {
    id?: string;
    title: string;
    rows: Array<{
        visaType: string;
        group: string;
        normal: number;
        urgent4d: number;
        urgent2d: number;
        urgent1d: number;
    }>;
    className?: string;
    t: any;
    target?: string;
}

/**
 * Component bảng hiển thị giá dịch vụ visa.
 * WHY: Tách biệt logic hiển thị bảng giá để tái sử dụng và quản lý code dễ dàng hơn.
 */
function PricingTable({
    id,
    title,
    rows,
    className,
    t,
    target,
}: PricingTableProps) {
    const headingId = `pricing-${title.replace(/\s/g, "-")}`;
    return (
        <section id={id} className={className} aria-labelledby={headingId} data-ai-target={target}>
            <p className="section-label mb-3">{t("feeSchedule")}</p>
            <h2 id={headingId} className="section-subtitle mb-6">
                {title}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-(--color-border)" data-ai-id={`pricing-table-${title.replace(/\s/g, "-")}`} data-ai-desc={`Bảng giá chi tiết cho dịch vụ ${title}, bao gồm giá thường và các mức giá làm khẩn cấp (Urgent).`}>
                <table className="w-full min-w-160 text-left text-sm">
                    <thead>
                        <tr className="border-b border-(--color-border) bg-(--color-surface-1)">
                            <th
                                scope="col"
                                className="px-5 py-3.5 section-label"
                            >
                                {t("tableVisaType")}
                            </th>
                            <th
                                scope="col"
                                className="px-5 py-3.5 section-label"
                            >
                                {t("tableNormal")}
                            </th>
                            <th
                                scope="col"
                                className="px-5 py-3.5 section-label"
                            >
                                {t("tableUrgent4D")}
                            </th>
                            <th
                                scope="col"
                                className="px-5 py-3.5 section-label"
                            >
                                {t("tableUrgent2D")}
                            </th>
                            <th
                                scope="col"
                                className="px-5 py-3.5 section-label"
                            >
                                {t("tableUrgent1D")}
                            </th>
                            <th
                                scope="col"
                                className="px-5 py-3.5 section-label"
                            >
                                {t("tableAction")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            return (
                                <tr
                                    key={`${row.group}-${row.visaType}`}
                                    className="border-b border-(--color-border) last:border-0 hover:bg-(--color-primary-subtle) transition-all"
                                >
                                    <td className="px-5 py-4 text-(--color-text-primary) font-medium">
                                        {row.group === "E-Visa" ? (
                                            <Globe2 className="size-3.5 text-(--color-secondary) inline mr-1.5 mb-0.5" />
                                        ) : (
                                            <Plane className="size-3.5 text-(--color-primary) inline mr-1.5 mb-0.5" />
                                        )}
                                        {row.visaType}
                                    </td>
                                    <td className="px-5 py-4 font-family-mono font-semibold text-(--color-primary)">
                                        ${row.normal}
                                    </td>
                                    <td className="px-5 py-4 font-family-mono font-semibold text-(--color-primary)">
                                        ${row.urgent4d}
                                    </td>
                                    <td className="px-5 py-4 font-family-mono font-semibold text-(--color-primary)">
                                        ${row.urgent2d}
                                    </td>
                                    <td className="px-5 py-4 font-family-mono font-semibold text-(--color-primary)">
                                        ${row.urgent1d}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Button asChild size="sm">
                                            <Link href="/apply">{t("applyNow")}</Link>
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
