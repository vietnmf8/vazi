"use client"

import { useState, useEffect, type CSSProperties } from "react"
import { Search, Calendar as CalendarIcon, X } from "lucide-react"
import { format, parse } from "date-fns"
import { Input } from "@/components/ui/Input"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebounce } from "@/hooks/useDebounce"
import type { TableState } from "@/hooks/useTableState"

export type FilterConfig = 
  | { type: 'text'; key: string; placeholder?: string; width?: string }
  | { type: 'select'; key: string; placeholder?: string; options: { label: string; value: string }[]; width?: string }
  | { type: 'date'; key: string; placeholder?: string; width?: string }

export type FilterBarProps = {
  configs: FilterConfig[];
  tableState: TableState;
  exportConfig?: {
    filenameKey: string;
    fetchAll: (query: any) => Promise<any>;
    query: Record<string, any>;
    columns: { header: string; value: (row: any) => any }[];
  };
}

const FILTER_SELECT_CLASS = "rounded-lg px-3 py-2 min-h-11 shrink-0"
const FILTER_CONTROL_STYLE: CSSProperties = {
  border: "1px solid var(--color-border-strong)",
  backgroundColor: "var(--color-surface-elevated)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-md)",
}

export function FilterBar({ configs, exportConfig, tableState }: FilterBarProps) {
  const { query, setFilter } = tableState

  return (
    <div className="flex flex-nowrap items-center gap-2 mb-4 overflow-x-auto">
      {configs.map((config) => {
        if (config.type === 'text') {
          return <TextFilter key={config.key} config={config} currentValue={query[config.key] as string} setFilter={setFilter} />
        }
        if (config.type === 'select') {
          return (
            <select
              key={config.key}
              value={(query[config.key] as string) || ""}
              onChange={(e) => setFilter(config.key, e.target.value || undefined)}
              className={`${FILTER_SELECT_CLASS}`}
              style={{ ...FILTER_CONTROL_STYLE, width: config.width || "190px" }}
              aria-label={config.placeholder}
            >
              <option value="">{config.placeholder}</option>
              {config.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )
        }
        if (config.type === 'date') {
          return <DateFilter key={config.key} config={config} currentValue={query[config.key] as string} setFilter={setFilter} />
        }
        return null
      })}

    </div>
  )
}

function TextFilter({ config, currentValue, setFilter }: { config: any, currentValue: string, setFilter: any }) {
  const [localValue, setLocalValue] = useState(currentValue || "")
  const debouncedValue = useDebounce(localValue, 400)

  // Sync back to URL when debounced value changes
  useEffect(() => {
    if (debouncedValue !== (currentValue || "")) {
      setFilter(config.key, debouncedValue || undefined)
    }
  }, [debouncedValue, config.key, setFilter, currentValue])

  // Sync from URL when URL changes externally
  useEffect(() => {
    if (currentValue !== debouncedValue) {
      setLocalValue(currentValue || "")
    }
  }, [currentValue]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative shrink-0" style={{ width: config.width || "260px" }}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none shrink-0"
        style={{ color: "var(--color-text-muted)" }}
      />
      <Input
        placeholder={config.placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="min-h-11 pl-9 placeholder:text-[var(--color-text-muted)]"
        style={FILTER_CONTROL_STYLE}
        aria-label={config.placeholder}
      />
    </div>
  )
}

function DateFilter({ config, currentValue, setFilter }: { config: any, currentValue: string, setFilter: any }) {
  const [dragStart, setDragStart] = useState<Date | undefined>(undefined);
  const [hoverDate, setHoverDate] = useState<Date | undefined>(undefined);

  let dateObj: { from: Date; to?: Date } | undefined = undefined;

  if (currentValue) {
    const parts = currentValue.split(",");
    const from = parts[0] ? parse(parts[0], "yyyy-MM-dd", new Date()) : undefined;
    const to = parts.length > 1 && parts[1] ? parse(parts[1], "yyyy-MM-dd", new Date()) : undefined;
    if (from) {
      dateObj = { from, to };
    }
  }

  // Override with drag state if dragging
  let displayObj = dateObj;
  if (dragStart) {
    const from = dragStart < (hoverDate || dragStart) ? dragStart : (hoverDate || dragStart);
    const to = dragStart > (hoverDate || dragStart) ? dragStart : (hoverDate || dragStart);
    displayObj = { from, to };
  }

  const getDisplayText = () => {
    const objToFormat = dateObj;
    if (!objToFormat?.from) return config.placeholder || "Chọn ngày...";
    if (!objToFormat.to || objToFormat.from.getTime() === objToFormat.to.getTime()) {
      return format(objToFormat.from, "dd/MM/yyyy");
    }
    return `${format(objToFormat.from, "dd/MM/yyyy")} - ${format(objToFormat.to, "dd/MM/yyyy")}`;
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (dragStart) {
        const from = dragStart < (hoverDate || dragStart) ? dragStart : (hoverDate || dragStart);
        const to = dragStart > (hoverDate || dragStart) ? dragStart : (hoverDate || dragStart);
        if (from.getTime() === to.getTime()) {
          setFilter(config.key, format(from, "yyyy-MM-dd"));
        } else {
          setFilter(config.key, `${format(from, "yyyy-MM-dd")},${format(to, "yyyy-MM-dd")}`);
        }
        setDragStart(undefined);
        setHoverDate(undefined);
      }
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [dragStart, hoverDate, config.key, setFilter]);

  return (
    <div className="flex flex-1 min-w-0 gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex flex-1 items-center min-h-11 rounded-lg px-3 py-2 justify-start shrink-0 truncate"
            style={{ ...FILTER_CONTROL_STYLE, width: "100%", minWidth: "190px" }}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            <span style={{ color: displayObj?.from ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
              {getDisplayText()}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={displayObj}
            onSelect={() => {}}
            captionLayout="dropdown"
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2030, 11)}
            numberOfMonths={1}
            components={{
              DayButton: (props: any) => {
                const { day } = props;
                return (
                  <CalendarDayButton
                    {...props}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDragStart(day.date);
                      setHoverDate(day.date);
                    }}
                    onPointerEnter={() => {
                      if (dragStart) {
                        setHoverDate(day.date);
                      }
                    }}
                  />
                );
              }
            }}
          />
        </PopoverContent>
      </Popover>
      {dateObj?.from && (
        <button
          type="button"
          onClick={() => {
            setDragStart(undefined);
            setHoverDate(undefined);
            setFilter(config.key, undefined);
          }}
          className="flex items-center justify-center min-h-11 w-11 rounded-lg hover:bg-[var(--color-surface-2)] shrink-0"
          style={{
            border: "1px solid var(--color-border-strong)",
            backgroundColor: "var(--color-surface-elevated)",
            color: "var(--color-text-primary)",
          }}
          title="Xóa lọc theo ngày"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
