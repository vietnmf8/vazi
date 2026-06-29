"use client";

import * as React from "react";
import {
    format,
    isValid,
    parseISO,
    startOfDay,
    startOfMonth,
    addYears,
} from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
    id?: string;
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    disabled?: boolean;
    fromDate?: Date;
    toDate?: Date;
    className?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

function parseDateValue(value?: string): Date | undefined {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? startOfDay(parsed) : undefined;
}

export function DatePicker({
    id,
    value,
    onChange,
    placeholder = "Pick a date",
    error = false,
    disabled = false,
    fromDate,
    toDate,
    className,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: DatePickerProps) {
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const [internalOpen, setInternalOpen] = React.useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = React.useCallback(
        (nextOpen: boolean) => {
            setInternalOpen(nextOpen);
            controlledOnOpenChange?.(nextOpen);
        },
        [controlledOnOpenChange],
    );
    const selected = parseDateValue(value);
    const [pendingDate, setPendingDate] = React.useState<Date | undefined>(
        selected,
    );

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) setPendingDate(selected);
        setOpen(nextOpen);
    };

    const handleApply = () => {
        if (pendingDate) {
            onChange(format(startOfDay(pendingDate), "yyyy-MM-dd"));
        } else {
            onChange("");
        }
        setOpen(false);
    };

    const isDisabled = (date: Date) => {
        const day = startOfDay(date);
        if (fromDate && day < startOfDay(fromDate)) return true;
        if (toDate && day > startOfDay(toDate)) return true;
        return false;
    };

    // Memoize để tránh tạo Date object mới mỗi render
    // → react-day-picker không reset navigation khi prop startMonth/endMonth thay đổi reference
    const fromDateTime = fromDate?.getTime();
    const toDateTime = toDate?.getTime();

    const dropdownStartMonth = React.useMemo(
        () => {
            const fallback = typeof window !== "undefined" ? new Date() : new Date(0);
            return startOfMonth(fromDate ?? fallback);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [fromDateTime],
    );
    const dropdownEndMonth = React.useMemo(
        () => {
            const fallback = typeof window !== "undefined" ? addYears(new Date(), 5) : addYears(new Date(0), 5);
            return startOfMonth(toDate ?? fallback);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [toDateTime],
    );

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            {/*
              Sử dụng PopoverAnchor thay vì PopoverTrigger để tự điều khiển trạng thái mở/đóng 
              ngay khi người dùng nhấn chuột xuống (onMouseDown) thay vì nhả chuột (onMouseUp).
            */}
            <PopoverAnchor asChild>
                <Button
                    ref={triggerRef}
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "h-10 w-full justify-start text-left text-sm font-semibold rounded-md",
                        "border border-(--color-border-strong) bg-(--color-surface-1)",
                        "px-4 shadow-2xs transition-all",
                        // Chỉ hover đổi màu viền khi dropdown đang đóng để tránh làm mờ viền sáng đậm lúc mở
                        !open && "hover:border-(--color-primary)/50 transition-all",
                        // Sử dụng focus:ring-offset-0 để triệt tiêu viền trắng mặc định của trình duyệt/Shadcn khi focus
                        "focus:ring-2 focus:ring-(--color-primary)/20 focus:border-(--color-primary) focus:ring-offset-0",
                        // Giữ màu viền đậm khi hover trong lúc đang focus
                        "focus:hover:border-(--color-primary) transition-all",
                        // Thêm hiệu ứng viền sáng khi dropdown đang mở và ngăn hover làm mờ viền
                        open &&
                            "ring-2 ring-(--color-primary)/20 border-(--color-primary) hover:border-(--color-primary) transition-all",
                        !selected && "text-(--color-text-tertiary)",
                        error && "border-(--color-error)",
                        className,
                    )}
                    onMouseDown={(e) => {
                        if (disabled) return;
                        // Ngăn hành vi click mặc định của trình duyệt để tránh xung đột sự kiện đóng/mở của Radix-UI
                        e.preventDefault();
                        // Chủ động focus để kích hoạt trạng thái focus thực tế đẹp đẽ
                        triggerRef.current?.focus();
                        handleOpenChange(!open);
                    }}
                    aria-invalid={error ? "true" : "false"}
                >
                    <CalendarIcon
                        className="mr-2 size-4 shrink-0 text-(--color-primary)"
                        aria-hidden
                    />
                    {selected ? format(selected, "PPP") : placeholder}
                </Button>
            </PopoverAnchor>
            {/* Tăng khoảng cách dropdown so với input để giao diện thoáng hơn */}
            <PopoverContent 
                className="w-auto p-0" 
                align="start" 
                sideOffset={10}
                onInteractOutside={(e) => {
                    // Ngăn Radix tự động đóng khi người dùng click vào nút trigger, để sự kiện onMouseDown tự toggle đóng chính xác
                    if (triggerRef.current && triggerRef.current.contains(e.target as Node)) {
                        e.preventDefault();
                    }
                }}
            >
                <Calendar
                    mode="single"
                    selected={pendingDate}
                    onSelect={setPendingDate}
                    disabled={isDisabled}
                    defaultMonth={pendingDate ?? dropdownStartMonth}
                    captionLayout="dropdown"
                    startMonth={dropdownStartMonth}
                    endMonth={dropdownEndMonth}
                />
                <div className="border-t border-(--color-border) px-3 pb-2.5 pt-1.5">
                    <Button
                        type="button"
                        className="w-full h-8 font-bold text-xs transition-all duration-200 hover:brightness-110 hover:shadow-md active:brightness-95 active:scale-[0.99]"
                        onClick={handleApply}
                        disabled={!pendingDate}
                    >
                        Apply
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
