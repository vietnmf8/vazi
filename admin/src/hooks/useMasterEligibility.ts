import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { fetchEligibilityRules, updateEligibilityRule } from "@/lib/api/master.api"
import { triggerUiRevalidate } from "@/lib/actions/revalidate"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import type { AdminEligibilityRuleListItem } from "@/types/api"

export function useMasterEligibility() {
  const qc = useQueryClient()
  const tableState = useTableState()
  const { query, setFilter } = tableState
  const search = query.search || ""
  const setSearch = (v: string) => setFilter("search", v)
  const setPage = (p: number) => setFilter("page", p.toString())
  
  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.search ? { search: query.search } : {}),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["eligibility-rules", apiQuery],
    queryFn: () => fetchEligibilityRules(apiQuery),
    placeholderData: keepPreviousData,
  })

  const [selected, setSelected] = useSelectedRecord<AdminEligibilityRuleListItem>(data?.data)

  const toggleMutation = useMutation({
    mutationFn: () => updateEligibilityRule(selected!.id, { is_active: !selected!.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eligibility-rules"] })
      showToast(t("common.saved"), "success")
      setSelected(null)
      void triggerUiRevalidate("core-visa")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  return {
    tableState,
    search,
    setSearch,
    setPage,
    data,
    isLoading,
    isFetching,
    selected,
    setSelected,
    toggleMutation,
  }
}
