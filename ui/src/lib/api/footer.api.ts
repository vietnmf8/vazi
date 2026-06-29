import { cacheLife, cacheTag } from "next/cache";
import { getGlobalSettings } from "@/lib/api/global-settings.api";

export interface SocialLink {
    platform: string;
    url: string;
    label: string;
}

export interface NavLink {
    href: string;
    translations: Record<string, string>;
}

export interface FooterSettings {
    hotline: string;
    hotlineTel: string;
    email: string;
    whatsappUrl: string;
    address: { district: string; city: string };
    socialLinks: SocialLink[];
    headerNav: NavLink[];
    footerQuickLinks: NavLink[];
    footerGuideLinks: NavLink[];
}

const FALLBACK: FooterSettings = {
    hotline: "+84.96.5800.392",
    hotlineTel: "+84-96-580-0392",
    email: "vazi@gmail.com",
    whatsappUrl: "https://wa.me/84965800392",
    address: { district: "Cau Giay District", city: "Hanoi, Vietnam" },
    socialLinks: [
        { platform: "facebook", url: "https://facebook.com", label: "Facebook" },
        { platform: "whatsapp", url: "https://wa.me/84965800392", label: "WhatsApp" },
    ],
    headerNav: [
        { href: "/guide", translations: { en: "Guide", vi: "Hướng dẫn", ko: "안내" } },
        { href: "/how-to-apply", translations: { en: "How to Apply", vi: "Cách đăng ký", ko: "신청 방법" } },
        { href: "/guide/vietnam-visa-fees", translations: { en: "Visa Fees", vi: "Phí Visa", ko: "비자 수수료" } },
        { href: "/faqs", translations: { en: "FAQs", vi: "Câu hỏi thường gặp", ko: "자주 묻는 질문" } },
        { href: "/about-us", translations: { en: "About Us", vi: "Về chúng tôi", ko: "회사 소개" } },
        { href: "/emergency-inquiry", translations: { en: "Emergency", vi: "Khẩn cấp", ko: "긴급 문의" } },
    ],
    footerQuickLinks: [
        { href: "/apply", translations: { en: "Apply Online", vi: "Đăng ký ngay", ko: "온라인 신청" } },
        { href: "/check-status", translations: { en: "Check Status", vi: "Kiểm tra trạng thái", ko: "상태 확인" } },
        { href: "/guide/vietnam-visa-fees", translations: { en: "Visa Fees", vi: "Phí Visa", ko: "비자 수수료" } },
    ],
    footerGuideLinks: [
        { href: "/how-to-apply", translations: { en: "How to Apply", vi: "Cách đăng ký", ko: "신청 방법" } },
        { href: "/faqs", translations: { en: "FAQs", vi: "Câu hỏi thường gặp", ko: "자주 묻는 질문" } },
        { href: "/guide", translations: { en: "Extra Services", vi: "Dịch vụ bổ sung", ko: "부가 서비스" } },
    ]
};

export async function getFooterSettings(): Promise<FooterSettings> {
    "use cache";
    cacheLife("hours");
    cacheTag("footer");

    const settings = await getGlobalSettings();

    return {
        hotline: (settings.SITE_HOTLINE as string) ?? FALLBACK.hotline,
        hotlineTel: (settings.SITE_HOTLINE_TEL as string) ?? FALLBACK.hotlineTel,
        email: (settings.SITE_EMAIL as string) ?? FALLBACK.email,
        whatsappUrl: (settings.SITE_WHATSAPP_URL as string) ?? FALLBACK.whatsappUrl,
        address: (settings.SITE_ADDRESS as { district: string; city: string }) ?? FALLBACK.address,
        socialLinks: (settings.SITE_SOCIAL_LINKS as SocialLink[]) ?? FALLBACK.socialLinks,
        headerNav: (settings.SITE_HEADER_NAV as NavLink[]) ?? FALLBACK.headerNav,
        footerQuickLinks: (settings.SITE_FOOTER_QUICK_LINKS as NavLink[]) ?? FALLBACK.footerQuickLinks,
        footerGuideLinks: (settings.SITE_FOOTER_GUIDE_LINKS as NavLink[]) ?? FALLBACK.footerGuideLinks,
    };
}
