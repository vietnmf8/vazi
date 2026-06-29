"use client"

import { useState } from "react"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { submitChatSurvey } from "@/lib/api/chat.api"

interface ChatSurveyProps {
  sessionId: string
  onDone: () => void
}

/**
 * Post-chat rating form — 1–5 sao + comment tự do.
 */
export function ChatSurvey({ sessionId, onDone }: ChatSurveyProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!rating) return
    setIsSubmitting(true)
    try {
      await submitChatSurvey({ session_id: sessionId, rating, comment: comment.trim() || undefined })
      setSubmitted(true)
      setTimeout(onDone, 2000)
    } catch {
      // bỏ qua lỗi survey — không critical
      onDone()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-2xl">🙏</span>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Thank you for your feedback!</p>
        <p className="text-xs text-[var(--color-text-muted)]">Your rating helps us improve our service.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 p-5">
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">How was your experience?</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Rate your chat with FastVisa Assistant</p>
      </div>

      <div className="flex justify-center gap-2" role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={rating >= n}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className="size-8"
              fill={(hovered || rating) >= n ? "currentColor" : "none"}
              strokeWidth={1.5}
              style={{ color: (hovered || rating) >= n ? "#f59e0b" : "var(--color-text-muted)" }}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Any additional feedback? (optional)"
        rows={2}
        maxLength={2000}
        className="resize-none rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDone}
          disabled={isSubmitting}
        >
          Skip
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          onClick={() => void handleSubmit()}
          disabled={!rating || isSubmitting}
          isLoading={isSubmitting}
        >
          Submit
        </Button>
      </div>
    </div>
  )
}
