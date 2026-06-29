import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useMemo, useCallback, useEffect } from "react"
import type { SortingState } from "@tanstack/react-table"

import { useTableState } from "@/hooks/useTableState"
import { fetchUsers, approveUser, rejectUser } from "@/lib/api/users.api"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import { getPusherClient } from "@/lib/soketi"

export function useMasterUserRequests() {
  const qc = useQueryClient()
  const tableState = useTableState({ role: "", sort_id: "created_at", sort_desc: "true" })
  const { query, setFilter, setParams } = tableState
  const role = query.role || ""
  const search = query.search || ""
  const setSearch = (v: string) => setFilter("search", v)
  const setPage = (p: number) => setFilter("page", p.toString())
  const page = query.page ? Number(query.page) : 1

  const sorting = useMemo<SortingState>(() => {
    return [{ id: query.sort_id || "created_at", desc: query.sort_desc === "true" }]
  }, [query.sort_id, query.sort_desc])

  const setSorting = useCallback((updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue
    if (newSorting.length > 0) {
      setParams({ sort_id: newSorting[0].id, sort_desc: newSorting[0].desc ? "true" : "false" })
    } else {
      setParams({ sort_id: "created_at", sort_desc: "true" })
    }
  }, [sorting, setParams])

  const sortString = useMemo(() => {
    if (!sorting.length) return undefined
    const { id, desc } = sorting[0]
    let apiSort = id
    if (id === "created_at") apiSort = "createdAt"
    if (id === "full_name") apiSort = "fullName"
    return desc ? `-${apiSort}` : apiSort
  }, [sorting])

  const apiQuery = {
    page,
    limit: 20,
    accountStatus: "PENDING",
    ...(role ? { role } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(sortString ? { sort: sortString } : {})
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users-requests", apiQuery],
    queryFn: () => fetchUsers(apiQuery),
    placeholderData: keepPreviousData,
  })



  const approveMutation = useMutation({
    mutationFn: (id: string) => approveUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-requests"] })
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      showToast(t("users.approveSuccess"), "success")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-requests"] })
      showToast(t("users.rejectSuccess"), "success")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  return {
    tableState,
    query,
    setFilter,
    search,
    setSearch,
    setPage,
    role,
    sorting,
    setSorting,
    data,
    isLoading,
    isFetching,
    approveMutation,
    rejectMutation
  }
}
