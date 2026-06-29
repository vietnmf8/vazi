import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useMemo, useCallback, useState, useEffect } from "react"
import type { SortingState } from "@tanstack/react-table"

import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { 
  fetchNationalities, 
  fetchNationalityDetail, 
  createNationality, 
  updateNationality, 
  deleteNationality 
} from "@/lib/api/master.api"
import { triggerUiRevalidate } from "@/lib/actions/revalidate"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"

import { 
  emptyLocaleFields, 
  hydrateLocaleFields, 
  buildApiTranslations,
  type LocaleFieldsState,
  type SupportedLocale
} from "@/components/shared/locale-fields"
import type { AdminNationalityListItem } from "@/types/api"

export const NATIONALITY_LOCALE_KEYS = ["country_name"] as const

export function useMasterNationalities() {
  const qc = useQueryClient()
  const { query, setFilter, setParams } = useTableState({ group: "", sort_id: "country_name", sort_desc: "false" })
  
  const search = query.search || ""
  const setSearch = (v: string) => setFilter("search", v)
  const setPage = (p: number) => setFilter("page", p.toString())
  const groupFilter = query.group || ""

  const sorting = useMemo<SortingState>(() => {
    return [{ id: query.sort_id || "country_name", desc: query.sort_desc === "true" }]
  }, [query.sort_id, query.sort_desc])

  const setSorting = useCallback((updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue
    if (newSorting.length > 0) {
      setParams({ sort_id: newSorting[0].id, sort_desc: newSorting[0].desc ? "true" : "false" })
    } else {
      setParams({ sort_id: "country_name", sort_desc: "false" })
    }
  }, [sorting, setParams])

  const sortString = useMemo(() => {
    if (!sorting.length) return undefined
    const { id, desc } = sorting[0]
    let apiSort = id
    if (id === "country_name") apiSort = "countryName"
    if (id === "country_code") apiSort = "countryCode"
    if (id === "exemption_days") apiSort = "exemptionDays"
    if (id === "group") apiSort = "group"
    if (id === "sequence_no") apiSort = "sequenceNo"
    return desc ? `-${apiSort}` : apiSort
  }, [sorting])

  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(groupFilter ? { group: groupFilter } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(sortString ? { sort: sortString } : {})
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["nationalities", apiQuery],
    queryFn: () => fetchNationalities(apiQuery),
    placeholderData: keepPreviousData,
  })

  const { data: allData } = useQuery({
    queryKey: ["nationalities", "all"],
    queryFn: () => fetchNationalities({ limit: 500 }),
  })

  const existingCodes = useMemo(() => allData?.data.map((d) => d.country_code.toLowerCase()) || [], [allData])

  const [selected, setSelected] = useSelectedRecord<AdminNationalityListItem>(data?.data)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>("vi")
  
  const [localeFields, setLocaleFields] = useState<LocaleFieldsState>(() =>
    emptyLocaleFields([...NATIONALITY_LOCALE_KEYS])
  )
  const [form, setForm] = useState({
    country_code: "",
    exemption_days: 0,
    group: "NORMAL",
  })

  useEffect(() => {
    if (!selected) {
      setLocaleFields(emptyLocaleFields([...NATIONALITY_LOCALE_KEYS]))
      setForm({ country_code: "", exemption_days: 0, group: "NORMAL" })
      return
    }

    setLoadingDetail(true)
    void fetchNationalityDetail(selected.id)
      .then((detail) => {
        setForm({
          country_code: detail.country_code,
          exemption_days: detail.exemption_days,
          group: detail.group,
        })
        setLocaleFields(
          hydrateLocaleFields(
            [...NATIONALITY_LOCALE_KEYS],
            { country_name: detail.country_name },
            detail.translations,
          )
        )
      })
      .catch(() => showToast(t("common.error"), "error"))
      .finally(() => setLoadingDetail(false))
  }, [selected])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const viName = localeFields.vi.country_name
      const body = {
        country_name: viName,
        country_code: form.country_code,
        exemption_days: form.exemption_days,
        group: form.group,
        translations: buildApiTranslations(localeFields, [...NATIONALITY_LOCALE_KEYS]) as Array<{
          language_code: string
          country_name: string
        }>,
      }
      if (selected) return updateNationality(selected.id, body)
      return createNationality(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nationalities"] })
      showToast(t("common.saved"), "success")
      setSelected(null)
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      return deleteNationality(selected.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nationalities"] })
      showToast(t("common.deleted") || "Đã xoá", "success")
      setSelected(null)
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  function handleLocaleFieldChange(key: string, value: string) {
    setLocaleFields((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], [key]: value },
    }))
  }

  const isSaveDisabled = useMemo(() => {
    if (!selected) { return !form.country_code; }
    const isBaseChanged = form.country_code !== selected.country_code || form.exemption_days !== selected.exemption_days || form.group !== selected.group;
    const isViChanged = localeFields.vi.country_name !== selected.country_name;
    return !isBaseChanged && !isViChanged;
  }, [selected, form, localeFields])

  return {
    data,
    isLoading: isLoading || isFetching,
    existingCodes,
    selected,
    setSelected,
    loadingDetail,
    setLoadingDetail,
    activeLocale,
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
  }
}
