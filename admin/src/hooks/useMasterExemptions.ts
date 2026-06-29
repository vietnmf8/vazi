import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useState, useEffect, useMemo } from "react"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { fetchExemptionCountries, createExemptionCountry, updateExemptionCountry, deleteExemptionCountry } from "@/lib/api/master.api"
import { triggerUiRevalidate } from "@/lib/actions/revalidate"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import type { AdminExemptionCountryListItem } from "@/types/api"

export function useMasterExemptions() {
  const qc = useQueryClient()
  const tableState = useTableState()
  const { query } = tableState

  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.is_active ? { is_active: query.is_active === "true" } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sort_by ? { sort: `${query.sort_dir === "desc" ? "-" : ""}${query.sort_by === "exemption_days" ? "exemptionDays" : query.sort_by === "country_code" ? "countryCode" : query.sort_by === "sequence_no" ? "sequenceNo" : query.sort_by}` } : {}),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["exemption-countries", apiQuery],
    queryFn: () => fetchExemptionCountries(apiQuery as any),
    placeholderData: keepPreviousData,
  })

  const { data: allData } = useQuery({
    queryKey: ["exemption-countries-all"],
    queryFn: () => fetchExemptionCountries({ limit: 1000 } as any),
    placeholderData: keepPreviousData,
  })

  const existingCodes = useMemo(() => {
    if (!allData?.data) return []
    return allData.data.map((d) => d.country_code.toLowerCase())
  }, [allData])

  const [selected, setSelected] = useSelectedRecord<AdminExemptionCountryListItem>(data?.data)
  const [form, setForm] = useState({ country_code: "", exemption_days: 0, is_active: true })

  useEffect(() => {
    if (selected) setForm({ country_code: selected.country_code.toUpperCase(), exemption_days: selected.exemption_days, is_active: selected.is_active })
  }, [selected])

  const isSaveDisabled = useMemo(() => {
    if (!selected) return !form.country_code
    return (
      form.country_code === selected.country_code.toUpperCase() &&
      form.exemption_days === selected.exemption_days &&
      form.is_active === selected.is_active
    )
  }, [form, selected])

  const saveMutation = useMutation({
    mutationFn: () => selected 
      ? updateExemptionCountry(selected.id, { exemption_days: form.exemption_days, is_active: form.is_active })
      : createExemptionCountry({ country_code: form.country_code, exemption_days: form.exemption_days, is_active: form.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exemption-countries"] })
      showToast(t("common.saved"), "success")
      setSelected(null)
      setForm({ country_code: "", exemption_days: 0, is_active: true })
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: () => selected ? deleteExemptionCountry(selected.id) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exemption-countries"] })
      showToast(t("common.deleted") || "Đã xoá", "success")
      setSelected(null)
      setForm({ country_code: "", exemption_days: 0, is_active: true })
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  return {
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
  }
}
