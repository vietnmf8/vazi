"use client"

import React, { useEffect, useRef } from "react"
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react"
import { useDebouncedLoading } from "@/hooks/useDebouncedLoading"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { PaginationMeta } from "@/types/api"
import { Button } from "@/components/ui/Button"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

function generatePaginationLinks(currentPage: number, totalPages: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, "ellipsis", totalPages];
    }
    if (currentPage >= totalPages - 3) {
        return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

interface DataTableProps<T> {
    columns: ColumnDef<T, unknown>[]
    data: T[]
    isLoading?: boolean
    emptyMessage?: string
    pagination?: PaginationMeta
    onPageChange?: (page: number) => void
    onRowClick?: (row: T) => void
    sorting?: SortingState
    onSortingChange?: (sorting: SortingState) => void
    manualSorting?: boolean
    activeRowPredicate?: (row: T) => boolean
    getRowId?: (row: T) => string
}

export function DataTable<T>({
    columns,
    data,
    isLoading,
    emptyMessage = t("common.loading"),
    pagination,
    onPageChange,
    onRowClick,
    sorting,
    onSortingChange,
    manualSorting = true,
    activeRowPredicate,
    getRowId,
}: DataTableProps<T>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: getRowId || ((row: any) => row.id || row._id || (row as any).sequence_no?.toString()),
        manualSorting,
        state: {
            ...(sorting ? { sorting } : {}),
        },
        onSortingChange: (updater) => {
            if (typeof updater === 'function' && onSortingChange) {
                onSortingChange(updater(sorting || []))
            } else if (onSortingChange) {
                onSortingChange(updater as SortingState)
            }
        },
    })

    // DEBUG: Detect if <th> elements are being removed from the DOM
    const theadRef = useRef<HTMLTableSectionElement>(null);
    useEffect(() => {
        if (!theadRef.current) return;
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.removedNodes.length > 0) {
                    m.removedNodes.forEach(node => {
                        if (node.nodeName === 'TH' || node.nodeName === 'TR') {
                            console.error('[DataTable Debug] 🚨 THEAD ELEMENT UNMOUNTED! This causes cursor flicker!', node);
                        }
                    });
                }
            }
        });
        observer.observe(theadRef.current, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    const showLoading = useDebouncedLoading(isLoading)

    if (data.length === 0) {
        return (
            <div className="w-full relative">
                <div
                    className="w-full rounded-xl flex items-center justify-center h-40"
                    style={{
                        backgroundColor: "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border-default)",
                        color: "var(--color-text-muted)",
                        fontSize: "var(--font-size-md)",
                    }}
                >
                    {emptyMessage}
                </div>
                <div 
                    className={cn(
                        "absolute inset-0 z-10 bg-white/50 flex items-center justify-center rounded-xl pointer-events-none transition-opacity duration-200",
                        showLoading ? "opacity-100" : "opacity-0"
                    )}
                >
                    <Loader2 className="size-6 text-blue-600 animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div
            className="w-full rounded-xl overflow-hidden relative"
            style={{ border: "1px solid var(--color-border-default)" }}
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed">
                    <thead ref={theadRef}>
                        {table.getHeaderGroups().map((hg) => (
                            <tr
                                key={hg.id}
                                style={{
                                    backgroundColor: "var(--color-surface-2)",
                                    borderBottom: "1px solid var(--color-border-default)",
                                }}
                            >
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={`text-left px-4 py-3 font-medium select-none ${header.column.getCanSort() ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" : ""}`}
                                        style={{
                                            fontSize: "var(--font-size-sm)",
                                            color: "var(--color-text-muted)",
                                            width: header.column.getSize() !== 150 ? header.column.getSize() : undefined,
                                            textAlign: (header.column.columnDef.meta as any)?.align || "left",
                                        }}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div
                                            className="flex items-center gap-1"
                                            style={{
                                                justifyContent:
                                                    (header.column.columnDef.meta as any)?.align === "right"
                                                        ? "flex-end"
                                                        : (header.column.columnDef.meta as any)?.align === "center"
                                                            ? "center"
                                                            : "flex-start",
                                            }}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getCanSort() && (
                                                <span className="pointer-events-none w-4 h-4 flex items-center justify-center shrink-0">
                                                    {{
                                                        asc: <ArrowUp className="w-4 h-4" />,
                                                        desc: <ArrowDown className="w-4 h-4" />,
                                                    }[header.column.getIsSorted() as string] ?? (
                                                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row, idx) => {
                            const isActive = activeRowPredicate?.(row.original);
                            return (
                                <tr
                                    key={row.id}
                                    className={`${onRowClick ? "cursor-pointer" : ""} ${isActive ? "bg-[var(--color-surface-elevated-hover)]" : "bg-[var(--color-surface-elevated)]"} hover:bg-slate-50/10 dark:hover:bg-zinc-800/10 transition-colors duration-200 border-b border-[var(--color-border-default)] last:border-0`}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3"
                                            style={{
                                                fontSize: "var(--font-size-md)",
                                                color: "var(--color-text-primary)",
                                                textAlign: (cell.column.columnDef.meta as any)?.align || "left",
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pagination && onPageChange && (
                <div
                    className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 px-4 py-3 border-t"
                    style={{
                        borderColor: "var(--color-border-default)",
                        backgroundColor: "var(--color-surface-elevated)",
                    }}
                >
                    <span className="justify-self-center sm:justify-self-start text-center sm:text-left flex items-center gap-1" style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                        {t("common.page")}
                        <input
                            key={pagination.current_page}
                            type="number"
                            min={1}
                            max={Math.ceil(pagination.total / pagination.per_page)}
                            defaultValue={pagination.current_page}
                            className="w-12 px-1 py-0.5 text-center rounded-md"
                            style={{
                                border: "1px solid var(--color-border-default)",
                                backgroundColor: "var(--color-surface-base)",
                                fontSize: "var(--font-size-sm)",
                                color: "var(--color-text-primary)",
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const val = parseInt(e.currentTarget.value);
                                    const maxPage = Math.ceil(pagination.total / pagination.per_page);
                                    if (val >= 1 && val <= maxPage && val !== pagination.current_page) {
                                        onPageChange(val);
                                        document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
                                    } else {
                                        e.currentTarget.value = String(pagination.current_page);
                                    }
                                }
                            }}
                            onBlur={(e) => {
                                e.currentTarget.value = String(pagination.current_page);
                            }}
                        />
                        {t("common.of")} {Math.ceil(pagination.total / pagination.per_page)}
                    </span>
                    <Pagination className="justify-self-center mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.current_page > 1) {
                                            onPageChange(pagination.current_page - 1);
                                            document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
                                        }
                                    }}
                                    className={pagination.current_page <= 1 ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>

                            {generatePaginationLinks(pagination.current_page, Math.ceil(pagination.total / pagination.per_page)).map((item, index) => (
                                <PaginationItem key={index}>
                                    {item === "ellipsis" ? (
                                        <PaginationEllipsis />
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            isActive={pagination.current_page === item}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onPageChange(Number(item));
                                                document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                        >
                                            {item}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.has_more) {
                                            onPageChange(pagination.current_page + 1);
                                            document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
                                        }
                                    }}
                                    className={!pagination.has_more ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                    <div className="hidden sm:block"></div>
                </div>
            )}
            <div 
                className={cn(
                    "absolute inset-0 z-10 bg-white/50 flex items-center justify-center rounded-xl pointer-events-none transition-opacity duration-200",
                    showLoading ? "opacity-100" : "opacity-0"
                )}
            >
                <Loader2 className="size-6 text-blue-600 animate-spin" />
            </div>
        </div>
    )
}
