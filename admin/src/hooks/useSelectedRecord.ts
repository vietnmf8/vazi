"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function useSelectedRecord<T extends { id: string | number }>(
  data: T[] | undefined,
  idKey: string = "edit"
) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Khởi tạo state từ searchParams lúc mount
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get(idKey))

  // Lắng nghe searchParams (ví dụ user back/forward hoặc đổi URL thủ công)
  useEffect(() => {
    const id = searchParams.get(idKey)
    setSelectedId(id)
  }, [searchParams, idKey])

  const setSelected = useCallback((record: T | null) => {
    const newId = record ? String(record.id) : null
    if (newId === selectedId) return
    
    setSelectedId(newId) 
    
    // We intentionally DO NOT update the URL here via replaceState
    // because any modification to history in Chromium causes a hit-test recalculation 
    // and makes the cursor flicker to default. 
    // This was the root cause of the "bóng ma" bug.
  }, [selectedId])

  const selected = useMemo(() => {
    if (!selectedId || !data) return null
    return data.find(item => String(item.id) === selectedId) || null
  }, [selectedId, data])

  return [selected, setSelected] as const
}
