import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
    Cormorant_Garamond,
    Plus_Jakarta_Sans,
    DM_Sans,
    JetBrains_Mono,
    Inter,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    style: ["normal", "italic"],
    variable: "--font-cormorant",
    display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-jakarta",
    display: "swap",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm-sans",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains",
    display: "swap",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Metadata");
    return {
        title: {
            template: `%s | ${t("site_name")}`,
            default: t("default_title"),
        },
        description: t("description"),
        metadataBase: new URL(
            process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        ),
    };
}

import { Header } from "@/components/layout";
import ScrollRevealProvider from "@/components/layout/ScrollRevealProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import AppLoadingContainer from "@/components/providers/AppLoadingContainer";
import { EntryGateProvider } from "@/components/features/entry-gate/EntryGateContext"
import { StingerProvider } from "@/components/stinger";
import { ThemeInitScript } from "@/components/providers/ThemeInitScript";
import { ChatWidget } from "@/components/features/chat";
import { AIGlobalIndicator } from "@/components/features/chat/AIGlobalIndicator";
import { VirtualMouseEngine } from "@/components/features/virtual-cursor/VirtualMouseEngine";
import { ScrollPageEngine } from "@/components/features/virtual-cursor/ScrollPageEngine";
import { SystemEventsProvider } from "@/components/providers/SystemEventsProvider";

import { I18nProvider } from '@/components/providers/I18nProvider';
import { LangInitScript } from "@/components/providers/LangInitScript";
import { getFooterSettings } from "@/lib/api/footer.api";
import { AiContextTrackerProvider } from "@/components/providers/AiContextTrackerProvider";

async function LayoutContent({ children }: { children: React.ReactNode }) {
    const contact = await getFooterSettings();

    return (
        <EntryGateProvider whatsappUrl={contact.whatsappUrl}>
            <Suspense fallback={<div className="h-15 md:h-18" />}>
                <Header
                    whatsappUrl={contact.whatsappUrl}
                    email={contact.email}
                    hotline={contact.hotline}
                    headerNav={contact.headerNav}
                />
            </Suspense>
            {children}
            <AIGlobalIndicator />
            <VirtualMouseEngine />
            <ScrollPageEngine />
            <ChatWidget whatsappUrl={contact.whatsappUrl} />
            <AiContextTrackerProvider />
        </EntryGateProvider>
    );
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${cormorant.variable} ${jakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${inter.variable}`}
        >
            <head>
                <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="shortcut icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/site.webmanifest" />
                <link
                    rel="preload"
                    as="image"
                    href="/vn.jpg"
                    fetchPriority="high"
                />
                {/* 
                  TẠI SAO dùng ThemeInitScript (useServerInsertedHTML) thay vì thẻ <script> nguyên thủy?
                  1. Thẻ <script> nguyên thủy sẽ bị React 19/Next 15 quăng lỗi "Encountered a script tag..." khi client navigate.
                  2. Thẻ <Script strategy="beforeInteractive"> của Next.js lại bị load chậm một nhịp, gây chớp Light Mode (FOUC) khi F5.
                  3. ThemeInitScript sử dụng useServerInsertedHTML đẩy mã JS thẳng vào SSR head hoàn toàn đồng bộ, vừa không chớp màn hình vừa không bị lỗi Console.
                */}
                <ThemeInitScript />
                <LangInitScript />
                {/*
                  TẠI SAO cần critical inline CSS ở đây?
                  CSS file của Tailwind được tải bất đồng bộ. Có một khoảng T0 nhỏ trước khi
                  stylesheet parse xong, lúc đó var(--background) chưa được resolve, khiến
                  SplashScreen background render thành transparent (hở nền). 
                  Giải pháp: inject hardcode màu splash ngay vào <head> để trình duyệt paint
                  màu nền ngay lập tức tại first byte, không chờ CSS.
                */}
                <style dangerouslySetInnerHTML={{ __html: `
                    /* Critical CSS: paint nền đúng màu ngay tại T0, trước khi Tailwind CSS parse xong.
                       Định nghĩa các biến CSS để SSR placeholder khớp 100% với giao diện Tailwind.
                       ThemeInitScript đã set class .dark trên <html> trước khi CSS này parse → selector đúng. */
                    :root { 
                        --color-bg: #faf8f5; 
                        --splash-mesh-opacity: 0.3;
                        --splash-progress-bg: rgba(231, 229, 228, 0.5); /* stone-200/50 */
                        --splash-logo-glow: rgba(245, 158, 11, 0.1);
                    }
                    html.dark { 
                        --color-bg: #0c0b0a; 
                        --splash-mesh-opacity: 0.5;
                        --splash-progress-bg: rgba(28, 25, 23, 0.5); /* stone-800/50 */
                        --splash-logo-glow: rgba(245, 158, 11, 0.15);
                    }
                    html, body { background-color: var(--color-bg); }
                    /* Khóa cuộn trang tại T0 — class no-scroll được gắn đồng bộ bởi ThemeInitScript trong <head>.
                       Script đó chạy TRƯỚC KHI body render → rule này áp dụng trước bất kỳ pixel nào được vẽ.
                       SplashScreen.tsx cleanup (useEffect return) sẽ xóa class no-scroll khi splash kết thúc. */
                    html.no-scroll { overflow-y: scroll !important; overflow-x: hidden !important; height: 100% !important; }
                    html.no-scroll::-webkit-scrollbar-thumb { background-color: transparent !important; }
                    html.no-scroll body { overflow: hidden !important; height: 100% !important; }
                `}} />
            </head>
            <body
                suppressHydrationWarning
                className="flex min-h-svh flex-col antialiased"
            >
                {/* 
                  Cấu trúc phân lớp Providers — 2 root cause riêng biệt:
                  
                  ROOT CAUSE 1 (T0 splash không hiện): AppLoadingContainer nằm trong Suspense → 
                  với PPR, nội dung Suspense là "dynamic", chỉ stream sau ~970ms → splash không có 
                  trong static shell. Fix: AppLoadingContainer ra NGOÀI Suspense.
                  
                  ROOT CAUSE 2 (animation m.div không chạy): m.div cần LazyMotion context từ 
                  MotionProvider, nhưng MotionProvider vẫn trong Suspense → SplashScreen thiếu 
                  context → progress bar không chạy, exit animation không có.
                  Fix: MotionProvider cũng ra NGOÀI Suspense, bao bọc AppLoadingContainer.
                  
                  MotionProvider chỉ là wrapper LazyMotion đơn giản, không có async work,
                  nên việc đặt ngoài Suspense không ảnh hưởng đến PPR hay hiệu năng.
                */}
                <MotionProvider>
                    <AppLoadingContainer>
                        <Suspense fallback={<div className="h-full w-full min-h-screen" />}>
                            <I18nProvider>
                                <SystemEventsProvider />
                                <StingerProvider>
                                    <ScrollRevealProvider>
                                        <Suspense fallback={<div className="h-full w-full min-h-screen" />}>
                                            <LayoutContent>{children}</LayoutContent>
                                        </Suspense>
                                    </ScrollRevealProvider>
                                </StingerProvider>
                            </I18nProvider>
                        </Suspense>
                    </AppLoadingContainer>
                </MotionProvider>
            </body>
        </html>
    );
}
