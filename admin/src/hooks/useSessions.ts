"use client"

import { useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import type { ChatSession, ChatSessionsResponse } from "@/types/api"

async function fetchSessions(status: string, pageParam: number): Promise<ChatSessionsResponse> {
  const { data } = await apiClient.get<ChatSessionsResponse>("/chat/sessions", {
    params: { status, page: pageParam, limit: 20 },
  })
  return data
}

export function useSessions(status: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["sessions", status],
    queryFn: ({ pageParam }) => fetchSessions(status, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Calculate total fetched sessions
      const fetchedCount = allPages.reduce((acc, page) => acc + (page.sessions?.length || 0), 0)
      if (fetchedCount < lastPage.total) {
        return allPages.length + 1
      }
      return undefined
    },
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const handler = () => { void refetch() }
    window.addEventListener("refetch-sessions", handler)
    return () => window.removeEventListener("refetch-sessions", handler)
  }, [refetch])

  const sessions = (data?.pages.flatMap((page) => page.sessions ?? []) ?? []) as ChatSession[]
  const total = data?.pages[0]?.total ?? 0

  return {
    sessions,
    total,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}
