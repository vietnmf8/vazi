import { Suspense } from "react";
import {
    CTASection,
    FAQPreview,
    HowItWorks,
    PricingPreview,
    TrustSignals,
    CommentSection,
    ReadyToApplyCTA,
    BlogPreviewSection,
} from "@/components/sections";
import { FloatingTOC } from "@/components/features/FloatingTOC";
import NationalitiesSection from "./NationalitiesSection";
import HeroSectionServer from "./HeroSectionServer";
import EmergencyBannerServer from "./EmergencyBannerServer";
import { SplashHold } from "@/components/common/SplashHold";
import { ReelList } from "@/components/features/reels/ReelList";
import { fetchReels } from "@/lib/api/reels.api";

/**
 * Homepage — Stage 6 static sections, mock data only.
 * Stage 7 sẽ thay mock bằng API fetch tại từng section nếu cần.
 */
export default async function HomePage() {
    const reels = await fetchReels();
    return (
        <>
            <div className="hidden md:block">
                <FloatingTOC />
            </div>

            {/* HeroSection là bộ mặt của trang chủ, tuyệt đối không dùng Suspense trả về 0 height 
                để tránh Layout Shift đẩy ReelList lên đầu trang khi Stinger mở ra */}
            <HeroSectionServer />
            
            <ReelList reels={reels} />
            
            <div className="cinematic-content">
                <Suspense fallback={<SplashHold />}>
                    <EmergencyBannerServer />
                </Suspense>
                
                <Suspense fallback={<SplashHold />}>
                    <NationalitiesSection />
                </Suspense>
                
                <Suspense fallback={<SplashHold />}>
                    {/* HowItWorks tự fetch data bên trong để Suspense có thể re-stream khi cache invalidate */}
                    <HowItWorks />
                </Suspense>
                
                <Suspense fallback={<SplashHold />}>
                    <PricingPreview />
                </Suspense>
                
                <Suspense fallback={<SplashHold />}>
                    <TrustSignals />
                </Suspense>
                
                <FAQPreview />
                <CommentSection />
                <BlogPreviewSection />
                <ReadyToApplyCTA />
                <CTASection />
            </div>
        </>
    );
}
