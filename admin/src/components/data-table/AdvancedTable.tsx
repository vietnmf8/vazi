"use client"

import { DataTable } from "@/components/data-table/DataTable"
import { FilterBar, type FilterConfig } from "./FilterBar"
import type { ColumnDef } from "@tanstack/react-table"
import type { PaginationMeta } from "@/types/api"
import type { TableState } from "@/hooks/useTableState"

export type { FilterConfig }

export type AdvancedTableProps<TData, TValue = unknown> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  tableState: TableState
  isLoading?: boolean
  emptyMessage?: string
  pagination?: PaginationMeta
  filterConfigs?: FilterConfig[]
  exportConfig?: {
    filenameKey: string
    fetchAll: (query: any) => Promise<any>
    query: Record<string, any>
    columns: { header: string; value: (row: any) => any }[]
  }
  onRowClick?: (row: TData) => void
  manualSorting?: boolean
  activeRowPredicate?: (row: TData) => boolean
  getRowId?: (row: TData) => string
}

export function AdvancedTable<TData, TValue>({
  columns,
  data,
  tableState,
  isLoading,
  emptyMessage,
  pagination,
  filterConfigs,
  exportConfig,
  onRowClick,
  manualSorting = true,
  activeRowPredicate,
  getRowId,
}: AdvancedTableProps<TData, TValue>) {
  const { query, setParams } = tableState

  // Parsing sorting from state: sort_by and sort_dir
  const sorting = query.sort_by ? [{
    id: query.sort_by as string,
    desc: query.sort_dir === "desc"
  }] : []

  const handleSortingChange = (updaterOrValue: any) => {
    let newSorting = []
    if (typeof updaterOrValue === "function") {
      newSorting = updaterOrValue(sorting)
    } else {
      newSorting = updaterOrValue
    }

    if (newSorting.length > 0) {
      setParams({
        sort_by: newSorting[0].id,
        sort_dir: newSorting[0].desc ? "desc" : "asc",
        page: "1" // Reset page on sort
      })
    } else {
      setParams({ sort_by: undefined, sort_dir: undefined, page: "1" })
    }
  }

  const handlePageChange = (newPage: number) => {
    setParams({ page: newPage.toString() })
  }

  return (
    <div className="w-full flex flex-col">
      {((filterConfigs && filterConfigs.length > 0) || exportConfig) && (
        <FilterBar configs={filterConfigs || []} exportConfig={exportConfig} tableState={tableState} />
      )}
      
      <DataTable
        columns={columns as any}
        data={data}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        pagination={pagination}
        onPageChange={handlePageChange}
        onRowClick={onRowClick}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        manualSorting={manualSorting}
        activeRowPredicate={activeRowPredicate}
        getRowId={getRowId}
      />
    </div>
  )
}
