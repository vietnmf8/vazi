"use client";

import { useServerInsertedHTML } from "next/navigation";

export function LangInitScript() {
    useServerInsertedHTML(() => {
        return (
            <script
                id="lang-initializer"
                suppressHydrationWarning={true}
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            try {
                                var m = document.cookie.match(/(?:^|;\\s*)NEXT_LOCALE=([^;]+)/);
                                var l = m && m[1];
                                if (l === 'vi' || l === 'ko') {
                                    document.documentElement.lang = l;
                                }
                            } catch (e) {}
                        })();
                    `
                }}
            />
        );
    });

    return null;
}
