"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";
import { LeaveReviewModal } from "./LeaveReviewModal";

export function LeaveReviewButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="flex justify-center mt-12">
                <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        buttonVariants({
                            variant: "default",
                            size: "lg",
                        }),
                        "rounded-full px-8 py-6 decoration-none border-0 text-base"
                    )}
                >
                    Leave a Review
                </button>
            </div>

            <LeaveReviewModal open={isOpen} onDismiss={() => setIsOpen(false)} />
        </>
    );
}
