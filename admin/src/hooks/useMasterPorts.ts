import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { fetchPorts, createPort, updatePort, deletePort } from "@/lib/api/master.api"
import { triggerUiRevalidate } from "@/lib/actions/revalidate"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import type { AdminPortListItem } from "@/types/api"

export function useMasterPorts() {
  const qc = useQueryClient()
  const tableState = useTableState()
  const { query } = tableState
  
  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.is_active ? { is_active: query.is_active === "true" } : {}),
    ...(query.entry_type ? { entry_type: query.entry_type } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sort_by ? { sort_by: query.sort_by === "entry_type" ? "portType" : query.sort_by === "sequence_no" ? "sequenceNo" : query.sort_by === "is_active" ? "isActive" : query.sort_by as string, sort_dir: query.sort_dir as any } : {}),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["ports", apiQuery],
    queryFn: () => fetchPorts(apiQuery),
    placeholderData: keepPreviousData,
  })

  const [selected, setSelected] = useSelectedRecord<AdminPortListItem>(data?.data)
  const [form, setForm] = useState({ code: "", name: "", entry_type: "AIRPORT", is_active: true })

  useEffect(() => {
    if (selected) {
      setForm({ code: selected.code, name: selected.name, entry_type: selected.entry_type, is_active: selected.is_active })
    }
  }, [selected])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selected) return updatePort(selected.id, form)
      return createPort(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ports"] })
      showToast(t("common.saved"), "success")
      setSelected(null)
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      return deletePort(selected.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ports"] })
      showToast(t("common.deleted") || "Đã xoá", "success")
      setSelected(null)
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  return {
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
  }
}
