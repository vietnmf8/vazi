---
activation: model_decision
description: Streaming with Suspense in Next.js — load pages faster by streaming independent sections. Apply when wrapping async Server Components with Suspense boundaries.
globs: "**/app/**/*.tsx"
---

## Context

Streaming breaks a page's HTML into chunks and sends them progressively from server to client — components with data render as soon as their data resolves, without blocking the whole page.

Works naturally with Next.js App Router: each `async` Server Component is a streamable chunk.

## Basic Pattern

```tsx
import { Suspense } from "react";
import { PostFeed } from "@/components/post-feed";
import { UserStats } from "@/components/user-stats";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
    return (
        <section className="grid gap-6">
            {/* Renders immediately — no data dependency */}
            <h1 className="text-2xl font-semibold">Dashboard</h1>

            {/* Streams in when data resolves */}
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <UserStats />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <PostFeed />
            </Suspense>
        </section>
    );
}
```

## loading.tsx (route-level streaming)

```tsx
// app/dashboard/loading.tsx — auto-wraps the page in Suspense
export default function Loading() {
    return <Skeleton className="h-screen w-full" />;
}
```

## Rules

1. Wrap each **independent data-fetching component** in its own `<Suspense>` — don't batch unrelated fetches
2. Always provide a `fallback` — use `<Skeleton>` from `@/components/ui/skeleton` for visual consistency
3. High-priority content (header, nav) should render **outside** Suspense — never block layout
4. Prefer `loading.tsx` for full-route loading states, `<Suspense>` for partial/section loading
5. Server Component = streamable. Client Component = not streamable — keep data-fetching in Server Components
6. See `19-server-components.mdc` for Server Component fundamentals
