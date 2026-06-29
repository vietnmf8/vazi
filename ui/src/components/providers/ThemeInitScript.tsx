"use client";

import { useServerInsertedHTML } from "next/navigation";

export function ThemeInitScript() {
    useServerInsertedHTML(() => {
        return (
            <script
                id="theme-initializer"
                suppressHydrationWarning={true}
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            try {
                                var savedTheme = localStorage.getItem('theme');
                                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                var theme = savedTheme || (prefersDark ? 'dark' : 'light');
                                if (theme === 'dark') {
                                    document.documentElement.classList.add('dark');
                                } else {
                                    document.documentElement.classList.remove('dark');
                                }
                                // TẠI SAO khóa cuộn trang ngay tại đây (trong <head>, trước body)?
                                // - Script này chạy ĐỒNG BỘ trước khi browser render bất kỳ pixel nào của body.
                                // - Nếu chờ AppLoadingContainer SSR (body) mới set overflow:hidden →
                                //   browser kịp vẽ scrollbar 1 frame → flicker.
                                // - Class no-scroll + critical CSS (layout.tsx) khóa cuộn tại T0.
                                // - SplashScreen.tsx cleanup sẽ xóa class này khi splash kết thúc.
                                document.documentElement.classList.add('no-scroll');
                            } catch (e) {}
                        })();
                    `
                }}
            />
        );
    });

    return null;
}
