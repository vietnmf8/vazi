"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useInView } from "@/hooks/useInView";
import { useMeasureHeight } from "@/hooks/useMeasureHeight";

interface VirtualizedChatMessageProps {
    id: string;
    children: React.ReactNode;
    disableVirtualization?: boolean;
}

/**
 * Ảo hóa tin nhắn chat: Khi tin nhắn ra khỏi khung nhìn (và vùng đệm), 
 * unmount nội dung bên trong để giải phóng số lượng DOM Node, 
 * giữ lại một khung trống với chiều cao được lấy từ bộ nhớ đệm.
 */
export const VirtualizedChatMessage = ({ id, children, disableVirtualization }: VirtualizedChatMessageProps) => {
    // Vùng đệm 1000px: Tin nhắn nằm trong bán kính 1000px sẽ được render để đảm bảo cuộn mượt mà
    const [containerRef, inView] = useInView("1000px");

    // Hook đo và lưu trữ chiều cao thực tế
    const [measureRef, cachedHeight] = useMeasureHeight(id);

    // Trạng thái nội bộ quyết định việc render nội dung
    // Mặc định là true để đảm bảo tin nhắn hiển thị ngay lập tức không bị nhấp nháy
    const [shouldRender, setShouldRender] = useState(true);
    
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* Logic Anti-Flicker & Đóng băng trạng thái */
    useEffect(() => {
        if (inView) {
            // Show immediately — cancel any pending hide
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
            hideTimerRef.current = setTimeout(() => {
                setShouldRender(true);
                hideTimerRef.current = null;
            }, 0);
        } else {
            // Delay hide — gives IntersectionObserver time to settle, prevents flicker
            hideTimerRef.current = setTimeout(() => {
                setShouldRender(false);
                hideTimerRef.current = null;
            }, 150);
        }
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };
    }, [inView]);

    // Trạng thái ảo hóa: Khi tin nhắn ở xa (không render), đã biết chiều cao để giữ chỗ, và KHÔNG bị disable (ví dụ khi đang search)
    const isVirtualized = !shouldRender && cachedHeight > 0 && !disableVirtualization;

    // Tính toán style để giữ nguyên Layout (tránh nhảy trang khi cuộn)
    const style = useMemo(
        () => ({
            minHeight: isVirtualized ? `${cachedHeight}px` : undefined,
        }),
        [isVirtualized, cachedHeight]
    );

    return (
        <div
            ref={containerRef}
            style={style}
            className="w-full shrink-0"
            data-virtualized={isVirtualized}
        >
            {/* Nếu không ảo hóa thì render nội dung thực và đo chiều cao */}
            {!isVirtualized ? (
                <div ref={measureRef} className="w-full">
                    {children}
                </div>
            ) : null}
        </div>
    );
};
