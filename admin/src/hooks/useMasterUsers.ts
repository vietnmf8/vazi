import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useMemo, useCallback, useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { SortingState } from "@tanstack/react-table"

import { useTableState } from "@/hooks/useTableState"
import { fetchUsers } from "@/lib/api/users.api"
import { getPusherClient } from "@/lib/soketi"
import { getEmailFromToken, getRoleFromToken } from "@/lib/auth"

export function useMasterUsers() {
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
    if (id === "stt" || id === "sequence_no") apiSort = "sequenceNo"
    return desc ? `-${apiSort}` : apiSort
  }, [sorting])

  const apiQuery = {
    page,
    limit: 20,
    ...(role ? { role } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(sortString ? { sort: sortString } : {})
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", apiQuery],
    queryFn: () => fetchUsers(apiQuery),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe("admin-notifications")
    const handler = () => qc.invalidateQueries({ queryKey: ["admin-users"] })
    channel.bind("users_updated", handler)
    return () => {
      channel.unbind("users_updated", handler)
    }
  }, [qc])

  const [myEmailState, setMyEmailState] = useState<string | null>(null)
  const [myRoleState, setMyRoleState] = useState<string | null>(null)

  useEffect(() => {
    setMyEmailState(getEmailFromToken())
    setMyRoleState(getRoleFromToken())
  }, [])

  const isSuperAdmin = myRoleState === "SUPER_ADMIN" || myEmailState === "vietnmf8@fullstack.edu.vn"

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
    myEmailState,
    isSuperAdmin
  }
}
