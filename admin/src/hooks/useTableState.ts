"use client"

import { useCallback, useState, useEffect, useRef, startTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function useTableState(initialState: Record<string, string> = {}, ignoreKeys: string[] = ["edit"]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState<Record<string, string>>(() => {
    const params: Record<string, string> = { ...initialState }
    searchParams.forEach((value, key) => {
      if (!ignoreKeys.includes(key)) {
        params[key] = value
      }
    })
    return params
    })

  const isMounted = useRef(false)

  const setParams = useCallback((updates: Record<string, string | undefined | null>) => {
    setQuery((prev) => {
      const newQuery = { ...prev }
      let pageChanged = false

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          newQuery[key] = value
        } else {
          delete newQuery[key]
        }
        if (key === "page") pageChanged = true
      })

      // Reset về trang 1 nếu thay đổi filter/sort mà không phải hành động chuyển trang
      if (!pageChanged && newQuery.page) {
        newQuery.page = "1"
      }

      return newQuery
    })
  }, [])

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    const params = new URLSearchParams()
    
    // Giữ lại các keys không thuộc quản lý của table (ví dụ: edit)
    ignoreKeys.forEach(key => {
      if (searchParams.has(key)) {
        params.set(key, searchParams.get(key)!)
      }
    })

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value)
      }
    })

    const newQueryString = params.toString()
    
    // So sánh param một cách an toàn không phụ thuộc thứ tự
    const currentParams = new URLSearchParams(searchParams.toString())
    currentParams.sort()
    params.sort()
    
    // We intentionally DO NOT update the URL here via replaceState
    // because any modification to history in Chromium causes a hit-test recalculation 
    // and makes the cursor flicker to default. 
  }, [query, pathname, router, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      setParams({ [key]: value })
    },
    [setParams]
  )

  return { query, setFilter, setParams }
}

export type TableState = ReturnType<typeof useTableState>
