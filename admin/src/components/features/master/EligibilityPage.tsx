"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import * as countries from "i18n-iso-countries"

import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { t } from "@/lib/i18n"
import { useMasterEligibility } from "@/hooks/useMasterEligibility"
import type { AdminEligibilityRuleListItem } from "@/types/api"

// Ensure locales are loaded
import enLocale from "i18n-iso-countries/langs/en.json"
import viLocale from "i18n-iso-countries/langs/vi.json"
countries.registerLocale(enLocale)
countries.registerLocale(viLocale)

export function EligibilityPage() {
  const {
    search,
    setSearch,
    setPage,
    data,
    isLoading,
    selected,
    setSelected,
    toggleMutation,
  } = useMasterEligibility()

  const columns = useMemo<ColumnDef<AdminEligibilityRuleListItem, unknown>[]>(
    () => [
      {
        accessorKey: "country_code",
        header: t("master.colCode"),
        cell: ({ row }) => {
          const code = row.original.country_code
          return (
            <div className="flex items-center gap-2">
              <img
                src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                alt={`${code} flag`}
                className="w-5 h-auto rounded-sm object-cover"
                loading="lazy"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
              <span>{countries.getName(code, "vi") || code}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "is_active",
        header: t("content.colStatus"),
        cell: ({ row }) => (row.original.is_active ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="destructive">Ngừng hỗ trợ</Badge>),
      },
    ],
    []
  )

  return (
    <MasterShell titleKey="nav.eligibility" search={search} setSearch={setSearch}>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <DataTable 
            columns={columns} 
            data={data?.data ?? []} 
            isLoading={isLoading} 
            emptyMessage={t("master.empty")} 
            pagination={data?.pagination} 
            onPageChange={setPage} 
            onRowClick={setSelected}
            activeRowPredicate={(row) => row.id === selected?.id}
          />
        </div>
        <EditPanel 
          title={t("master.edit")} 
          isEditMode={!!selected}
          onSave={() => toggleMutation.mutate()} 
          onClose={() => setSelected(null)}
          isSaving={toggleMutation.isPending}
        >
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={`https://flagcdn.com/w20/${selected.country_code.toLowerCase()}.png`}
                  alt={`${selected.country_code} flag`}
                  className="w-8 h-auto rounded-sm object-cover"
                />
                <p className="text-lg font-semibold">{countries.getName(selected.country_code, "vi") || selected.country_code}</p>
              </div>
              <p className="text-gray-600">
                Trạng thái hiện tại: {selected.is_active ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="destructive">Ngừng hỗ trợ</Badge>}
              </p>
              <Button onClick={() => toggleMutation.mutate()} variant={selected.is_active ? "destructive" : "default"}>
                {selected.is_active ? "Chuyển sang Ngừng hỗ trợ" : "Chuyển sang Hoạt động"}
              </Button>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Vui lòng chọn một quốc gia để chỉnh sửa</p>
          )}
        </EditPanel>
      </div>
    </MasterShell>
  )
}
