"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { StingerOverlay } from "./StingerOverlay"
import type {
  StingerCallback,
  StingerContextValue,
  StingerOverlayHandle,
  StingerProviderProps,
} from "./StingerTypes"

const StingerContext = createContext<StingerContextValue | undefined>(undefined)

export function StingerProvider({
  children,
  duration = 0.5,
  stagger = 0.08,
}: StingerProviderProps) {
  const overlayRef = useRef<StingerOverlayHandle>(null)

  const triggerStinger = useCallback((callback: StingerCallback) => {
    overlayRef.current?.trigger(callback)
  }, [])

  return (
    <StingerContext.Provider value={{ triggerStinger, isAnimating: false }}>
      {children}
      <StingerOverlay
        ref={overlayRef}
        duration={duration}
        stagger={stagger}
      />
    </StingerContext.Provider>
  )
}

export function useStingerContext(): StingerContextValue {
  const ctx = useContext(StingerContext)
  if (!ctx) throw new Error("useStinger must be used within <StingerProvider>")
  return ctx
}
