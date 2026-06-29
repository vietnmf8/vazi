"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { downloadCsv, fetchAllPaginated, type CsvColumn } from "@/lib/csv-export"
import { t } from "@/lib/i18n"
import type { PaginatedResponse } from "@/types/api"

type PaginatedQuery = {
 page?: number
 limit?: number
}

type ExportCsvButtonProps<T, Q extends PaginatedQuery> = {
 filenameKey: string
 fetchAll: (query: Omit<Q, "page" | "limit">) => Promise<PaginatedResponse<T>>
 query: Omit<Q, "page" | "limit">
 columns: CsvColumn<T>[]
 variant?: "default" | "outline" | "ghost"
}

/**
 * Nút xuất CSV — fetch toàn bộ trang theo filter hiện tại rồi tải file.
 */
export function ExportCsvButton<T, Q extends PaginatedQuery>({
 filenameKey,
 fetchAll,
 query,
 columns,
 variant = "outline",
}: ExportCsvButtonProps<T, Q>) {
 const [exporting, setExporting] = useState(false)

 const handleExport = useCallback(async () => {
 setExporting(true)
 try {
 const rows = await fetchAllPaginated(
 (q) => fetchAll(q),
 query,
 )
 if (!rows.length) {
 showToast(t("common.exportEmpty"), "error")
 return
 }
 const date = new Date().toISOString().slice(0, 10)
 downloadCsv(rows, columns, `${t(filenameKey)}-${date}.csv`)
 showToast(t("common.exportDone"), "success")
 } catch {
 showToast(t("common.error"), "error")
 } finally {
 setExporting(false)
 }
 }, [columns, fetchAll, filenameKey, query])

 return (
 <Button
 type="button"
 variant={variant}
 onClick={handleExport}
 disabled={exporting}
 aria-label={t("common.exportCsv")}
 >
 {exporting ? t("common.exporting") : t("common.exportCsv")}
 </Button>
 )
}
