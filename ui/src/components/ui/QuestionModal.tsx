"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X, Send, User, Mail, Globe, MessageSquare } from "lucide-react"
import { Button } from "./Button"
import { Input } from "./Input"
import { submitContact } from "@/lib/api/support.api"
import { ApiClientError } from "@/lib/api-client"
import { COUNTRIES } from "@/lib/constants/nationalities"

export interface QuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitSuccess?: (data: {
    qfullname: string
    qemail: string
    qnationality: string
    qmessage: string
  }) => void
}

export function QuestionModal({ isOpen, onClose, onSubmitSuccess }: QuestionModalProps) {
  const [fullname, setFullname] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [nationality, setNationality] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const mountedRef = React.useRef(true)
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!fullname.trim()) newErrors.fullname = "Please enter your full name"
    if (!email.trim()) {
      newErrors.email = "Please enter your email address"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!nationality.trim()) newErrors.nationality = "Please select your nationality"
    if (!message.trim()) newErrors.message = "Please enter your question or message"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await submitContact({
        full_name: fullname.trim(),
        email: email.trim(),
        subject: "general_inquiry",
        message: `[Nationality: ${nationality}]\n\n${message.trim()}`,
      })

      if (!mountedRef.current) return
      setIsSubmitting(false)
      setIsSuccess(true)

      if (onSubmitSuccess) {
        onSubmitSuccess({ qfullname: fullname, qemail: email, qnationality: nationality, qmessage: message })
      }

      closeTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        setIsSuccess(false)
        setFullname("")
        setEmail("")
        setNationality("")
        setMessage("")
        onClose()
      }, 1500)
    } catch (err) {
      if (!mountedRef.current) return
      setIsSubmitting(false)
      setSubmitError(
        err instanceof ApiClientError
          ? err.message
          : "Could not send your question. Please try again."
      )
    }
  }

  const modalContent = (
    <div
      id="review-popup"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl transition-all duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)] transition-all"
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Send className="size-6" />
            </div>
            <h3 id="modal-title" className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Question Submitted!
            </h3>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              Thank you. Our support agent Mrs. Daisy will respond shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-2">
              <h3 id="modal-title" className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <MessageSquare className="size-5 text-[var(--color-text-primary)]" />
                Ask a Question
              </h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Have a question about Vietnam E-Visa? Leave us a message and we&apos;ll reply.
              </p>
            </div>

            {submitError && (
              <p className="text-xs text-[var(--color-error)]" role="alert">
                {submitError}
              </p>
            )}

            {/* Fullname */}
            <div className="space-y-1">
              <label htmlFor="qfullname" className="block text-xs font-medium text-[var(--color-text-tertiary)]">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <User className="size-4" />
                </span>
                <input
                  id="qfullname"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] pl-10 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {errors.fullname && <p className="text-xs text-[var(--color-error)]">{errors.fullname}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="qemail" className="block text-xs font-medium text-[var(--color-text-tertiary)]">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <Mail className="size-4" />
                </span>
                <input
                  id="qemail"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] pl-10 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {errors.email && <p className="text-xs text-[var(--color-error)]">{errors.email}</p>}
            </div>

            {/* Nationality — full list from COUNTRIES constant */}
            <div className="space-y-1">
              <label htmlFor="qnationality" className="block text-xs font-medium text-[var(--color-text-tertiary)]">
                Nationality
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                  <Globe className="size-4" />
                </span>
                <select
                  id="qnationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] pl-10 pr-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)]"
                >
                  <option value="" disabled className="bg-[var(--color-surface-base)]">Select nationality</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country} className="bg-[var(--color-surface-base)]">
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              {errors.nationality && <p className="text-xs text-[var(--color-error)]">{errors.nationality}</p>}
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label htmlFor="qmessage" className="block text-xs font-medium text-[var(--color-text-tertiary)]">
                Your Question / Message
              </label>
              <textarea
                id="qmessage"
                rows={4}
                placeholder="Ask about pricing, processing times, requirements..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              {errors.message && <p className="text-xs text-[var(--color-error)]">{errors.message}</p>}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={isSubmitting}>
                Submit Question
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return typeof window !== "undefined"
    ? createPortal(modalContent, document.body)
    : null
}
