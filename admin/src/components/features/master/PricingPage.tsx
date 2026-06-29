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
import { useMasterPricing } from "@/hooks/useMasterPricing"
import type { AdminPricingRuleListItem } from "@/types/api"
import type { FilterConfig } from "@/components/data-table/AdvancedTable"

export function PricingPage() {
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
  } = useMasterPricing()

  const columns = useMemo<ColumnDef<AdminPricingRuleListItem, unknown>[]>(
    () => {
      const typeMap: Record<string, string> = {
        BASE_FEE: "Phí cơ bản",
        PROCESSING_TIME: "Thời gian xử lý",
        EXTRA_SERVICE: "Dịch vụ thêm",
      }
      return [
        { 
          id: "sequence_no", 
          accessorKey: "sequence_no",
          header: "STT", 
          size: 80, 
          enableSorting: true,
          cell: ({ row }) => {
            const page = Number(tableState.query.page || 1)
            const limit = 20
            return (page - 1) * limit + row.index + 1
          } 
        },
        { id: "rule_type", accessorKey: "rule_type", header: t("master.colType"), size: 200, enableSorting: true, cell: ({ row }) => <span className="font-medium text-gray-700">{typeMap[row.original.rule_type] || row.original.rule_type}</span> },
        { 
          id: "key", 
          accessorKey: "name", 
          header: "Tên Dịch Vụ", 
          size: 400, 
          enableSorting: true, 
          cell: ({ row }) => {
            const friendlyNameMap: Record<string, string> = {
              "PROCESSING_TIME / NORMAL": "Thời gian xử lý: Thường",
              "PROCESSING_TIME / URGENT": "Thời gian xử lý: Khẩn cấp",
              "PROCESSING_TIME / SUPER_URGENT": "Thời gian xử lý: Siêu khẩn cấp",
              "BASE_FEE / 1_MONTH_SINGLE": "Phí cơ bản: 1 tháng (Nhập cảnh 1 lần)",
              "BASE_FEE / 1_MONTH_MULTIPLE": "Phí cơ bản: 1 tháng (Nhập cảnh nhiều lần)",
              "BASE_FEE / 3_MONTH_SINGLE": "Phí cơ bản: 3 tháng (Nhập cảnh 1 lần)",
              "BASE_FEE / 3_MONTH_MULTIPLE": "Phí cơ bản: 3 tháng (Nhập cảnh nhiều lần)",
              "VIP_FAST_TRACK": "Đón khách VIP",
              "EXTRA_SERVICE / VIP_FAST_TRACK": "Dịch vụ thêm: Đón khách VIP"
            };
            const display = row.original.name === row.original.key && friendlyNameMap[row.original.key] 
              ? friendlyNameMap[row.original.key] 
              : row.original.name;
            return <span className="font-medium">{display}</span>
          }
        },
        { id: "price", accessorKey: "price", header: t("master.colPrice"), meta: { align: "right" }, size: 150, enableSorting: true, cell: ({ row }) => `$${row.original.price}` },
        {
          id: "is_active",
          accessorKey: "is_active",
          header: t("content.colStatus"),
          size: 150,
          meta: { align: "right" },
          enableSorting: true,
          cell: ({ row }) => (row.original.is_active ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="destructive">Đã ẩn</Badge>),
        },
      ]
    },
    [tableState.query.page, t],
  )

  const isSaveDisabled = useMemo(() => {
    if (selected) {
      return form.price === selected.price && form.is_active === selected.is_active;
    } else {
      return !form.name;
    }
  }, [selected, form])

  const filterConfigs: FilterConfig[] = [
    {
      key: "search",
      type: "text",
      placeholder: "Tìm kiếm...",
      width: "260px"
    },
    {
      key: "rule_type",
      type: "select",
      placeholder: "Tất cả loại",
      options: [
        { label: "Phí Cơ Bản", value: "BASE_FEE" },
        { label: "Thời Gian Xử Lý", value: "PROCESSING_TIME" },
        { label: "Dịch Vụ Thêm", value: "EXTRA_SERVICE" }
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
    <MasterShell titleKey="nav.pricing">
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
              setForm({ price: row.price, is_active: row.is_active, key: row.key, rule_type: row.rule_type, name: row.name })
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
              setForm({ price: 0, is_active: true, key: "", rule_type: "BASE_FEE", name: "" })
            }
          }}
          onSave={() => saveMutation.mutate()} 
          onDelete={selected ? () => deleteMutation.mutate() : undefined}
          onClose={() => {
            setSelected(null)
            setForm({ price: 0, is_active: true, key: "", rule_type: "BASE_FEE", name: "" })
          }} 
          isSaveDisabled={isSaveDisabled}
          isSaving={saveMutation.isPending}
        >
          <div className="flex flex-col gap-2">
            {!selected ? (
              <>
                <label className="text-sm font-medium mt-2">Tên Dịch Vụ</label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Ví dụ: Dịch vụ VIP" />
                <label className="text-sm font-medium mt-2">Loại Dịch Vụ</label>
                <select value={form.rule_type} onChange={e => setForm(f => ({...f, rule_type: e.target.value}))} className="rounded-lg px-3 py-2 min-h-11 w-full" style={{ border: "1px solid var(--color-border-strong)", background: "transparent" }}>
                  <option value="BASE_FEE">Phí Cơ Bản</option>
                  <option value="PROCESSING_TIME">Thời Gian Xử Lý</option>
                  <option value="EXTRA_SERVICE">Dịch Vụ Thêm</option>
                </select>
              </>
            ) : (
              <>
                <p className="text-base font-semibold" style={{ color: "var(--color-text-strong)" }}>{selected.name === selected.key && selected.key === "VIP_FAST_TRACK" ? "Đón khách VIP" : (selected.name || selected.key)}</p>
                <p className="text-base mb-4" style={{ color: "var(--color-text-muted)" }}>
                  {(() => {
                    const typeMap: Record<string, string> = {
                      BASE_FEE: "Phí cơ bản",
                      PROCESSING_TIME: "Thời gian xử lý",
                      EXTRA_SERVICE: "Dịch vụ thêm",
                    }
                    const keyMap: Record<string, string> = {
                      NORMAL: "Tiêu chuẩn",
                      URGENT: "Khẩn cấp",
                      SUPER_URGENT: "Siêu khẩn cấp",
                      PREMIUM: "Cao cấp",
                      E_VISA_30_DAYS_SINGLE: "30 Ngày Nhập Cảnh 1 Lần",
                      E_VISA_90_DAYS_SINGLE: "90 Ngày Nhập Cảnh 1 Lần",
                      E_VISA_90_DAYS_MULTIPLE: "90 Ngày Nhập Cảnh Nhiều Lần",
                      VOA_1_MONTH_SINGLE: "1 Tháng Nhập Cảnh 1 Lần",
                      VOA_1_MONTH_MULTIPLE: "1 Tháng Nhập Cảnh Nhiều Lần",
                      VOA_3_MONTHS_SINGLE: "3 Tháng Nhập Cảnh 1 Lần",
                      VOA_3_MONTHS_MULTIPLE: "3 Tháng Nhập Cảnh Nhiều Lần",
                      URGENT_4WD_30: "Khẩn (4 Ngày)",
                      URGENT_4WD_90: "Khẩn (4 Ngày)",
                      URGENT_2WD_30: "Rất khẩn (2 Ngày)",
                      URGENT_2WD_90: "Rất khẩn (2 Ngày)",
                      URGENT_1WD: "Hỏa tốc (1 Ngày)",
                      URGENT_4WH: "Hỏa tốc 4 Giờ",
                      URGENT_2WH: "Hỏa tốc 2 Giờ",
                      LAST_MINUTE_HOLIDAY: "Cấp bách / Ngày lễ",
                      VIP_FAST_TRACK: "Đón khách VIP"
                    }
                    return `${typeMap[selected.rule_type] || selected.rule_type} / ${keyMap[selected.key] || selected.key}`
                  })()}
                </p>
              </>
            )}
            
            <label className="text-sm font-medium mt-4 block">Giá tiền ($)</label>
            <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} placeholder={t("master.colPrice")} />
            
            <div className="flex items-center gap-2 min-h-11 cursor-pointer mt-4">
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
