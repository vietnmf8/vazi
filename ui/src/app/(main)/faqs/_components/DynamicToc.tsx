"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type TocItem = {
  id: string
  text: string
  level: 2 | 3
}

/**
 * Dynamic Table of Contents (ul#toc) — auto-generates from h2/h3 headings
 * in a given container and highlights the currently-visible heading on scroll.
 * Redesigned: Modern 2026 Travel dark theme, gold active state.
 */
export function DynamicToc({ containerSelector = "main" }: { containerSelector?: string }) {
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Build TOC from h2/h3 headings in the container
  useEffect(() => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const headings = Array.from(container.querySelectorAll<HTMLElement>("h2[id], h3[id]"))
    const items: TocItem[] = headings.map((el) => ({
      id: el.id,
      text: el.textContent?.trim() ?? "",
      level: el.tagName === "H2" ? 2 : 3,
    }))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTocItems(items)
    if (items.length > 0) {
      setActiveId(items[0].id)
    }

    // IntersectionObserver to track active heading
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    )

    headings.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [containerSelector])

  if (tocItems.length === 0) return null

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-24 self-start rounded-xl border border-(--color-border) bg-(--color-surface-1) p-4"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-(--color-primary) mb-4 px-1">
        Contents
      </p>
      <ul
        id="toc"
        role="list"
        data-toc-headings="h2,h3"
        className="space-y-0.5 border-l border-(--color-border)"
      >
        {tocItems.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block py-1.5 text-xs transition-all duration-200 border-l-2 -ml-px",
                item.level === 2 ? "pl-3 font-medium" : "pl-5 font-normal",
                activeId === item.id
                  ? "border-(--color-primary) text-(--color-primary)"
                  : "border-transparent text-(--color-text-muted) hover:text-(--color-text-primary) hover:border-(--color-border-strong) transition-all"
              )}
              onClick={(e) => {
                e.preventDefault()
                const target = document.getElementById(item.id)
                target?.scrollIntoView({ behavior: "smooth", block: "start" })
                setActiveId(item.id)
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
