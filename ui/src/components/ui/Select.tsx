import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Search } from "lucide-react";
import CaretDownIcon from "@/assets/icons/ui/CaretDown.svg";
import CheckIcon from "@/assets/icons/ui/Check.svg";
import { cn } from "@/lib/utils";

const SelectContext = React.createContext<{
    open: boolean;
    renderedOpen: boolean;
}>({
    open: false,
    renderedOpen: false,
});

interface SelectProps
    extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
    modal?: boolean;
}

const SelectRoot = SelectPrimitive.Root as any;

/**
 * Custom Select component bọc SelectPrimitive.Root để cung cấp trạng thái đóng/mở qua SelectContext.
 * Đồng thời trì hoãn việc unmount thực tế của dropdown đi 140ms khi đóng, giúp exit animation chạy trọn vẹn.
 */
function Select({
    open: controlledOpen,
    onOpenChange,
    modal = false,
    children,
    ...props
}: SelectProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    };

    return (
        <SelectContext.Provider value={{ open, renderedOpen: open }}>
            <SelectRoot
                open={open}
                onOpenChange={handleOpenChange}
                modal={modal}
                {...props}
            >
                {children}
            </SelectRoot>
        </SelectContext.Provider>
    );
}

const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

interface SelectTriggerProps
    extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
    ref?: React.Ref<React.ElementRef<typeof SelectPrimitive.Trigger>>;
}

function SelectTrigger({
    className,
    children,
    ref,
    ...props
}: SelectTriggerProps) {
    return (
        <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
                "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] ring-offset-background placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-[var(--color-text-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        >
            <span className="flex-1 truncate text-left">{children}</span>
            <SelectPrimitive.Icon asChild>
                <CaretDownIcon className="h-4 w-4 shrink-0 opacity-50" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
}
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

/** Lấy text thuần từ React node để filter search */
function getNodeText(node: React.ReactNode): string {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(getNodeText).join(" ");
    if (React.isValidElement(node))
        return getNodeText(
            (node.props as { children?: React.ReactNode }).children,
        );
    return "";
}

interface SelectContentProps
    extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
    ref?: React.Ref<React.ElementRef<typeof SelectPrimitive.Content>>;
    searchable?: boolean;
    searchPlaceholder?: string;
}

function SelectContent({
    className,
    children,
    position = "popper",
    ref,
    searchable,
    searchPlaceholder = "Search...",
    onCloseAutoFocus,
    ...props
}: SelectContentProps) {
    const { open, renderedOpen } = React.useContext(SelectContext);
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const [search, setSearch] = React.useState("");
    const thumbDOMRef = React.useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = React.useState(false);

    const isDragging = React.useRef(false);
    const dragStartY = React.useRef(0);
    const dragStartScrollTop = React.useRef(0);
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

    // (Auto-focus & Auto-scroll logic moved below updateThumb)

    const updateThumb = React.useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const scrollable = scrollHeight > clientHeight;
        setIsScrollable(scrollable);
        if (scrollable) {
            const INSET = 4;
            const trackHeight = clientHeight - INSET * 2;
            const ratio = clientHeight / scrollHeight;
            const h = Math.max(32, ratio * trackHeight);
            const maxTravel = trackHeight - h;
            const maxScroll = scrollHeight - clientHeight;
            
            if (thumbDOMRef.current) {
                thumbDOMRef.current.style.height = `${h}px`;
                const top = INSET + (maxScroll > 0 ? (scrollTop / maxScroll) * maxTravel : 0);
                thumbDOMRef.current.style.transform = `translateY(${top}px)`;
            }
        }
    }, []);

    // Auto-focus search input ngay sau khi dropdown render
    // Init thumb sau mount và cuộn đến item được chọn
    React.useEffect(() => {
        if (!open) return;

        const applyScrollAndFocus = () => {
            if (searchable) {
                searchRef.current?.focus();
            }
            
            if (viewportRef.current) {
                // TẠI SAO: Radix dùng data-state="checked" cho item đang được chọn
                const selectedEl = viewportRef.current.querySelector(
                    `[data-state="checked"]`
                ) as HTMLElement;
                
                if (selectedEl) {
                    // Sử dụng scrollIntoView với block center là cách tốt nhất để đè lên scrollIntoView mặc định của Radix
                    selectedEl.scrollIntoView({ block: "center" });
                } else if (!searchable) {
                    // Nếu không có ô search và chưa chọn gì, cuộn lên đầu
                    viewportRef.current.scrollTop = 0;
                }
            }
            
            updateThumb();
        };

        // TẠI SAO: Radix Select cũng có một logic tự scroll đến active item sau khi mount (thường kéo item xuống đáy `block: "nearest"`).
        // Ta cần chạy đè logic căn giữa (center) của mình sau khi Radix chạy xong bằng cách dùng nhiều mốc thời gian (0ms, 30ms, 80ms) 
        // để chắc chắn đè được sự kiện native của thư viện mà không gây giật lag.
        const t1 = requestAnimationFrame(applyScrollAndFocus);
        const t2 = setTimeout(applyScrollAndFocus, 30);
        const t3 = setTimeout(applyScrollAndFocus, 80);
        const t4 = setTimeout(applyScrollAndFocus, 150);
        
        return () => {
            cancelAnimationFrame(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [searchable, updateThumb, open]);

    // Filter children theo search query (value prop + text content)
    const filteredChildren = React.useMemo(() => {
        if (!searchable || !search.trim()) return children;
        const query = search.toLowerCase();
        return React.Children.toArray(children).filter((child) => {
            if (!React.isValidElement(child)) return true;
            const value = String(
                (child.props as { value?: unknown }).value ?? "",
            ).toLowerCase();
            const text = getNodeText(
                (child.props as { children?: React.ReactNode }).children,
            ).toLowerCase();
            return value.includes(query) || text.includes(query);
        });
    }, [children, search, searchable]);

    const resultArray = React.Children.toArray(filteredChildren);

    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                ref={ref}
                data-state={open ? "open" : "closed"}
                className={cn(
                    "relative z-[70] min-w-[8rem] overflow-hidden rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-text-primary)] shadow-md select-content-animation",
                    position === "popper" &&
                        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                    className,
                )}
                position={position}
                onCloseAutoFocus={(e) => {
                    if (onCloseAutoFocus) {
                        onCloseAutoFocus(e);
                    } else if (
                        document.activeElement &&
                        document.activeElement !== document.body
                    ) {
                        e.preventDefault();
                    }
                }}
                {...props}
            >
                {/* Search input */}
                {searchable && (
                    <div className="flex items-center gap-2 border-b border-(--color-border-default) px-3 py-2">
                        <Search className="size-3.5 shrink-0 text-(--color-text-muted)" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                requestAnimationFrame(updateThumb);
                            }}
                            placeholder={searchPlaceholder}
                            className="flex-1 bg-transparent text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) outline-none"
                            onKeyDown={(e) => {
                                // Chặn Radix type-ahead capture khi đang gõ search
                                if (
                                    ![
                                        "Escape",
                                        "ArrowUp",
                                        "ArrowDown",
                                        "Enter",
                                        "Tab",
                                    ].includes(e.key)
                                ) {
                                    e.stopPropagation();
                                }
                            }}
                        />
                    </div>
                )}

                <SelectPrimitive.Viewport
                    ref={viewportRef as React.Ref<HTMLDivElement>}
                    onScroll={updateThumb}
                    className={cn(
                        "p-1 max-h-60 overflow-y-auto select-no-scrollbar overscroll-contain",
                        position === "popper" &&
                            "w-full min-w-[var(--radix-select-trigger-width)]",
                    )}
                >
                    {resultArray.length > 0 ? (
                        resultArray
                    ) : (
                        <div className="py-5 text-center text-sm text-(--color-text-muted)">
                            No results found
                        </div>
                    )}
                </SelectPrimitive.Viewport>

                {/* Custom scroll thumb */}
                {isScrollable && (
                    <div
                        ref={thumbDOMRef}
                        aria-hidden="true"
                        onMouseDown={handleThumbMouseDown}
                        className="absolute right-1 top-0 w-0.75 rounded-full bg-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/70 cursor-grab active:cursor-grabbing transition-colors duration-200"
                    />
                )}
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
}
SelectContent.displayName = SelectPrimitive.Content.displayName;

interface SelectItemProps
    extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
    ref?: React.Ref<React.ElementRef<typeof SelectPrimitive.Item>>;
}

function SelectItem({ className, children, ref, value, ...props }: SelectItemProps) {
    return (
        <SelectPrimitive.Item
            ref={ref}
            value={value}
            // AI Virtual Mouse: dùng để VirtualMouseEngine tìm đúng option cần click khi
            // focus_ui_field truyền value (cùng cơ chế đã có ở Combobox.tsx Phase 2 — xem
            // VirtualMouseEngine.tsx runSelectSequence, tổng quát theo [role="option"][data-value]).
            data-value={value}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-[var(--color-surface-elevated)] focus:text-[var(--color-text-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=selected]:font-extrabold",
                className,
            )}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="h-4 w-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}
SelectItem.displayName = SelectPrimitive.Item.displayName;

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
};
