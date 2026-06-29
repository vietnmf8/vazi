"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SearchMatchSpanProps {
    children: React.ReactNode;
    isUserMessage?: boolean;
}

export function SearchMatchSpan({ children, isUserMessage }: SearchMatchSpanProps) {
    return (
        <span
            className={cn(
                "search-match-span rounded-[3px] text-inherit transition-all",
                // Mặc định inactive: trong suốt để không hiển thị viền vàng thừa
                "bg-transparent"
            )}
            data-is-user={isUserMessage ? "true" : "false"}
        >
            {children}
        </span>
    );
}
