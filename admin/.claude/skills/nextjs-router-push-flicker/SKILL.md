---
name: nextjs-router-push-flicker
description: Use when a Next.js App Router component closes a modal then calls router.push(), causing a flicker where URL changes to the new route but the DOM still shows the old page. Also applies when any UI element is dismissed before programmatic navigation and the URL races ahead of the rendered content.
---

# Next.js router.push() Modal Flicker Fix

## Overview

In Next.js App Router, `router.push()` calls `history.pushState()` **synchronously**, but the React component tree update is **asynchronous**. Closing a modal before navigating always creates a gap where URL="/new-route" but DOM still shows the old page. The fix: keep the modal open during navigation, use `usePathname()` to detect when the new page has committed, close atomically.

## Root Cause

```
setIsOpen(false)       ← schedules React re-render (async)
router.push("/apply")  ← history.pushState() fires NOW (sync)
                         URL = "/apply" immediately
                         React still hasn't painted close state
                         Next.js fetches new segment (async)
                         ↓ GAP: URL="/apply", DOM=old page ← THE BUG
                         New page renders
```

`history.pushState()` is synchronous at the browser level. No React technique eliminates this gap — `flushSync`, `setTimeout`, or `startTransition` all still leave a window where URL is ahead of content.

## Why Common Fixes Fail

| Fix | Why it fails |
|---|---|
| `flushSync(() => setIsOpen(false))` | Modal closes cleanly, but URL still changes before new page content is ready |
| `setTimeout(() => router.push(), 0)` | Fragile timing, same race on slow networks |
| `startTransition(() => router.push())` | Marks update as non-urgent — doesn't prevent URL changing first |

## The Correct Pattern

**Don't close the modal before navigating. Use the modal as a loading overlay.**

```tsx
// ❌ WRONG — triggers flicker
const handleClose = (choice) => {
  setIsOpen(false)        // modal closes → naked old page visible
  router.push("/apply")   // URL changes immediately
}

// ✅ CORRECT — modal stays open as overlay, closes atomically with new page
const handleClose = (choice) => {
  if (choice === "close") {
    setIsOpen(false)       // user explicitly dismissed — close immediately
    setPendingChoice(null)
    return
  }
  
  setPendingChoice(choice) // track for visual state
  router.push("/apply")    // navigate — modal stays open
}
```

Close the modal via `usePathname()` after the page has committed:

```tsx
const pathname = usePathname()

// Fires only when pathname changes (Next.js has committed new page)
// Do NOT add pendingChoice to deps — effect should fire on pathname change only,
// not when pendingChoice is first set.
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (pendingChoice !== null) {
    setIsOpen(false)
    setPendingChoice(null)
    setOptions(null)
  }
}, [pathname])
```

**Why `usePathname()` works:** Next.js updates the value returned by `usePathname()` only after it has fully committed the new page's component tree. When the effect fires, the new page is already rendered — closing the modal is atomic with the page appearing.

## UX During Navigation

While `pendingChoice !== null`, show feedback so the user knows something is happening:

```tsx
// Button being navigated to → replace icon with spinner
{pendingChoice === "new-application" ? (
  <Spinner className="size-6" />
) : (
  <FileText className="size-6" />
)}

// Other buttons → dim and disable
<button
  disabled={pendingChoice !== null}
  className={cn(
    pendingChoice !== null && pendingChoice !== "new-application"
      && "opacity-40 pointer-events-none"
  )}
>
```

## Full Provider Pattern

```tsx
"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export function ModalProvider({ children }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<string | null>(null)

  const handleClose = (choice: string | "close") => {
    if (choice === "close") {
      setIsOpen(false)
      setPendingChoice(null)
      return
    }
    // Modal stays open — navigate
    setPendingChoice(choice)
    navigate(choice) // your router.push(...)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pendingChoice !== null) {
      setIsOpen(false)
      setPendingChoice(null)
    }
  }, [pathname])

  return (
    <>
      {children}
      {isOpen && (
        <YourModal
          pendingChoice={pendingChoice}
          onClose={handleClose}
        />
      )}
    </>
  )
}
```

## Common Mistakes

**Adding `pendingChoice` to `useEffect` deps:**
```tsx
// ❌ WRONG — effect fires immediately when pendingChoice is set
useEffect(() => { ... }, [pathname, pendingChoice])

// ✅ CORRECT — only fires when pathname actually changes
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { ... }, [pathname])
```

**Using `flushSync` to force-close before navigation:**
`flushSync` makes React's commit synchronous but does not delay `history.pushState()`. The URL still changes before the new page content is ready.

**Closing the modal on the "close" action but not the navigation action:**
The `"close"` case (X button, ESC, backdrop) should close immediately with no navigation. Only navigation choices should defer the close.
