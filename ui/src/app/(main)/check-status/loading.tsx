/**
 * Skeleton cho Check Status — form + vùng kết quả.
 */
export default function CheckStatusLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-md bg-[var(--color-surface-elevated)]" />
        <div className="h-4 w-full max-w-md rounded-md bg-[var(--color-surface-elevated)]" />
        <div className="space-y-4 rounded-lg border border-[var(--color-border-default)] p-6">
          <div className="h-10 w-full rounded-md bg-[var(--color-surface-elevated)]" />
          <div className="h-10 w-full rounded-md bg-[var(--color-surface-elevated)]" />
          <div className="h-10 w-32 rounded-md bg-[var(--color-surface-elevated)]" />
        </div>
        <div className="h-40 w-full rounded-lg bg-[var(--color-surface-elevated)]" />
      </div>
    </div>
  )
}
