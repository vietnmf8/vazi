"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    isHeader?: boolean;
};

interface ComboboxProps {
    value?: string;
    onValueChange?: (value: string) => void;
    options: ComboboxOption[];
    placeholder?: string;
    emptyText?: string;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onOptionHover?: (value: string) => void;
    /** Tự động cập nhật nội dung input khi label của option được chọn thay đổi (ví dụ: khi chuyển ngôn ngữ) */
    syncLabelWithLanguage?: boolean;
    /** ID cho AI Virtual Mouse — gắn data-ai-element lên input trigger để click_ui_element/focus_ui_field tìm thấy */
    aiElementId?: string;
}

export function Combobox({
    value,
    onValueChange,
    options,
    placeholder = "Select...",
    emptyText = "No results found.",
    className,
    inputClassName,
    disabled,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onOptionHover,
    syncLabelWithLanguage,
    aiElementId,
}: ComboboxProps) {
    const listboxId = React.useId();
    const [internalOpen, setInternalOpen] = React.useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = React.useCallback(
        (nextOpen: boolean) => {
            setInternalOpen(nextOpen);
            controlledOnOpenChange?.(nextOpen);
        },
        [controlledOnOpenChange],
    );
    // inputValue là text đang gõ; rỗng khi đang search (placeholder hiện selected label)
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const isDragging = React.useRef(false);
    const dragStartY = React.useRef(0);
    const dragStartScrollTop = React.useRef(0);
    const thumbDOMRef = React.useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = React.useState(false);

    const selected = options.find((o) => o.value === value);

    // Flag luôn hiển thị khi đã có selection — đại diện cho quốc gia đang chọn,
    // không phụ thuộc vào text đang gõ trong input
    const showTriggerIcon = !!selected?.icon;

    // Refs luôn trỏ đến giá trị mới nhất — tránh stale closure trong setTimeout
    const valueRef = React.useRef(value);
    const optionsRef = React.useRef(options);

    React.useEffect(() => {
        valueRef.current = value;
        optionsRef.current = options;
    }, [value, options]);

    const blurTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const rafRef = React.useRef<number | null>(null);
    // Bảo vệ chống lại Radix FocusScope chiếm focus khi Select content unmount (~140ms delay).
    const pendingOpenRef = React.useRef(false);

    React.useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Khi value thay đổi từ ngoài, sync lại inputValue
    React.useEffect(() => {
         
        const newLabel = selected?.label ?? "";
        if (!open) setTimeout(() => setInputValue(newLabel), 0);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    // Optional: Sync inputValue khi label thay đổi (ví dụ: đổi ngôn ngữ)
    React.useEffect(() => {
        if (syncLabelWithLanguage && !open && selected?.label) {
            // Using a timeout defers the setState call to avoid synchronous cascade
            const timer = setTimeout(() => setInputValue(selected.label), 0);
            return () => clearTimeout(timer);
        }
    }, [selected?.label, syncLabelWithLanguage, open]);

    // ── Scroll thumb ──────────────────────────────────────────────
    const updateThumb = React.useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const scrollable = scrollHeight > clientHeight;
        setIsScrollable(scrollable);
        if (!scrollable) return;
        const INSET = 4;
        const trackHeight = clientHeight - INSET * 2;
        const h = Math.max(32, (clientHeight / scrollHeight) * trackHeight);
        const maxTravel = trackHeight - h;
        const maxScroll = scrollHeight - clientHeight;
        
        if (thumbDOMRef.current) {
            thumbDOMRef.current.style.height = `${h}px`;
            const top = INSET + (maxScroll > 0 ? (scrollTop / maxScroll) * maxTravel : 0);
            thumbDOMRef.current.style.transform = `translateY(${top}px)`;
        }
    }, []);

    // Tự động cuộn đến phần tử được chọn khi mở dropdown
    // Đồng thời cập nhật lại custom scrollbar khi open hoặc filter thay đổi
    React.useEffect(() => {
        if (!open) return;
        
        // Đợi một khoảng nhỏ để DOM render xong các option (đặc biệt khi filter thay đổi)
        const timer = setTimeout(() => {
            if (!viewportRef.current) return;
            
            // 1. Chỉ tự động cuộn nếu đang không search (inputValue rỗng)
            if (!inputValue && value) {
                // TẠI SAO: Tìm item đang được chọn bằng aria-selected="true"
                const selectedEl = viewportRef.current.querySelector(
                    `[role="option"][aria-selected="true"]`
                ) as HTMLElement;
                
                if (selectedEl) {
                    const viewport = viewportRef.current;
                    const offsetTop = selectedEl.offsetTop;
                    const elementHeight = selectedEl.offsetHeight;
                    const viewportHeight = viewport.clientHeight;
                    
                    // Căn giữa item trong viewport
                    viewport.scrollTop = Math.max(0, offsetTop - viewportHeight / 2 + elementHeight / 2);
                }
            } else if (!inputValue && !value) {
                // Nếu chưa chọn gì, cuộn lên đầu
                viewportRef.current.scrollTop = 0;
            }
            
            // 2. Cập nhật lại thanh cuộn
            updateThumb();
        }, 10);
        
        return () => clearTimeout(timer);
    }, [open, value, inputValue, updateThumb]);
    const dragListenersRef = React.useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);

    const handleThumbMouseDown = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartScrollTop.current = viewportRef.current?.scrollTop ?? 0;

        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current || !viewportRef.current) return;
            const { scrollHeight, clientHeight } = viewportRef.current;
            const INSET = 4;
            const trackHeight = clientHeight - INSET * 2;
            const h = Math.max(32, (clientHeight / scrollHeight) * trackHeight);
            const maxTravel = trackHeight - h;
            const maxScroll = scrollHeight - clientHeight;
            const ratio = maxTravel > 0 ? maxScroll / maxTravel : 0;
            const newScroll =
                dragStartScrollTop.current +
                (ev.clientY - dragStartY.current) * ratio;
            viewportRef.current.scrollTop = Math.max(
                0,
                Math.min(maxScroll, newScroll),
            );
        };

        const onUp = () => {
            isDragging.current = false;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            dragListenersRef.current = null;
        };

        dragListenersRef.current = { move: onMove, up: onUp };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, []);

    // Cleanup event listeners on unmount
    React.useEffect(() => {
        return () => {
            if (dragListenersRef.current) {
                document.removeEventListener("mousemove", dragListenersRef.current.move);
                document.removeEventListener("mouseup", dragListenersRef.current.up);
            }
        };
    }, []);

    // ── Filter ────────────────────────────────────────────────────
    const filtered = React.useMemo(() => {
        const q = inputValue.trim().toLowerCase();
        // Không search → trả về toàn bộ (bao gồm section headers)
        if (!q) return options;
        // Khi search → bỏ headers, chỉ giữ items khớp query
        return options.filter(
            (o) =>
                !o.isHeader &&
                !o.disabled &&
                (o.value.toLowerCase().includes(q) ||
                    o.label.toLowerCase().includes(q)),
        );
    }, [options, inputValue]);

    // TẠI SAO: Đóng băng danh sách hiển thị khi dropdown bắt đầu đóng (open === false).
    // Điều này ngăn chặn việc cập nhật lại `inputValue` (sau khi chọn hoặc click ra ngoài)
    // làm thay đổi bộ lọc `filtered` và làm co rút/giật giao diện trong suốt quá trình transition đóng.
    const [displayOptions, setDisplayOptions] = React.useState<ComboboxOption[]>(options);

    React.useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDisplayOptions(filtered);
        }
    }, [filtered, open]);

    // ── Handlers ──────────────────────────────────────────────────
    const handleFocus = () => {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        setInputValue(""); // xoá để user gõ fresh; placeholder hiện selected label
        // Reset displayOptions đồng bộ trong cùng batch với setOpen(true) để tránh
        // flash 1 frame với dữ liệu frozen từ lần đóng trước (xảy ra khi controlled open
        // cập nhật từ parent tách batch với internal state của Combobox).
        setDisplayOptions(options);
        setOpen(true);
    };

    const handleBlur = () => {
        // Delay để click item kịp fire trước khi blur đóng dropdown.
        // Dùng refs thay vì closure để tránh stale value khi handleSelect
        // đã cập nhật value trước khi timeout chạy.
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

        if (pendingOpenRef.current) {
            // Tái tập trung focus ngay lập tức trên microtask/next-tick tiếp theo
            // để tránh bị nhấp nháy hoặc trễ 150ms.
            blurTimeoutRef.current = setTimeout(() => {
                pendingOpenRef.current = false;
                inputRef.current?.focus();
            }, 0);
            return;
        }

        blurTimeoutRef.current = setTimeout(() => {
            setOpen(false);
            const cur = optionsRef.current.find(
                (o) => o.value === valueRef.current,
            );
            setInputValue(cur?.label ?? "");
        }, 150);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
        if (disabled) return;

        // LUÔN LUÔN ngăn chặn sự kiện pointerdown lan truyền lên document.
        // Điều này ngăn chặn các dropdown đang mở khác (như Radix Select) bắt được pointerdown outside
        // và gọi e.preventDefault() để chặn đứng hành vi focus mặc định của input này.
        e.stopPropagation();

        if (open) {
            // Khi dropdown đang mở, người dùng click vào input để đóng nó.
            // Gọi preventDefault để giữ nguyên focus trên input mà không bị nhấp nháy hoặc mất focus.
            e.preventDefault();
            setOpen(false);
        } else {
            // Phát hiện người dùng đang click rời khỏi một Radix Select đang mở.
            // Select.tsx có 140ms unmount delay → FocusScope của nó sẽ cướp focus SAU KHI RAF chạy.
            // Đánh dấu pendingOpenRef để handleBlur biết cần re-focus thay vì đóng dropdown.
            const ae = document.activeElement as HTMLElement | null;
            const hasOpenSelectButton = !!document.querySelector('button[role="combobox"][aria-expanded="true"]');
            // Detect Radix Select trigger qua data-state hoặc open content
            const hasOpenRadixSelect = !!document.querySelector('[data-radix-select-trigger][data-state="open"]')
                || !!document.querySelector('[data-radix-select-content]');
            const hasOpenSelect = hasOpenSelectButton || hasOpenRadixSelect;
            const leavingOpenRadixSelect =
                hasOpenSelect ||
                (ae !== null && (
                    ae.closest('[role="listbox"]') !== null ||
                    ae.closest('[data-radix-select-viewport]') !== null ||
                    ae.getAttribute("aria-expanded") === "true"
                ));
            if (leavingOpenRadixSelect) {
                pendingOpenRef.current = true;
                // Safety net: FocusScope unmount tối đa ~140ms, clear sau 300ms
                setTimeout(() => { pendingOpenRef.current = false; }, 300);
            }

            // Fix flicker on mobile: Clear input immediately so that if focus is delayed
            // the dropdown still opens with all options instead of just the selected one.
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            setInputValue("");
            setDisplayOptions(options);

            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                inputRef.current?.focus();
                setOpen(true);
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (!open) setOpen(true);
    };

    const handleSelect = (opt: ComboboxOption) => {
        setInputValue(opt.label);
        onValueChange?.(opt.value);
        setOpen(false);
        inputRef.current?.blur();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {/* PopoverAnchor expose --radix-popover-trigger-width cho content */}
            <PopoverAnchor asChild>
                <div className={cn("relative w-full", className)}>
                    {/* Flag icon bên trái khi đã chọn và chưa gõ khác */}
                    {showTriggerIcon && (
                        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                            {selected!.icon}
                        </span>
                    )}

                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-haspopup="listbox"
                        autoComplete="off"
                        disabled={disabled}
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onPointerDown={handlePointerDown}
                        // AI Virtual Mouse: el.click() (VirtualMouseEngine) chỉ dispatch sự kiện "click",
                        // KHÔNG focus input như đã giả định ban đầu (đã verify thực tế: el.click() trên
                        // input KHÔNG kích hoạt activation-focus behavior, chỉ click chuột thật mới focus
                        // qua handlePointerDown) — nên handleFocus (gắn ở onFocus) không tự chạy.
                        // BUG ĐÃ SỬA: bản trước chỉ gọi setOpen(true) ở đây, thiếu 2 side-effect mà
                        // handleFocus/handlePointerDown đều làm (setInputValue(""), setDisplayOptions(options))
                        // → dropdown mở ra nhưng `filtered`/displayOptions vẫn lọc theo inputValue CŨ (label
                        // đang chọn, vd "Argentina") nên chỉ hiện đúng 1 option trùng tên thay vì cả danh sách.
                        onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                            // detail === 0 chỉ xảy ra với .click() giả lập (programmatic) — click chuột
                            // thật luôn có detail >= 1. Phân biệt rõ để KHÔNG can thiệp vào click thật
                            // (vốn đã hoạt động đúng qua handleFocus/handlePointerDown), chỉ làm safety-net
                            // cho VirtualMouseEngine.
                            if (aiElementId && e.detail === 0 && !open) {
                                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                                setInputValue("");
                                setDisplayOptions(options);
                                inputRef.current?.focus();
                                setOpen(true);
                            }
                        }}
                        data-ai-element={aiElementId}
                        data-ai-action={aiElementId ? "click" : undefined}
                        /* placeholder hiện tên nước đã chọn khi đang search */
                        placeholder={selected ? selected.label : placeholder}
                        className={cn(
                            "h-10 w-full rounded-xl border border-(--color-border-strong)",
                            "bg-(--color-surface-1) shadow-2xs",
                            "text-sm font-semibold text-(--color-text-primary)",
                            "transition-all outline-none cursor-text",
                            "placeholder:font-semibold placeholder:text-(--color-text-primary)",
                            // Chỉ hover đổi màu viền khi dropdown đang đóng
                            !open && "hover:border-(--color-primary)/50 transition-all",
                            // Sử dụng focus:ring-offset-0 để triệt tiêu viền trắng mặc định khi có focus
                            "focus:ring-2 focus:ring-(--color-primary)/20 focus:border-(--color-primary) focus:ring-offset-0",
                            // Giữ màu viền đậm khi hover trong lúc đang focus
                            "focus:hover:border-(--color-primary) transition-all",
                            // Đồng bộ hiệu ứng viền sáng đậm khi dropdown Nationality đang mở
                            open && "ring-2 ring-(--color-primary)/20 border-(--color-primary) hover:border-(--color-primary) transition-all",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            // padding trái tùy có icon hay không
                            showTriggerIcon ? "pl-10 pr-10" : "px-4 pr-10",
                            inputClassName,
                        )}
                    />

                    <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-40 text-(--color-text-secondary)" />
                </div>
            </PopoverAnchor>

            <PopoverContent
                align="start"
                // Tăng khoảng cách dropdown so với input để giao diện thoáng hơn
                sideOffset={8}
                /* Không steal focus → input giữ focus khi dropdown mở */
                onOpenAutoFocus={(e) => e.preventDefault()}
                // Radix Select FocusScope (140ms unmount) trả focus về trigger → ngăn Popover tự đóng
                // khi đang trong cửa sổ chuyển tiếp từ Select sang Combobox (pendingOpenRef)
                onFocusOutside={(e) => {
                    if (pendingOpenRef.current) e.preventDefault();
                }}
                className="p-0 w-(--radix-popover-trigger-width) overflow-hidden"
            >
                {/* List + custom scroll thumb */}
                <div className="relative">
                    <div
                        ref={viewportRef}
                        id={listboxId}
                        onScroll={updateThumb}
                        role="listbox"
                        aria-label="Options"
                        className="max-h-60 overflow-y-auto select-no-scrollbar overscroll-contain p-1"
                    >
                        {displayOptions.length > 0 ? (
                            displayOptions.map((opt, i) =>
                                opt.isHeader ? (
                                    // Section header A, B, C...
                                    <div
                                        key={opt.value}
                                        aria-hidden="true"
                                        className={cn(
                                            "flex items-center gap-2 px-2 pb-1 select-none pointer-events-none",
                                            i === 0 ? "pt-1" : "pt-3",
                                        )}
                                    >
                                        <span className="text-xs font-bold tracking-widest uppercase text-(--color-primary)">
                                            {opt.label}
                                        </span>
                                        <div className="flex-1 h-px bg-(--color-border)" />
                                    </div>
                                ) : (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="option"
                                        aria-selected={value === opt.value}
                                        disabled={opt.disabled}
                                        /* AI Virtual Mouse: dùng để tìm đúng option cần click khi
                                           focus_ui_field truyền value (xem VirtualMouseEngine.tsx) */
                                        data-value={opt.value}
                                        /* preventDefault ngăn blur trên input khi click item */
                                        onMouseDown={(e) => e.preventDefault()}
                                        onMouseEnter={() =>
                                            onOptionHover?.(opt.value)
                                        }
                                        onClick={() => handleSelect(opt)}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-2 rounded-sm",
                                            "min-h-11 sm:min-h-0 sm:py-1.5 py-2",
                                            "text-sm text-left outline-none",
                                            "text-(--color-text-primary) transition-all",
                                            "hover:bg-(--color-surface-elevated) transition-all",
                                            "disabled:pointer-events-none disabled:opacity-50",
                                            value === opt.value &&
                                                "font-extrabold",
                                        )}
                                    >
                                        {/* Checkmark zone cố định alignment */}
                                        <span className="flex w-4 shrink-0 items-center justify-center">
                                            {value === opt.value && (
                                                <Check className="size-3.5 text-(--color-primary)" />
                                            )}
                                        </span>
                                        {opt.icon && (
                                            <span className="shrink-0">
                                                {opt.icon}
                                            </span>
                                        )}
                                        <span className="flex-1 truncate">
                                            {opt.label}
                                        </span>
                                    </button>
                                ),
                            )
                        ) : (
                            <div className="py-5 text-center text-sm text-(--color-text-muted)">
                                {emptyText}
                            </div>
                        )}
                    </div>

                    {/* Draggable scroll thumb */}
                    {isScrollable && (
                        <div
                            ref={thumbDOMRef}
                            aria-hidden="true"
                            onMouseDown={handleThumbMouseDown}
                            className="absolute right-1 top-0 w-0.75 rounded-full bg-(--color-primary)/45 hover:bg-(--color-primary)/70 cursor-grab active:cursor-grabbing transition-colors duration-200"
                        />
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
