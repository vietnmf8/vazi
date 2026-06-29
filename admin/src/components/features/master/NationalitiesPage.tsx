"use client"

import { useMemo } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Star } from "lucide-react"

import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Combobox } from "@/components/ui/Combobox"
import { t } from "@/lib/i18n"
import { useMasterNationalities, NATIONALITY_LOCALE_KEYS } from "@/hooks/useMasterNationalities"
import { emptyLocaleFields } from "@/components/shared/locale-fields"
import * as countries from "i18n-iso-countries"
import type { AdminNationalityListItem } from "@/types/api"

// Ensure locales are loaded
import enLocale from "i18n-iso-countries/langs/en.json"
import viLocale from "i18n-iso-countries/langs/vi.json"
countries.registerLocale(enLocale)
countries.registerLocale(viLocale)

export function NationalitiesPage() {
  const {
    data,
    isLoading,
    existingCodes,
    selected,
    setSelected,
    loadingDetail,
    setLoadingDetail,
    setActiveLocale,
    localeFields,
    setLocaleFields,
    form,
    setForm,
    saveMutation,
    deleteMutation,
    handleLocaleFieldChange,
    isSaveDisabled,
    search,
    setSearch,
    setPage,
    groupFilter,
    setFilter,
    sorting,
    setSorting,
  } = useMasterNationalities()

  const columns = useMemo<ColumnDef<AdminNationalityListItem, unknown>[]>(
    () => [
      {
        accessorKey: "sequence_no",
        header: "STT",
        enableSorting: true,
        sortDescFirst: true,
      },
      { accessorKey: "country_code", header: t("master.colCode") },
      { 
        id: "country_name",
        accessorFn: (row) => row.country_name,
        header: t("master.colCountry"),
        size: 300,
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
            <span>{row.original.country_name}</span>
          </div>
        ),
      },
      {
        id: "group",
        accessorKey: "group",
        header: "Nhóm",
        cell: ({ row }) => {
          const group = row.original.group
          const badgeClass = "w-28 flex justify-center"
          if (group === "POPULAR") return <Badge variant="default" className={`bg-purple-500 hover:bg-purple-600 text-white border-transparent relative overflow-visible ${badgeClass}`}>Tiêu biểu <Star className="absolute -top-1.5 -right-1.5 size-3.5 text-yellow-400 fill-yellow-400" /></Badge>
          if (group === "GOOD") return <Badge variant="success" className={badgeClass}>Hỗ trợ tốt</Badge>
          if (group === "NORMAL") return <Badge variant="warning" className={badgeClass}>Bán hỗ trợ</Badge>
          if (group === "BLACKLIST") return <Badge variant="destructive" className={badgeClass}>Không hỗ trợ</Badge>
          return <Badge className={badgeClass}>{group}</Badge>
        },
      },
    ],
    []
  )

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

  return (
    <MasterShell
      titleKey="nav.nationalities"
      search={search}
      setSearch={setSearch}
      filterNode={
        <select value={groupFilter} onChange={(e) => setFilter("group", e.target.value)} className="rounded-lg px-3 py-2 min-h-11" style={{ border: "1px solid var(--color-border-strong)", background: "transparent" }}>
          <option value="">Tất cả nhóm</option>
          <option value="POPULAR">Tiêu biểu</option>
          <option value="GOOD">Hỗ trợ tốt</option>
          <option value="NORMAL">Bán hỗ trợ</option>
          <option value="BLACKLIST">Không hỗ trợ</option>
        </select>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyMessage={t("master.empty")}
          pagination={data?.pagination}
          onPageChange={setPage}
          onRowClick={(row) => {
            setSelected(row)
            setLoadingDetail(true)
            setActiveLocale("vi")
          }}
          activeRowPredicate={(row) => row.id === selected?.id}
          manualSorting={true}
          sorting={sorting}
          onSortingChange={setSorting}
        />
        <EditPanel
          title={selected ? t("master.edit") : t("master.create")}
          isEditMode={!!selected}
          onTabChange={(val) => {
            if (val === "create") {
              setSelected(null)
              setForm({ country_code: "", exemption_days: 0, group: "NORMAL" })
              setLocaleFields(emptyLocaleFields([...NATIONALITY_LOCALE_KEYS]))
            }
          }}
          onSave={() => saveMutation.mutate()}
          onDelete={selected ? () => deleteMutation.mutate() : undefined}
          onClose={() => setSelected(null)}
          isSaveDisabled={isSaveDisabled}
          isLoading={loadingDetail}
          isSaving={saveMutation.isPending}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium mt-2">Mã Quốc Gia</label>
            <Combobox
              value={form.country_code}
              onValueChange={(val) => {
                setForm((f) => ({ ...f, country_code: val }))
                handleLocaleFieldChange("country_name", countries.getName(val, "vi") || "")
              }}
              options={nationalityOptions}
              placeholder={t("master.colCode")}
              disabled={!!selected}
            />
          </div>
          <label className="text-sm font-medium mt-2">Tên Tiếng Việt (Có thể ghi đè)</label>
          <Input
            value={localeFields.vi.country_name || ""}
            onChange={(e) => handleLocaleFieldChange("country_name", e.target.value)}
            placeholder="Ví dụ: Việt Nam"
          />
          <select
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            className="rounded-lg px-3 py-2 min-h-11 w-full"
            style={{ border: "1px solid var(--color-border-strong)", background: "transparent" }}
          >
            <option value="POPULAR">Tiêu biểu</option>
            <option value="GOOD">Hỗ trợ tốt</option>
            <option value="NORMAL">Bán hỗ trợ</option>
            <option value="BLACKLIST">Không hỗ trợ</option>
          </select>
        </EditPanel>
      </div>
    </MasterShell>
  )
}
