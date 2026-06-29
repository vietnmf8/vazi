"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayPicker } from "react-day-picker";
import { setMonth, setYear, startOfMonth } from "date-fns";
import { m, AnimatePresence } from "framer-motion";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";

import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// ─── Animation context ────────────────────────────────────────────────────────
interface ICalAnimCtx {
    animKey: number;
    direction: number;
    setDir: (d: number) => void;
    startYear: number;
    endYear: number;
}
const CalAnimCtx = React.createContext<ICalAnimCtx>({
    animKey: 0,
    direction: 1,
    setDir: () => {},
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 5,
});

// ─── Dropdown caption ─────────────────────────────────────────────────────────
function CalendarDropdownCaption({
    calendarMonth,
}: {
    calendarMonth: { date: Date };
    displayIndex?: number;
}) {
    const { goToMonth, previousMonth, nextMonth } = useDayPicker();
    const { setDir, startYear, endYear } = React.useContext(CalAnimCtx);
    const t = useTranslations("Calendar");
    const monthNames = t.raw("months") as string[];

    const current = calendarMonth.date;
    const currentMonthIdx = current.getMonth();
    const currentYear = current.getFullYear();

    const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i,
    );

    const navBtnCls = cn(
        buttonVariants({ variant: "outline" }),
        "size-7 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100 disabled:pointer-events-none disabled:opacity-25 transition-all",
    );
    const selectTriggerCls =
        "h-8 w-auto rounded-lg border-(--color-border-strong) bg-(--color-surface-1) px-2.5 text-sm font-semibold focus:ring-0 focus:ring-offset-0 gap-1";

    return (
        <div className="flex w-full items-center justify-between gap-1 px-1">
            <button
                type="button"
                onClick={() => {
                    setDir(-1);
                    previousMonth && goToMonth(previousMonth);
                }}
                disabled={!previousMonth}
                className={navBtnCls}
                aria-label={t("prev_month")}
            >
                <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-1.5">
                <Select
                    value={String(currentMonthIdx)}
                    onValueChange={(v) => {
                        const target = setMonth(startOfMonth(current), parseInt(v));
                        setDir(target > current ? 1 : -1);
                        goToMonth(target);
                    }}
                >
                    <SelectTrigger className={cn(selectTriggerCls, "min-w-28")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {monthNames.map((name, i) => (
                            <SelectItem key={i} value={String(i)}>
                                {name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={String(currentYear)}
                    onValueChange={(v) => {
                        const target = setYear(startOfMonth(current), parseInt(v));
                        setDir(target > current ? 1 : -1);
                        goToMonth(target);
                    }}
                >
                    <SelectTrigger className={cn(selectTriggerCls, "min-w-17")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <button
                type="button"
                onClick={() => {
                    setDir(1);
                    nextMonth && goToMonth(nextMonth);
                }}
                disabled={!nextMonth}
                className={navBtnCls}
                aria-label={t("next_month")}
            >
                <ChevronRight className="size-4" />
            </button>
        </div>
    );
}

const useSafeLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

// ─── Animated month grid ──────────────────────────────────────────────────────
 
function AnimatedMonthGrid({ className, children, ...props }: any) {
    const { animKey, direction } = React.useContext(CalAnimCtx);

    const contentRef = React.useRef<HTMLDivElement>(null);
    const [height, setHeight] = React.useState<number | "auto">("auto");

    useSafeLayoutEffect(() => {
        if (animKey === 0) return;
        const el = contentRef.current;
        if (!el) return;
        setHeight(el.offsetHeight);
        const ro = new ResizeObserver(() => {
            if (contentRef.current) {
                setHeight(contentRef.current.offsetHeight);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [animKey]);

    return (
        <m.div
            initial={false}
            animate={animKey > 0 ? { height } : { height: "auto" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative overflow-hidden"
        >
            <div ref={contentRef}>
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                    <m.div
                        key={animKey}
                        custom={direction}
                        variants={{
                            enter: (dir: number) => ({
                                x: dir > 0 ? 52 : -52,
                                opacity: 0,
                            }),
                            center: { x: 0, opacity: 1 },
                            exit: (dir: number) => ({
                                x: dir > 0 ? -52 : 52,
                                opacity: 0,
                            }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 360, damping: 34 },
                            opacity: { duration: 0.16 },
                        }}
                    >
                        <table className={className} {...props}>
                            {children}
                        </table>
                    </m.div>
                </AnimatePresence>
            </div>
        </m.div>
    );
}

// ─── Animated day button ──────────────────────────────────────────────────────
 
function AnimatedDayButton({ modifiers, day, children, className, ...props }: any) {
    const isSelected = !!modifiers?.selected;
    const isToday = !!modifiers?.today && !isSelected;

    return (
        <button {...props} className={cn(className, "relative overflow-hidden")}>
            {isToday && (
                <span className="absolute inset-0 rounded-md bg-(--color-surface-elevated)" />
            )}
            <AnimatePresence>
                {isSelected && (
                    <m.span
                        key="sel-bg"
                        className="absolute inset-0 rounded-md bg-linear-to-br from-amber-400 to-amber-600 shadow-sm"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    />
                )}
            </AnimatePresence>
            <span
                className={cn(
                    "relative z-10 leading-none",
                    isSelected && "text-white font-bold",
                )}
            >
                {children}
            </span>
        </button>
    );
}

// ─── Main calendar ────────────────────────────────────────────────────────────
function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    captionLayout,
    onMonthChange: externalOnMonthChange,
    components: externalComponents,
    startMonth: startMonthProp,
    endMonth: endMonthProp,
    ...props
}: CalendarProps) {
    const isDropdown = captionLayout === "dropdown";

    const [animState, setAnimState] = React.useState({ key: 0, direction: 1 });
    // Ref để set direction đồng bộ trước khi onMonthChange async fire
    const dirRef = React.useRef(1);

    const setDir = React.useCallback((d: number) => {
        dirRef.current = d;
    }, []);

    const handleMonthChange = React.useCallback(
        (month: Date) => {
            setAnimState((prev) => ({
                key: prev.key + 1,
                direction: dirRef.current,
            }));
            externalOnMonthChange?.(month);
        },
        [externalOnMonthChange],
    );

    const startMonthTime = startMonthProp?.getTime();
    const endMonthTime = endMonthProp?.getTime();

    const ctxValue = React.useMemo(
        () => ({
            animKey: animState.key,
            direction: animState.direction,
            setDir,
            startYear: startMonthProp ? startMonthProp.getFullYear() : new Date().getFullYear(),
            endYear: endMonthProp ? endMonthProp.getFullYear() : new Date().getFullYear() + 5,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [animState, setDir, startMonthTime, endMonthTime],
    );

    return (
        <CalAnimCtx.Provider value={ctxValue}>
            <DayPicker
                showOutsideDays={showOutsideDays}
                captionLayout={captionLayout}
                onMonthChange={handleMonthChange}
                startMonth={startMonthProp}
                endMonth={endMonthProp}
                className={cn("p-2.5", className)}
                classNames={{
                    months: "flex flex-col sm:flex-row gap-2.5",
                    month: "flex flex-col gap-2.5",
                    month_caption: isDropdown
                        ? "flex w-full pt-1"
                        : "flex justify-center pt-1 relative items-center",
                    caption_label:
                        "text-sm font-bold text-(--color-text-primary)",
                    nav: isDropdown ? "hidden" : "flex items-center gap-1",
                    button_previous: cn(
                        buttonVariants({ variant: "outline" }),
                        "absolute left-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100 transition-all",
                    ),
                    button_next: cn(
                        buttonVariants({ variant: "outline" }),
                        "absolute right-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100 transition-all",
                    ),
                    month_grid: "w-full border-collapse",
                    weekdays: "flex w-full",
                    weekday:
                        "flex-1 text-center text-[0.75rem] font-bold text-(--color-text-tertiary)",
                    week: "flex w-full mt-1",
                    day: "flex-1 flex justify-center items-center relative text-sm focus-within:relative focus-within:z-20 p-0",
                    day_button: cn(
                        "inline-flex items-center justify-center size-8 rounded-md font-semibold text-xs",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)/30",
                        "disabled:pointer-events-none disabled:opacity-40",
                        "aria-selected:font-bold aria-selected:text-white",
                    ),
                    selected: "",
                    today: "",
                    outside:
                        "text-(--color-text-tertiary) opacity-40 aria-selected:opacity-30",
                    disabled: "text-(--color-text-tertiary) opacity-40",
                    hidden: "invisible",
                    ...classNames,
                }}
                components={{
                    Chevron: ({
                        orientation,
                        className: chevronCls,
                        ...iconProps
                    }) => {
                        const Icon =
                            orientation === "left" ? ChevronLeft : ChevronRight;
                        return (
                            <Icon
                                className={cn("size-4", chevronCls)}
                                {...iconProps}
                            />
                        );
                    },
                    DayButton: AnimatedDayButton,
                    MonthGrid: AnimatedMonthGrid,
                    ...(isDropdown
                        ? {
                              MonthCaption: CalendarDropdownCaption,
                              Nav: () => <></>,
                          }
                        : {}),
                    ...externalComponents,
                }}
                {...props}
            />
        </CalAnimCtx.Provider>
    );
}

Calendar.displayName = "Calendar";

export { Calendar };
