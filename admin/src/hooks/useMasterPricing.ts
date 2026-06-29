import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { fetchPricingRules, createPricingRule, updatePricingRule, deletePricingRule } from "@/lib/api/master.api"
import { triggerUiRevalidate } from "@/lib/actions/revalidate"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import type { AdminPricingRuleListItem } from "@/types/api"

export function useMasterPricing() {
  const qc = useQueryClient()
  const tableState = useTableState()
  const { query } = tableState

  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.is_active ? { is_active: query.is_active === "true" } : {}),
    ...(query.rule_type ? { rule_type: query.rule_type } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sort_by ? { sort: `${query.sort_dir === "desc" ? "-" : ""}${query.sort_by === "rule_type" ? "ruleType" : query.sort_by === "is_active" ? "isActive" : query.sort_by === "sequence_no" ? "createdAt" : query.sort_by}` } : {}),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pricing-rules", apiQuery],
    queryFn: () => fetchPricingRules(apiQuery as any),
    placeholderData: keepPreviousData,
  })

  const [selected, setSelected] = useSelectedRecord<AdminPricingRuleListItem>(data?.data)
  const [form, setForm] = useState({ price: 0, is_active: true, key: "", rule_type: "BASE_FEE", name: "" })

  useEffect(() => {
    if (selected) {
      setForm({ price: selected.price, is_active: selected.is_active, key: selected.key, rule_type: selected.rule_type, name: selected.name })
    }
  }, [selected])

  const saveMutation = useMutation({
    mutationFn: () => selected 
      ? updatePricingRule(selected.id, { price: form.price, is_active: form.is_active })
      : createPricingRule({ price: form.price, is_active: form.is_active, key: form.key || `CUSTOM_${Date.now()}`, rule_type: form.rule_type, name: form.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] })
      showToast(t("common.saved"), "success")
      setSelected(null)
      setForm({ price: 0, is_active: true, key: "", rule_type: "BASE_FEE", name: "" })
      void triggerUiRevalidate("core-visa")
      void triggerUiRevalidate("rules_config")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: () => selected ? deletePricingRule(selected.id) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] })
      showToast(t("common.deleted") || "Đã xoá", "success")
      setSelected(null)
      setForm({ price: 0, is_active: true, key: "", rule_type: "BASE_FEE", name: "" })
      void triggerUiRevalidate("core-visa")
      void triggerUiRevalidate("rules_config")
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
