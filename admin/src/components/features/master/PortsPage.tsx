"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Switch } from "@/components/ui/switch"
import { t } from "@/lib/i18n"
import { useMasterPorts } from "@/hooks/useMasterPorts"
import type { AdminPortListItem } from "@/types/api"
import type { FilterConfig } from "@/components/data-table/AdvancedTable"

export function PortsPage() {
  const {
    tableState,
    data,
    isLoading,
    isFetching,
    selected,
    setSelected,
    form,
    setForm,
    saveMutation,
    deleteMutation,
  } = useMasterPorts()

  const columns = useMemo<ColumnDef<AdminPortListItem, unknown>[]>(
    () => [
      { accessorKey: "sequence_no", header: "STT", size: 80, enableSorting: true },
      { accessorKey: "code", header: t("master.colCode"), enableSorting: true },
      { accessorKey: "name", header: t("master.colName"), enableSorting: true },
      { 
        accessorKey: "entry_type", 
        header: t("master.colEntryType"), 
        enableSorting: true,
        cell: ({ row }) => {
          const map: Record<string, string> = {
            "AIRPORT": "Sân bay",
            "BORDER_GATE": "Cửa khẩu đường bộ",
            "SEAPORT": "Cảng biển"
          };
          return map[row.original.entry_type] || row.original.entry_type;
        }
      },
      {
        accessorKey: "is_active",
        header: t("content.colStatus"),
        enableSorting: true,
        cell: ({ row }) => (row.original.is_active ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="destructive">Đã ẩn</Badge>),
      },
    ],
    [],
  )

  const isSaveDisabled = useMemo(() => {
    if (!selected) return !form.code || !form.name;
    return form.code === selected.code && form.name === selected.name && form.entry_type === selected.entry_type && form.is_active === selected.is_active;
  }, [selected, form])

  const filterConfigs: FilterConfig[] = [
    {
      key: "search",
      type: "text",
      placeholder: "Tìm kiếm mã/tên...",
      width: "260px"
    },
    {
      key: "entry_type",
      type: "select",
      placeholder: "Tất cả loại",
      options: [
        { label: "Sân bay", value: "AIRPORT" },
        { label: "Cửa khẩu đường bộ", value: "BORDER_GATE" },
        { label: "Cảng biển", value: "SEAPORT" }
      ],
      width: "190px"
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
    <MasterShell titleKey="nav.ports">
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
              setForm({ code: row.code, name: row.name, entry_type: row.entry_type, is_active: row.is_active })
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
              setForm({ code: "", name: "", entry_type: "AIRPORT", is_active: true })
            }
          }}
          onSave={() => saveMutation.mutate()} 
          onDelete={selected ? () => deleteMutation.mutate() : undefined}
          onClose={() => {
            setSelected(null)
            setForm({ code: "", name: "", entry_type: "AIRPORT", is_active: true })
          }} 
          isSaveDisabled={isSaveDisabled}
          isSaving={saveMutation.isPending}
        >
          <div className="flex flex-col gap-2">
            <Input disabled={!!selected} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder={t("master.colCode")} />
            <Input 
              value={form.name} 
              onChange={(e) => {
                const val = e.target.value;
                setForm(f => {
                   if (!selected) {
                       const code = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
                       return { ...f, name: val, code };
                   }
                   return { ...f, name: val };
                });
              }} 
              placeholder={t("master.colName")} 
            />
            <select value={form.entry_type} onChange={(e) => setForm((f) => ({ ...f, entry_type: e.target.value }))} className="rounded-lg px-3 py-2 min-h-11 w-full" style={{ border: "1px solid var(--color-border-strong)" }}>
              <option value="AIRPORT">Sân bay</option>
              <option value="BORDER_GATE">Cửa khẩu đường bộ</option>
              <option value="SEAPORT">Cảng biển</option>
            </select>
            
            <div className="flex items-center gap-2 min-h-11 cursor-pointer mt-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(val) => setForm((m) => ({ ...m, is_active: val }))}
              />
              <span className="font-medium text-sm text-gray-700" onClick={() => setForm((m) => ({ ...m, is_active: !m.is_active }))}>
                {form.is_active ? "Hoạt động" : "Đã ẩn"}
              </span>
            </div>
          </div>
        </EditPanel>
      </div>
    </MasterShell>
  )
}
