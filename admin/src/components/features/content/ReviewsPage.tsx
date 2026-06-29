
"use client"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useMemo, useState, useCallback } from "react"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import { Badge } from "@/components/ui/Badge"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Combobox } from "@/components/ui/Combobox"
import { showToast } from "@/components/ui/Toast"
import { ImageUploadField } from "@/components/shared/ImageUploadField"
import { TranslationTabs } from "@/components/shared/TranslationTabs"
import { t } from "@/lib/i18n"
import { Star } from "lucide-react"
import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { StatusToggle } from "@/components/shared/StatusToggle"
import { SaveButton } from "@/components/shared/SaveButton"
import { emptyLocaleFields, hydrateLocaleFields, hydrateFromTranslationsOnly, buildApiTranslations, type LocaleFieldsState, type SupportedLocale } from "@/components/shared/locale-fields"
import * as countries from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"
import viLocale from "i18n-iso-countries/langs/vi.json"

countries.registerLocale(enLocale)
countries.registerLocale(viLocale)

import { fetchReviewDetail, createReview, updateReview, deleteReview } from "@/lib/api/content.api"
import { useReviews, useReviewMutations } from "@/hooks/useReviews"
import type { AdminReviewListItem, PaginatedResponse } from "@/types/api"

export function ReviewsPage() {
  
    const qc = useQueryClient()
  
  const tableState = useTableState()
  const { query, setFilter, setParams } = tableState
  
  const [form, setForm] = useState({
    author_name: "",
    country_code: "VN",
    content: "",
    rating: 0,
    avatar_url: "",
    is_active: true,
    is_featured: false,
  })

  const nationalityOptions = useMemo(() => {
    const codes = Object.keys(countries.getAlpha2Codes())
    return codes
      .map((code) => {
        return {
          value: code,
          label: `${countries.getName(code, "vi")} (${code})`,
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
  }, [])

  const filterConfigs = useMemo<any[]>(() => [
      {
        key: "search",
        type: "text",
        placeholder: t("content.searchPlaceholder"),
        width: "260px"
      },
      {
        key: "country_code",
        type: "select",
        placeholder: t("master.colCountry"),
        options: nationalityOptions,
        width: "180px"
      },
      {
        key: "is_active",
        type: "select",
        placeholder: "Trạng thái",
        options: [
          { label: "Hoạt động", value: "true" },
          { label: "Đã ẩn", value: "false" },
        ],
        width: "140px"
      }
    ], [nationalityOptions, t]
  )

  const { data, isLoading } = useReviews(query)
  const [selected, setSelected] = useSelectedRecord<AdminReviewListItem>(data?.data)

    useEffect(() => {
    if (!selected) {
      setForm({
        author_name: "",
        country_code: "VN",
        content: "",
        rating: 0,
        avatar_url: "",
        is_active: true,
        is_featured: false,
      })
      return
    }
    setForm({
      author_name: selected.author_name,
      country_code: selected.country_code,
      content: selected.content,
      rating: selected.rating,
      avatar_url: selected.avatar_url ?? "",
      is_active: selected.is_active,
      is_featured: selected.is_featured,
    })
  }, [selected])

  const isSaveDisabled = useMemo(() => {
    if (!selected) return true;
    return (
      form.author_name === selected.author_name &&
      form.country_code === selected.country_code &&
      form.content === selected.content &&
      form.rating === selected.rating &&
      form.avatar_url === (selected.avatar_url || "") &&
      form.is_active === selected.is_active &&
      form.is_featured === selected.is_featured
    )
  }, [form, selected]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        avatar_url: form.avatar_url || undefined,
      }
      if (selected) return updateReview(selected.id, body)
      return createReview(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] })
      showToast(t("common.saved"), "success")
      setSelected(null)
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] })
      showToast(t("common.deleted"), "success")
      setSelected(null)
    },
    onError: () => showToast(t("common.error"), "error"),
  })


  const columns: ColumnDef<AdminReviewListItem>[] = useMemo(() => [
    {
      id: "sequence_no",
      header: "STT",
      accessorKey: "sequence_no",
      size: 60,
      cell: ({ row }) => {
        return <div className="w-[60px]">{row.original.sequence_no}</div>
      }
    },
    {
      id: "author_name",
      header: t("content.colAuthor"),
      accessorKey: "author_name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.author_name}</div>
      )
    },
    {
      id: "country_code",
      header: t("master.colCountry"),
      accessorKey: "country_code",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <img 
            src={`https://flagcdn.com/w20/${row.original.country_code.toLowerCase()}.png`} 
            alt={row.original.country_code} 
            className="w-5 h-[14px] shadow-sm rounded-[2px] object-cover" 
          />
          <span>{countries.getName(row.original.country_code, "vi") || row.original.country_code}</span>
        </div>
      )
    },
    {
      id: "rating",
      header: t("content.colRating"),
      accessorKey: "rating",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} className={i < row.original.rating ? "text-[#34e0a1] fill-[#34e0a1]" : "text-gray-200"} />
          ))}
        </div>
      )
    },
    {
      id: "is_active",
      header: "Trạng thái",
      accessorKey: "is_active",
      cell: ({ row }) => {
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.original.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {row.original.is_active ? "Hoạt động" : "Đã ẩn"}
          </span>
        )
      }
    },
    {
      id: "created_at",
      header: t("content.colDate"),
      accessorKey: "created_at",
      cell: ({ row }) => (
        <div className="text-gray-500 whitespace-nowrap">
          {format(new Date(row.original.created_at), "dd/MM/yyyy")}
        </div>
      )
    }
  ], [t])


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t("nav.reviews")}</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <AdvancedTable
            columns={columns}
            data={data?.data ?? []}
            tableState={tableState}
            isLoading={isLoading}
            emptyMessage={t("content.empty")}
            pagination={data?.pagination}
            filterConfigs={filterConfigs}
            onRowClick={(row) => {
              setSelected(row)
              setForm({
                author_name: row.author_name,
                country_code: row.country_code,
                content: row.content,
                rating: row.rating,
                avatar_url: row.avatar_url ?? "",
                is_active: row.is_active,
                is_featured: row.is_featured,
              })
            }}
            activeRowPredicate={(row) => row.id === selected?.id}
          />
        </div>
        <div className="hidden lg:block shrink-0 lg:w-[24rem]" />
        <aside
            className="w-full lg:w-[24rem] shrink-0 rounded-xl p-5 flex flex-col z-40 lg:fixed lg:right-6 lg:top-[120px]"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
              height: "calc(100vh - 200px)"
            }}
          >
            <h2 className="font-medium mb-4">{t("master.edit")}</h2>
            
            <fieldset disabled={saveMutation.isPending} className="flex flex-col gap-3 relative flex-1 pr-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium mt-2">{t("content.colAuthor")}</label>
                <Input
                  value={form.author_name}
                  onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
                  placeholder={t("content.colAuthor")}
                  disabled={true}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium mt-2">{t("master.colCountry")}</label>
                <Combobox
                  value={form.country_code}
                  onValueChange={(val) => {
                    setForm((f) => ({ ...f, country_code: val }))
                  }}
                  options={nationalityOptions}
                  placeholder={t("master.colCountry")}
                  disabled={true}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium mt-2">{t("content.colRating")}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={true}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={star <= form.rating ? "w-6 h-6 text-[#34e0a1] fill-[#34e0a1]" : "w-6 h-6 text-gray-300 fill-transparent"}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium mt-2">Trạng thái</label>
                <StatusToggle
                  isActive={form.is_active}
                  onChange={(val) => setForm(f => ({ ...f, is_active: val }))}
                  disabled={!selected}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium mt-2">{t("content.content")}</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder={t("content.content")}
                  rows={5}
                  disabled={true}
                  className="w-full rounded-lg p-3 bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                  style={{ border: "1px solid var(--color-border-strong)" }}
                />
              </div>
            </fieldset>

            <div className="shrink-0 flex gap-2 justify-end mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-default)" }}>
              {selected && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="mr-auto" disabled={saveMutation.isPending}>{t("common.delete") || "Xoá"}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("common.confirmDeleteTitle", "Xác nhận xoá?")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("common.confirmDeleteMessage", "Bạn có chắc chắn muốn xoá bản ghi này không? Hành động này không thể hoàn tác.")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel", "Huỷ")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(selected.id)} className="bg-red-600 hover:bg-red-700 text-white border border-red-600">
                        {t("common.delete", "Xoá")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="outline" onClick={() => setSelected(null)} disabled={saveMutation.isPending}>{t("common.cancel")}</Button>
              <SaveButton onClick={() => saveMutation.mutate()} disabled={isSaveDisabled || saveMutation.isPending} isLoading={saveMutation.isPending} />
            </div>
          </aside>
      </div>
    </div>
  )
}
