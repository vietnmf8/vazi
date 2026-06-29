"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { m } from "framer-motion";
import { SharedReaction } from "@/components/shared/reaction/SharedReaction";

interface ReactionPopoverProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    align?: "center" | "right" | "left";
}

export function ReactionPopover({ onSelect, onClose, triggerRef, align = "center" }: ReactionPopoverProps) {
    const [coords, setCoords] = useState<{ top: number; left: number; right: number; width: number; align: "left" | "right" | "center" } | null>(null);

    // Tính toán toạ độ khi render
    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let computedAlign = align;
            
            // Tìm cửa sổ chat gốc để chia khu vực (lấy thẻ bao ngoài có role dialog hoặc fallback về window)
            const chatWindow = triggerRef.current.closest('[role="dialog"]') || document.body;
            const cwRect = chatWindow.getBoundingClientRect();
            
            const triggerCenter = rect.left + rect.width / 2;
            const relativeX = triggerCenter - cwRect.left;
            const ratio = relativeX / cwRect.width;
            
            if (ratio < 0.3) {
                computedAlign = "left";
            } else if (ratio > 0.7) {
                computedAlign = "right";
            } else {
                computedAlign = "center";
            }

            setCoords({
                top: rect.top,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                align: computedAlign,
            });
        }
        
        // Đóng popover khi scroll hoặc resize
        const handleCloseEvent = () => onClose();
        
        window.addEventListener("scroll", handleCloseEvent, true); // capture: true bắt mọi sự kiện cuộn
        window.addEventListener("resize", handleCloseEvent);
        
        return () => {
            window.removeEventListener("scroll", handleCloseEvent, true);
            window.removeEventListener("resize", handleCloseEvent);
        };
    }, [triggerRef, onClose]);

    // Xử lý Click Outside để đóng popover
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const isClickInsideTrigger = triggerRef.current && triggerRef.current.contains(e.target as Node);
            
            if (!isClickInsideTrigger) {
                // Chúng ta sẽ đóng popover nếu click ra ngoài. Vì SharedReaction nằm trong m.div
                // nên cần check xem target có nằm trong popoverContent hay không (tạm skip để đơn giản, onClose xử lý chung)
                onClose();
            }
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener("click", handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener("click", handleClickOutside);
        };
    }, [onClose, triggerRef]);

    if (!coords) return null;

    // Tính toán style cho wrapper
    const wrapperStyle: React.CSSProperties = {
        position: 'fixed',
        top: `${coords.top - 8}px`,
        zIndex: 9999,
    };

    let xOffset = "-50%";
    const currentAlign = coords.align;

    if (currentAlign === "right") {
        xOffset = "0%";
        wrapperStyle.transformOrigin = "bottom right";
        wrapperStyle.right = `${window.innerWidth - coords.right}px`;
        wrapperStyle.left = "auto";
    } else if (currentAlign === "left") {
        xOffset = "0%";
        wrapperStyle.transformOrigin = "bottom left";
        wrapperStyle.left = `${coords.left}px`;
        wrapperStyle.right = "auto";
    } else {
        // center
        xOffset = "-50%";
        wrapperStyle.transformOrigin = "bottom";
        wrapperStyle.left = `${coords.left + coords.width / 2}px`;
        wrapperStyle.right = "auto";
    }

    const popoverContent = (
        <m.div
            style={wrapperStyle}
            initial={{ opacity: 0, scale: 0.5, x: xOffset, y: "-80%" }}
            animate={{ opacity: 1, scale: 1, x: xOffset, y: "-100%" }}
            exit={{ opacity: 0, scale: 0.5, x: xOffset, y: "-80%" }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex"
        >
            <div onClick={(e) => e.stopPropagation()}>
                <SharedReaction onSelect={onSelect} />
            </div>
        </m.div>
    );

    return createPortal(popoverContent, document.body);
}
