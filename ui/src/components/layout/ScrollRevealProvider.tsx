"use client"

import React, { useEffect } from "react"

interface ScrollRevealProviderProps {
  children: React.ReactNode
}

export default function ScrollRevealProvider({ children }: ScrollRevealProviderProps) {
  useEffect(() => {
    // Force manual scroll restoration to prevent browser scroll retention hydration mismatches
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)

    // Cinematic reveal — unlock content below Hero khi scroll > 60px
    const handleCinematicScroll = () => {
      if (window.scrollY > 60) {
        document.body.classList.add("cinematic-revealed")
        window.removeEventListener("scroll", handleCinematicScroll)
      }
    }
    window.addEventListener("scroll", handleCinematicScroll, { passive: true })

    // Disable animations nếu user prefer reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("cinematic-revealed")
      window.removeEventListener("scroll", handleCinematicScroll)
      return () => {}
    }

    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -60px 0px",
      threshold: 0.05,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible")
          // Unobserve sau khi đã reveal — chỉ trigger 1 lần khi scroll xuống
          observer.unobserve(entry.target)
        }
      })
    }, observerOptions)

    let timer: NodeJS.Timeout
    let handleLoad: (() => void) | undefined

    const startObserving = () => {
      const elements = document.querySelectorAll(".reveal-on-scroll")
      elements.forEach((el) => observer.observe(el))
    }

    if (document.readyState === "complete") {
      timer = setTimeout(startObserving, 200)
    } else {
      handleLoad = () => {
        timer = setTimeout(startObserving, 300)
      }
      window.addEventListener("load", handleLoad)
    }

    // Handle dynamic DOM changes (sections added after mount)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains("reveal-on-scroll")) {
              observer.observe(node)
            }
            node.querySelectorAll(".reveal-on-scroll").forEach((el) => {
              observer.observe(el)
            })
          }
        })
      })
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      if (timer) clearTimeout(timer)
      if (handleLoad) {
        window.removeEventListener("load", handleLoad)
      }
      window.removeEventListener("scroll", handleCinematicScroll)
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return <>{children}</>
}
