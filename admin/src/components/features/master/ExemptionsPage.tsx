"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import * as countries from "i18n-iso-countries"

import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Switch } from "@/components/ui/switch"
import { Combobox } from "@/components/ui/Combobox"
import { t } from "@/lib/i18n"
import { useMasterExemptions } from "@/hooks/useMasterExemptions"
import type { AdminExemptionCountryListItem } from "@/types/api"
import type { FilterConfig } from "@/components/data-table/AdvancedTable"

// Ensure locales are loaded
import enLocale from "i18n-iso-countries/langs/en.json"
import viLocale from "i18n-iso-countries/langs/vi.json"
countries.registerLocale(enLocale)
countries.registerLocale(viLocale)

export function ExemptionsPage() {
  const {
    tableState,
    data,
    isLoading,
    isFetching,
    existingCodes,
    selected,
    setSelected,
    form,
    setForm,
    saveMutation,
    deleteMutation,
    isSaveDisabled,
  } = useMasterExemptions()

  const nationalityOptions = useMemo(() => {
    const codes = Object.keys(countries.getAlpha2Codes())
    return codes
      .map((code) => {
        const isExisting = existingCodes.includes(code.toLowerCase())
        return {
          value: code,
          label: `${countries.getName(code, "vi")} (${code})`,
          disabled: isExisting,
          icon: (
            <img
              src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
              alt={`${code} flag`}
              className="w-5 h-auto rounded-sm object-cover"
              loading="lazy"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
          ),
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [existingCodes])

  const columns = useMemo<ColumnDef<AdminExemptionCountryListItem, unknown>[]>(
    () => [
      { accessorKey: "sequence_no", header: "STT", size: 80, enableSorting: true },
      {
        accessorKey: "country_code",
        header: t("master.colCountry") || "Quốc gia",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-[280px]">
            <img
              src={`https://flagcdn.com/w20/${row.original.country_code.toLowerCase()}.png`}
              alt={`${row.original.country_code} flag`}
              className="w-5 h-auto rounded-sm object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span>{countries.getName(row.original.country_code, "vi")}</span>
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: t("content.colStatus"),
        enableSorting: true,
        size: 160,
        cell: ({ row }) => (row.original.is_active ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="destructive">Đã ẩn</Badge>),
      },
    ],
    [],
  )

  const filterConfigs: FilterConfig[] = [
    {
      key: "search",
      type: "text",
      placeholder: "Tìm kiếm mã quốc gia...",
      width: "260px"
    },
    {
      key: "is_active",
      type: "select",
      placeholder: "Trạng thái",
      options: [
        { label: "Hoạt động", value: "true" },
        { label: "Đã ẩn", value: "false" }
      ],
      width: "160px"
    }
  ]

  return (
    <MasterShell titleKey="nav.exemptions">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <AdvancedTable 
            columns={columns} 
            data={data?.data ?? []} 
            tableState={tableState}
            isLoading={isLoading || isFetching} 
            emptyMessage={t("master.empty")} 
            pagination={data?.pagination} 
            filterConfigs={filterConfigs}
            onRowClick={(row) => {
              setSelected(row)
              setForm({ country_code: row.country_code.toUpperCase(), exemption_days: row.exemption_days, is_active: row.is_active })
            }} 
            activeRowPredicate={(row) => row.id === selected?.id}
          />
        </div>
        <EditPanel 
          title={selected ? t("master.edit") : t("master.create")} 
          isEditMode={!!selected}
          onTabChange={(val) => {
            if (val === "create") {
              setSelected(null)
              setForm({ country_code: "", exemption_days: 0, is_active: true })
            }
          }}
          onSave={() => saveMutation.mutate()} 
          onDelete={selected ? () => deleteMutation.mutate() : undefined} 
          onClose={() => {
            setSelected(null)
            setForm({ country_code: "", exemption_days: 0, is_active: true })
          }}
          isSaveDisabled={isSaveDisabled}
          isSaving={saveMutation.isPending}
        >
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mã Quốc Gia</label>
              <Combobox
                value={form.country_code}
                onValueChange={(val) => {
                  setForm((f) => ({ ...f, country_code: val.toUpperCase() }))
                }}
                options={nationalityOptions}
                placeholder="VD: VN, US"
                disabled={!!selected}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Số ngày miễn thị thực</label>
              <Input 
                type="number" 
                value={form.exemption_days} 
                onChange={(e) => setForm((f) => ({ ...f, exemption_days: Number(e.target.value) }))} 
                placeholder={t("master.colDays")} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <div className="flex items-center gap-2 min-h-11 cursor-pointer mt-1">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm((m) => ({ ...m, is_active: val }))}
                />
                <span className="font-medium text-sm text-gray-700" onClick={() => setForm((m) => ({ ...m, is_active: !m.is_active }))}>
                  {form.is_active ? "Hoạt động" : "Đã ẩn"}
                </span>
              </div>
            </div>
          </div>
        </EditPanel>
      </div>
    </MasterShell>
  )
}
