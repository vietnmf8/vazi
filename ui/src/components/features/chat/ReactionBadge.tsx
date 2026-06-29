"use client";

import React from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReactionBadgeProps {
    /** Danh sách reaction: { userId: emoji } */
    reactions: Record<string, string>;
    /** Xác định vị trí pill: User → left-2, AI/Admin → right-2 */
    isUser: boolean;
    /**
     * Key tăng dần mỗi khi emoji thực sự thay đổi.
     * = 0 khi mount lần đầu với reaction đã có (scroll lên cũ) → không animate.
     * > 0 khi user vừa thả reaction mới → animate popAndLand.
     */
    animationKey: number;
    /** Callback khi người dùng click vào badge để toggle/xoá reaction */
    onToggle: () => void;
}

/**
 * Chỉ hiển thị reaction pill (nền + emoji).
 * Component này phải được render bên trong một container có position:relative.
 *
 * Kỹ thuật animation:
 * - Pill: opacity instant (không transition) theo prototype
 * - Emoji: Framer Motion keyframes popAndLand 1.2s — bay vọt lên rồi hạ cánh
 *   + key={`${emoji}-${animationKey}`} → remount khi emoji/animationKey thay đổi
 *   + initial=false khi animationKey=0 → không animate khi scroll lên tin nhắn cũ
 */
export function ReactionBadge({ reactions, isUser, animationKey, onToggle }: ReactionBadgeProps) {
    // Lấy danh sách emoji unique (loại trùng lặp từ nhiều người react cùng emoji)
    const uniqueEmojis = Array.from(new Set(Object.values(reactions)));
    const primaryEmoji = uniqueEmojis[0] ?? null;
    const reactionCount = Object.keys(reactions).length;

    if (!primaryEmoji) return null;

    // shouldAnimate = true khi đây là reaction mới (không phải scroll lên cũ)
    const shouldAnimate = animationKey > 0;

    return (
        /*
         * PILL — HIỆN RA TỨC THÌ (INSTANT)
         * position: absolute neo vào bottom: 0 của wrapper-cha (có relative + flex-col),
         * translateY(50%) → pill nằm nửa trên wrapper, nửa dưới = đúng vị trí Messenger.
         * TẠI SAO inline opacity thay vì Tailwind opacity-xxx:
         * Đảm bảo tuyệt đối không có transition-opacity nào can thiệp.
         */
        <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onToggle();
                }
            }}
            aria-label={`Reactions: ${uniqueEmojis.join(" ")}${reactionCount > 1 ? ` (${reactionCount})` : ""}. Click to toggle.`}
            className={cn(
                // bottom-[16px] = ngang bằng chiều cao spacer tính từ đáy wrapper.
                // translate-y-1/2 dịch xuống thêm nửa chiều cao pill → pill overlap đáy bubble.
                "absolute bottom-[16px] translate-y-1/2 z-20",
                // Căn lề theo sender — khớp với logic cũ
                isUser ? "left-2" : "right-2",
                // Kiểu dáng pill
                "flex items-center gap-0.5 rounded-full",
                "bg-white dark:bg-zinc-800",
                "border border-zinc-200 dark:border-zinc-700",
                "px-1.5 py-1.5 shadow-sm shadow-black/5",
                // Chỉ transition scale cho hover — KHÔNG transition opacity
                " hover:scale-110 active:scale-95 transition-transform duration-150",
            )}
        >
            {/*
             * EMOJI — ANIMATION popAndLand 1.2s (GIAI ĐOẠN 3)
             *
             * key={`${primaryEmoji}-${animationKey}`}:
             * → Remount khi emoji THAY ĐỔI hoặc animationKey tăng (reaction mới)
             * → Animation chạy lại từ đầu một cách tự nhiên
             *
             * initial=false khi animationKey=0:
             * → Không đặt initial state → element render ngay ở trạng thái cuối (opacity:1, y:0)
             * → Áp dụng cho trường hợp scroll lên tin nhắn cũ đã có reaction
             *
             * animate với keyframes [0% → 40% → 100%]:
             * → 0%: nhỏ (scale:0.5), ở dưới (y:20px), trong suốt (opacity:0)
             * → 40%: to cực đại (scale:1.8), bay vọt lên (y:-25px), hiện ra (opacity:1)
             * → 100%: kích thước thực (scale:1), hạ cánh (y:0), giữ opacity
             *
             * times: [0, 0.4, 1] → khớp chính xác với @keyframes popAndLand của prototype
             * ease: cubic-bezier(0.25,1,0.5,1) → ease-out, không nảy (non-bouncy)
             */}
            <m.span
                key={`${primaryEmoji}-${animationKey}`}
                initial={
                    shouldAnimate
                        ? { opacity: 0, scale: 0.5, y: 20 }
                        : false
                }
                animate={
                    shouldAnimate
                        ? {
                              opacity: [0, 1, 1],
                              scale: [0.5, 1.8, 1],
                              y: [20, -25, 0],
                          }
                        : { opacity: 1, scale: 1, y: 0 }
                }
                transition={
                    shouldAnimate
                        ? {
                              duration: 1.2,
                              // times khớp chính xác với 0% → 40% → 100% của prototype
                              times: [0, 0.4, 1],
                              ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
                          }
                        : { duration: 0 }
                }
                className="leading-none select-none text-[14px] inline-block"
                aria-hidden="true"
            >
                {primaryEmoji}
            </m.span>

            {/* Emoji bổ sung nếu nhiều người react với emoji khác nhau */}
            {uniqueEmojis.slice(1).map((emoji, idx) => (
                <span
                    key={idx}
                    className="leading-none select-none text-[14px]"
                    aria-hidden="true"
                >
                    {emoji}
                </span>
            ))}

            {/* Số người react (chỉ hiện khi > 1) */}
            {reactionCount > 1 && (
                <span className="ml-0.5 font-semibold text-zinc-600 dark:text-zinc-400 select-none text-xs">
                    {reactionCount}
                </span>
            )}
        </div>
    );
}
