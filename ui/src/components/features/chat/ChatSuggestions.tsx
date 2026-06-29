"use client"

interface ChatSuggestionsProps {
  suggestions: string[]
  onSend: (text: string) => void
}

/**
 * Hàng pill buttons quick-reply — hiện sau AI message khi có suggestions.
 */
export function ChatSuggestions({ suggestions, onSend }: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2" role="group" aria-label="Suggested replies">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSend(s)}
          className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-surface-elevated)] active:scale-95"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
