
"use client"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useMemo, useState, useCallback } from "react"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/data-table/DataTable"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { TranslationTabs } from "@/components/shared/TranslationTabs"
import { ImageUploadField } from "@/components/shared/ImageUploadField"
import { Combobox } from "@/components/ui/Combobox"
import { t } from "@/lib/i18n"
import { fetchArticleDetail } from "@/lib/api/articles.api"
import { useArticleMutations, useArticles } from "@/hooks/useArticles"
import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { buildAllLocaleTranslations, buildApiTranslations, emptyLocaleFields, hydrateLocaleFields, hydrateFromTranslationsOnly, type LocaleFieldsState, type SupportedLocale } from "@/components/shared/locale-fields"
import type { AdminArticleListItem, PaginatedResponse } from "@/types/api"
const ARTICLE_LOCALE_KEYS = ["title", "subtitle", "content"] as const;
type ArticlePageProps = {
  path: "articles" | "guidelines"
  titleKey: string
  defaultType: string
}

export function ArticleListPage({ path, titleKey, defaultType }: ArticlePageProps) {
  
    const isGuideline = path === "guidelines"
  const { query, setParams } = useTableState({ page: "1", search: "" })
  const page = Number(query.page) || 1
  const search = query.search || ""
  const setPage = (p: number) => setParams({ page: String(p) })
  const setSearch = (s: string) => setParams({ search: s })
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>("vi")
  const [localeFields, setLocaleFields] = useState<LocaleFieldsState>(() => emptyLocaleFields([...ARTICLE_LOCALE_KEYS]))
  const [meta, setMeta] = useState({
    slug: "",
    category: isGuideline ? "step" : "",
    display_order: 0,
    image_url: "",
  })

  const { update, create, remove } = useArticleMutations(path)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useArticles(path, {
    page,
    limit: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  })

  const [selected, setSelected] = useSelectedRecord<AdminArticleListItem>(data?.data)



      useEffect(() => {
    if (!selected) {
      setLocaleFields(emptyLocaleFields([...ARTICLE_LOCALE_KEYS]))
      setMeta({
        slug: "",
        category: isGuideline ? "step" : "",
        display_order: 0,
        image_url: "",
      })
      return
    }

    setLoadingDetail(true)
    void fetchArticleDetail(path, selected.id)
      .then((detail) => {
        setMeta({
          slug: detail.slug,
          category: detail.category ?? (isGuideline ? "step" : ""),
          display_order: detail.display_order,
          image_url: detail.image_url ?? "",
        })
        setLocaleFields(
          hydrateLocaleFields(
            [...ARTICLE_LOCALE_KEYS],
            {
              title: detail.title,
              subtitle: detail.subtitle,
              content: detail.content,
            },
            detail.translations,
          ),
        )
      })
      .catch(() => showToast(t("common.error"), "error"))
      .finally(() => setLoadingDetail(false))
  }, [selected, path, isGuideline])

  const columns = useMemo<ColumnDef<AdminArticleListItem, unknown>[]>(
    () => [
      { accessorKey: "title", header: t("content.colTitle") },
      { accessorKey: "slug", header: t("content.colSlug") },
      { accessorKey: "category", header: t("content.colCategory") },
 ...(isGuideline
 ? [{ accessorKey: "display_order", header: t("content.colOrder") } satisfies ColumnDef<AdminArticleListItem, unknown>]
 : []),
 {
 accessorKey: "created_at",
 header: t("content.colDate"),
 cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy"),
 },
],
 [isGuideline],
 )

 function handleLocaleFieldChange(key: string, value: string) {
 setLocaleFields((prev) => ({
 ...prev,
 [activeLocale]: { ...prev[activeLocale], [key]: value },
 }))
 }

 async function handleSave() {
 const vi = localeFields.vi
 if (!meta.slug.trim() || !vi.title.trim() || !vi.content.trim()) {
 showToast(t("common.error"), "error")
 return
 }

 const translations = buildApiTranslations(localeFields, [...ARTICLE_LOCALE_KEYS]) as Array<{
 language_code: string
 title: string
 subtitle?: string
 content: string
 }>
 const body = {
 slug: meta.slug,
 title: vi.title,
 subtitle: vi.subtitle || undefined,
 content: vi.content,
 category: meta.category || undefined,
 display_order: meta.display_order,
 image_url: meta.image_url || undefined,
 translations,
 }

 try {
 if (selected) {
 await update.mutateAsync({ id: selected.id, body })
 } else {
 await create.mutateAsync({ ...body, type: defaultType })
 }
 showToast(t("common.saved"), "success")
 setSelected(null)
 } catch {
 showToast(t("common.error"), "error")
 }
 }

 const activeValues = localeFields[activeLocale]

 return (
 <div className="p-6">
 <PageHeader titleKey={titleKey} />
 <div className="flex flex-col lg:flex-row gap-6">
 <div className="flex-1">
 <div className="flex gap-3 mb-4">
 <Input
 placeholder={t("content.searchPlaceholder")}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="max-w-sm"
 />
 <Button
 variant="outline"
 onClick={() => {
 setSelected(null)
 setActiveLocale("vi")
 }}
 >
 {t("content.createArticle")}
 </Button>
 </div>
 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 emptyMessage={t("content.empty")}
 pagination={data?.pagination}
 onPageChange={setPage}
 onRowClick={(row) => {
 setSelected(row)
 setActiveLocale("vi")
 }}
 />
 </div>
 <aside
 className="w-full lg:w-[28rem] shrink-0 rounded-xl p-5 space-y-4"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 }}
 >
 {loadingDetail && selected ? (
 <p>{t("common.loading")}</p>
 ) : (
 <>
 <Input
 placeholder={t("content.colSlug")}
 value={meta.slug}
 onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))}
 />

 {isGuideline && (
 <select
 value={meta.category}
 onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
 className="rounded-lg px-3 py-2 min-h-11 w-full"
 aria-label={t("content.colCategory")}
 style={{ border: "1px solid var(--color-border-strong)" }}
 >
 <option value="step">{t("content.categoryStep")}</option>
 <option value="document">{t("content.categoryDocument")}</option>
 </select>
 )}

 <Input
 type="number"
 placeholder={t("content.colOrder")}
 value={meta.display_order}
 onChange={(e) =>
 setMeta((m) => ({ ...m, display_order: Number(e.target.value) || 0 }))
 }
 />

 {(isGuideline && meta.category === "document") || !isGuideline ? (
 <ImageUploadField
 labelKey="content.colImage"
 value={meta.image_url}
 onChange={(url) => setMeta((m) => ({ ...m, image_url: url }))}
 />
 ) : null}

 <TranslationTabs
 activeLocale={activeLocale}
 onLocaleChange={setActiveLocale}
 fields={[
 { key: "title", labelKey: "content.colTitle" },
 { key: "subtitle", labelKey: "content.colSubtitle" },
 { key: "content", labelKey: "content.content", richText: true },
]}
 values={activeValues}
 onFieldChange={handleLocaleFieldChange}
 />

 <div className="flex gap-2">
 <Button onClick={handleSave}>{t("common.save")}</Button>
 {selected && (
 <Button variant="ghost" onClick={() => remove.mutateAsync(selected.id)}>
 {t("common.delete")}
 </Button>
 )}
 </div>
 </>
 )}
 </aside>
 </div>
 </div>
 )
}

function usePaginatedList<T>(
 key: string,
 fetcher: (q: { page: number; limit: number; search?: string }) => Promise<PaginatedResponse<T>>,
 query: { page: number; search?: string },
) {
 return useQuery({
 queryKey: [key, query],
 queryFn: () => fetcher({ page: query.page, limit: 20, ...(query.search ? { search: query.search } : {}) }),
 })
}
