"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

interface PopoverContentProps extends React.ComponentPropsWithoutRef<
    typeof PopoverPrimitive.Content
> {
    ref?: React.Ref<React.ElementRef<typeof PopoverPrimitive.Content>>;
}

function PopoverContent({
    className,
    align = "center",
    sideOffset = 4,
    ref,
    onCloseAutoFocus,
    ...props
}: PopoverContentProps) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                ref={ref}
                align={align}
                sideOffset={sideOffset}
                className={cn(
                    "z-[70] w-72 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] p-4 text-[var(--color-text-primary)] shadow-md outline-none popover-content-animation",
                    className,
                )}
                onCloseAutoFocus={(e) => {
                    if (onCloseAutoFocus) {
                        onCloseAutoFocus(e);
                    } else if (document.activeElement && document.activeElement !== document.body) {
                        e.preventDefault();
                    }
                }}
                {...props}
            />
        </PopoverPrimitive.Portal>
    );
}
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
