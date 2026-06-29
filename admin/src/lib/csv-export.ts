import type { PaginatedResponse } from "@/types/api"

export type CsvColumn<T> = {
 header: string
 value: (row: T) => string | number | null | undefined
}

function escapeCsvCell(raw: string): string {
 if (raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
 return `"${raw.replace(/"/g, '""')}"`
 }
 return raw
}

/**
 * Xuất CSV phía client — BOM UTF-8 để Excel mở đúng tiếng Việt.
 */
export function downloadCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
 const header = columns.map((c) => escapeCsvCell(c.header)).join(",")
 const body = rows
 .map((row) =>
 columns.map((c) => escapeCsvCell(String(c.value(row) ?? ""))).join(","),
 )
 .join("\n")

 const blob = new Blob([`\uFEFF${header}\n${body}`], {
 type: "text/csv;charset=utf-8;",
 })
 const url = URL.createObjectURL(blob)
 const link = document.createElement("a")
 link.href = url
 link.download = filename
 link.click()
 URL.revokeObjectURL(url)
}

type PaginatedQuery = {
 page?: number
 limit?: number
}

/**
 * Gom toàn bộ trang từ API admin (limit tối đa 100/request).
 */
export async function fetchAllPaginated<T, Q extends PaginatedQuery>(
 fetcher: (query: Q) => Promise<PaginatedResponse<T>>,
 baseQuery: Omit<Q, "page" | "limit">,
 pageSize = 100,
): Promise<T[]> {
 const items: T[] = []
 let page = 1

 do {
 const response = await fetcher({
 ...baseQuery,
 page,
 limit: pageSize,
 } as Q)
 items.push(...response.data)
 const hasMore =
 response.pagination?.has_more ??
 (response.pagination
 ? response.pagination.current_page * response.pagination.per_page <
 response.pagination.total
 : false)
 if (!hasMore) break
 page += 1
 } while (true)

 return items
}
