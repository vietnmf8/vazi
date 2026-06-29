import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { AboutHero } from "./_components/AboutHero";
import { SceneSlider } from "./_components/SceneSlider";
import { AboutQuote } from "./_components/AboutQuote";
import { AboutMission } from "./_components/AboutMission";
import { AboutStats } from "./_components/AboutStats";
import { AboutFeatures } from "./_components/AboutFeatures";
import { AboutTeam } from "./_components/AboutTeam";
import { getTeamMembers } from "@/lib/api/team.api";
import { getAboutUsSettings } from "@/lib/api/about-us.api";
import { FloatingTOC } from "@/components/features/FloatingTOC";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getAboutUsSettings();
    const locale = await getLocale();
    const tMetadata = settings?.metadata?.[locale] || {
        title: "About Us",
        description: "FastVisa — trusted Vietnam visa service"
    };
    return {
        title: tMetadata.title,
        description: tMetadata.description,
    };
}

/**
 * Trang giới thiệu công ty (About Us).
 */
export default async function AboutUsPage() {
    const locale = await getLocale();
    const rawTeamMembers = await getTeamMembers().catch(() => []);
    const teamMembers = Array.isArray(rawTeamMembers) ? rawTeamMembers : [];
    const settings = await getAboutUsSettings();

    if (!settings) {
        return null;
    }

    const tHero = settings.hero?.[locale] || settings.hero?.en;
    const tQuote = settings.quote?.[locale] || settings.quote?.en;
    const tMission = settings.mission?.[locale] || settings.mission?.en;
    const tSlider = settings.sceneSlider?.[locale] || settings.sceneSlider?.en;
    const tFeatures = settings.features?.[locale] || settings.features?.en;
    const tTeam = settings.team?.[locale] || settings.team?.en;
    
    // Process team members for the current locale
    const localizedTeamMembers = teamMembers.map((m: any) => {
        let localizedRole = m.role;
        let localizedDesc = m.description;
        try {
            const roleObj = JSON.parse(m.role);
            localizedRole = roleObj[locale] || roleObj.en || m.role;
        } catch(e) {}
        try {
            const descObj = JSON.parse(m.description);
            localizedDesc = descObj[locale] || descObj.en || m.description;
        } catch(e) {}
        
        return {
            ...m,
            role: localizedRole,
            description: localizedDesc
        };
    });
    
    // Process destinations for the current locale
    const localizedDestinations = settings.destinations?.map((d: any) => ({
        id: d.id,
        key: d.key,
        img: d.img,
        title: d.translations?.[locale]?.title || d.translations?.en?.title,
        location: d.translations?.[locale]?.location || d.translations?.en?.location,
        desc: d.translations?.[locale]?.desc || d.translations?.en?.desc
    }));

    const tocSections = [
        { id: "hero", label: tHero?.heading || "About FastVisa" },
        { id: "quote", label: tQuote?.authorName ? `About ${tQuote.authorName}` : "Our Story" },
        { id: "mission", label: tMission?.heading || "Our Mission" },
        { id: "destinations", label: tSlider?.heading || "Destinations" },
        { id: "features", label: tFeatures?.heading || "Why Choose Us" },
        { id: "team", label: tTeam?.heading || "Our Team" },
    ];

    return (
        <div className="min-h-screen overflow-x-clip">
            <FloatingTOC sections={tocSections} />
            {/* ── Anh Hùng Khai Cuộc (Hero Section) ── */}
            <div id="hero">
                <AboutHero data={tHero} />
            </div>

            {/* Thiết lập giới hạn chiều rộng max-w-7xl (max-w-275) và padding đồng nhất để căn chỉnh hoàn hảo */}
            <div className="max-w-275 mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-16 pb-0 space-y-24">
                {/* ── Báo chí nhận xét (Editorial Split Screen) ── */}
                <div id="quote">
                    <AboutQuote data={tQuote} />
                </div>

                {/* ── Sứ mệnh dịch vụ (Asymmetric Bento Grid) ── */}
                <div id="mission">
                    <AboutMission data={tMission} images={settings.missionImages} />
                </div>

                {/* ── Trải nghiệm trượt thẻ cảnh đẹp Việt Nam (Bảo toàn nguyên bản) ── */}
                <section id="destinations" aria-labelledby="scenes-heading">
                    <div className="text-center mb-12">
                        <h2 id="scenes-heading" className="section-title">
                            {tSlider?.heading}
                        </h2>
                        <p className="mt-3 text-base text-(--color-text-secondary)">
                            {tSlider?.subheading}
                        </p>
                    </div>
                    <div className="mx-auto w-full">
                        <SceneSlider destinations={localizedDestinations} />
                    </div>
                </section>

                {/* ── Các điểm ưu việt của dịch vụ (Feature Cards Bento 2.0) ── */}
                <div id="features">
                    <AboutFeatures data={tFeatures} featureIcons={settings.whyUs} />
                </div>

                {/* ── Đội ngũ nòng cốt (Magnetic Hover Portraits Grid & Contact CTA) ── */}
                <div id="team">
                    <AboutTeam data={tTeam} teamMembers={localizedTeamMembers} />
                </div>
            </div>
        </div>
    );
}
