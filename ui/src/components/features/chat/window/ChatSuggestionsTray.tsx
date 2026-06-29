import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const FastVisaLogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 93 93" {...props}>
        <defs>
            <linearGradient id="fv-logo-grad1" x1="7.04" y1="-28.57" x2="88.48" y2="-31.42" gradientTransform="translate(0 94) scale(1 -1)" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="currentColor"/>
                <stop offset=".25" stopColor="currentColor"/>
                <stop offset=".68" stopColor="currentColor"/>
                <stop offset=".86" stopColor="currentColor"/>
            </linearGradient>
            <linearGradient id="fv-logo-grad2" x1="9.62" y1="48.93" x2="91.07" y2="51.77" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#efbc1b"/>
                <stop offset=".25" stopColor="#eeb21a"/>
                <stop offset=".68" stopColor="#ed9918"/>
                <stop offset=".86" stopColor="#ed8c18"/>
            </linearGradient>
            <linearGradient id="fv-logo-grad3" x1=".8" y1="23.31" x2="53.19" y2="25.14" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#efbc1b"/>
                <stop offset=".29" stopColor="#eeb21a"/>
                <stop offset=".78" stopColor="#ed9918"/>
                <stop offset=".99" stopColor="#ed8c18"/>
            </linearGradient>
        </defs>
        <path fill="url(#fv-logo-grad1)" d="M181.08,175.17h-.03c-13.77-.09-24.36-4.67-31.48-13.6-6.33-7.95-9.6-19.01-9.71-32.87v-.07c.11-13.86,3.37-24.92,9.71-32.87,7.11-8.93,17.7-13.51,31.48-13.6h.05c10.56.07,19.39,2.81,26.26,8.13,6.45,5,10.99,12.13,13.5,21.19l-7.85,2.2c-4.25-15.34-14.99-23.19-31.94-23.31-11.19.08-19.65,3.62-25.15,10.53-5.15,6.47-7.82,15.81-7.91,27.76.1,11.96,2.76,21.3,7.91,27.76,5.5,6.91,13.96,10.45,25.15,10.53,10.09-.07,16.76-2.44,22.32-7.92,6.34-6.25,6.22-13.92,4.19-18.59-1.19-2.75-3.36-5.04-6.28-6.78-.73,5.23-2.39,9.48-4.94,12.68-3.4,4.27-8.23,6.6-14.34,6.94-4.62.25-9.08-.85-12.54-3.1-4.09-2.67-6.48-6.75-6.74-11.49-.25-4.61,1.57-8.85,5.11-11.94,3.39-2.95,8.15-4.68,13.78-5,4.15-.23,8.03-.05,11.62.55-.48-2.88-1.44-5.16-2.88-6.81-1.97-2.27-5.03-3.43-9.08-3.45h-.11c-3.25,0-7.66.9-10.47,5.11l-6.76-4.58c3.76-5.64,9.88-8.74,17.23-8.74h.17c12.29.08,19.61,7.65,20.34,20.88.42.18.83.36,1.23.55,5.74,2.72,9.93,6.83,12.13,11.89,3.07,7.06,3.35,18.56-5.96,27.74-7.11,7.01-15.74,10.18-27.98,10.26h-.03v.02ZM184.93,129.87c-.93,0-1.88.03-2.84.08-7.06.4-11.47,3.66-11.22,8.3.26,4.86,5.59,7.12,10.71,6.85,4.71-.25,10.84-2.1,11.87-14.38-2.6-.56-5.46-.85-8.52-.85Z"/>
        <g>
            <path fill="url(#fv-logo-grad2)" d="M82.41,26.03c-.97,0-1.86.53-2.33,1.38l-16.82,30.21-8.03-17.63c-1.41-3.1-4.51-5.1-7.92-5.1H10.11c4.05,7.04,7.69,10.14,10.99,10.03h24.79l15.98,31.14c.32.63,1.21.65,1.56.03l28.55-50.05c0-.07-6.49-.03-9.56-.01Z"/>
            <path fill="url(#fv-logo-grad3)" d="M38.22,26.42c1.08.02,2.21,1.54,3.38,4.51h5.09c2.08-.04,4.15.7,6.22,2.48l-5.73-12.87c-1.11-2.49-3.58-4.1-6.31-4.1H1.04c3.47,6.37,7.18,10.02,11.22,9.99h25.95Z"/>
        </g>
    </svg>
)

interface ChatSuggestionsTrayProps {
    isVisible: boolean;
    showSuggestions: boolean;
    hasNewSuggestionsDot: boolean;
    activeSuggestions: string[];
    chatInputHeight: number;
    onToggleShow: () => void;
    onDismiss: () => void;
    onSend: (text: string) => Promise<void>;
}

export function ChatSuggestionsTray({
    isVisible,
    showSuggestions,
    hasNewSuggestionsDot,
    activeSuggestions,
    chatInputHeight,
    onToggleShow,
    onDismiss,
    onSend,
}: ChatSuggestionsTrayProps) {
    const t = useTranslations("Chat");

    return (
        <AnimatePresence initial={false}>
            {isVisible && (
                <m.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 1, y: "100%" }}
                    transition={{
                        duration: 0.25,
                        ease: [0.25, 1, 0.5, 1],
                    }}
                    className="absolute px-[13px] left-0 right-0 overflow-hidden z-20"
                    style={{
                        bottom: "calc(var(--chat-input-height) - 1px)",
                        willChange: "transform, opacity",
                    }}
                >
                    <div className="w-full flex flex-col rounded-t-md bg-[#f5f1e7] dark:bg-[#2C2C30] text-zinc-800 dark:text-zinc-100">
                        <div
                            onClick={onToggleShow}
                            className="flex h-9.5 items-center rounded-t-md justify-between px-4 select-none transition-all hover:bg-zinc-200/20 dark:hover:bg-zinc-850/10"
                        >
                            <div className="flex items-center gap-2">
                                <FastVisaLogoIcon className="size-4 shrink-0 select-none text-[#18181b] dark:text-white" />
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                    {t("tray_suggestions")}
                                </span>
                                {!showSuggestions && hasNewSuggestionsDot && (
                                    <span className="relative flex size-2 ml-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full size-2 bg-blue-500"></span>
                                    </span>
                                )}
                            </div>

                            <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={onToggleShow}
                                    className="rounded-full p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-white transition-all "
                                    aria-label={showSuggestions ? t("tray_collapse") : t("tray_expand")}
                                    title={showSuggestions ? t("tray_collapse") : t("tray_expand")}
                                >
                                    <ChevronDown
                                        className={cn(
                                            "size-4 transition-transform duration-300 ease-in-out",
                                            showSuggestions ? "rotate-0" : "rotate-180",
                                        )}
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={onDismiss}
                                    className="rounded-full p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-white transition-all "
                                    aria-label={t("tray_close")}
                                    title={t("tray_close")}
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        <m.div
                            initial={false}
                            animate={{
                                height: showSuggestions ? "auto" : 0,
                                opacity: showSuggestions ? 1 : 0,
                            }}
                            transition={{
                                duration: 0.3,
                                ease: [0.25, 1, 0.5, 1],
                            }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 py-3 bg-[#f5f1e7] dark:bg-[#2C2C30]">
                                <div className="flex flex-wrap gap-2 overflow-y-auto select-no-scrollbar">
                                    {activeSuggestions.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => void onSend(s)}
                                            className="rounded-full bg-white dark:bg-zinc-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-500/10 dark:hover:bg-[#181717] px-3.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition-all active:scale-95 duration-150 dark:border-zinc-700"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </m.div>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
