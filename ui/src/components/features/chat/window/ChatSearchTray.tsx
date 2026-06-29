"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ChatSearchTrayProps {
    show: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    totalMatches: number;
    currentMatchIndex: number; // 0-indexed
    onNext: (smooth: boolean) => void;
    onPrev: (smooth: boolean) => void;
    onClose: () => void;
}

export function ChatSearchTray({
    show,
    searchQuery,
    setSearchQuery,
    totalMatches,
    currentMatchIndex,
    onNext,
    onPrev,
    onClose,
}: ChatSearchTrayProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("ChatSearch");

    // Auto focus when showing
    useEffect(() => {
        if (show && inputRef.current) {
            inputRef.current.focus();
        }
    }, [show]);

    // Bắt sự kiện keydown toàn cục để Mở tray hoặc đóng (như prototype)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                // Sẽ được handle ở ChatWindow, ở đây chỉ prevent default nếu đang focus vào input
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Xử lý phím Enter trong ô input
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
                onPrev(!e.repeat); // mượt nếu ấn 1 lần, auto nếu giữ phím Enter
            } else {
                onNext(!e.repeat);
            }
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    // Long press logic theo prototype
    const useLongPress = (callback: (smooth: boolean) => void) => {
        const timerRef = useRef<NodeJS.Timeout | null>(null);
        const intervalRef = useRef<NodeJS.Timeout | null>(null);
        const isHoldingRef = useRef(false);

        const start = (e: React.MouseEvent | React.TouchEvent) => {
            // e.preventDefault(); // Xảy ra vấn đề chặn event ở React, chỉ prevent nếu cần
            if (e.cancelable) e.preventDefault();

            // Click ban đầu là cuộn mượt
            callback(true);

            timerRef.current = setTimeout(() => {
                isHoldingRef.current = true;
                intervalRef.current = setInterval(() => {
                    // Giữ lâu thì cuộn nhanh (auto)
                    callback(false);
                }, 80);
            }, 400);
        };

        const stop = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);

            // Chốt vị trí cuối cùng bằng smooth
            if (isHoldingRef.current) {
                isHoldingRef.current = false;
                callback(true);
            }
        };

        // Đảm bảo dọn dẹp timer nếu component unmount trong lúc đang giữ chuột
        useEffect(() => {
            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }, []);

        return {
            onMouseDown: start,
            onMouseUp: stop,
            onMouseLeave: stop,
            onTouchStart: start,
            onTouchEnd: stop,
            onTouchCancel: stop,
        };
    };

    const nextPressProps = useLongPress(onNext);
    const prevPressProps = useLongPress(onPrev);

    const hasMatches = totalMatches > 0;
    const hasQuery = searchQuery.trim().length > 0;
    
    // Status color
    const counterClass = !hasQuery ? "text-slate-500" : hasMatches ? "text-slate-500" : "text-red-500 font-medium";

    return (
        <AnimatePresence>
            {show && (
                <m.div
                    initial={{ y: -80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute mx-[13px] rounded-b-md top-[66px] left-0 right-0 z-[15] bg-[var(--color-surface-base)] dark:bg-[#2c2c30] border-b border-x border-zinc-200 dark:border-zinc-800 px-3 pt-3.5 py-2.5 flex items-center gap-2 shadow-sm"
                >
                    <div className="flex-1 relative flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder={t("placeholder")}
                            autoComplete="off"
                            className="w-full h-[36px] px-4 pr-12 rounded-full bg-transparent text-sm focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 transition-all"
                        />
                        <span className={cn("absolute right-4 text-xs select-none pointer-events-none transition-all", counterClass)}>
                            {hasQuery && hasMatches ? `${currentMatchIndex + 1}/${totalMatches}` : !hasQuery ? "" : "0/0"}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={!hasMatches}
                            className="flex items-center justify-center size-[30px] rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-300 select-none active:scale-95 transition-all"
                            title={t("up")}
                            {...prevPressProps}
                        >
                            <ChevronUp className="size-4" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            disabled={!hasMatches}
                            className="flex items-center justify-center size-[30px] rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-300 select-none active:scale-95 transition-all"
                            title={t("down")}
                            {...nextPressProps}
                        >
                            <ChevronDown className="size-4" strokeWidth={2.5} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center justify-center size-[30px] rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-all ml-1"
                        title={t("close")}
                    >
                        <X className="size-5" />
                    </button>
                </m.div>
            )}
        </AnimatePresence>
    );
}
