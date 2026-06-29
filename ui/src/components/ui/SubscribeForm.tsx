"use client"

import * as React from "react"
import { useState } from "react"
import { Send, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"
import { subscribeNewsletter } from "@/lib/api/newsletter.api"
import { ApiClientError } from "@/lib/api-client"

export function SubscribeForm() {
  const t = useTranslations("HomePage.SubscribeForm")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setError(null)
    try {
      await subscribeNewsletter(email)
      setIsSubscribed(true)
      setEmail("")
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t("error_generic")
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubscribed) {
    return (
      <div
        className="flex flex-col items-start gap-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-bottom-2 duration-300"
        role="alert"
      >
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{t("success_title")}</span>
        </div>
        <p className="caption-text leading-relaxed">{t("success_desc")}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} data-ai-id="newsletter-form" className="flex flex-col gap-2.5 w-full">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="txtEmail" className="text-xs font-semibold text-[var(--color-text-primary)]">
          {t("email_label")}
        </label>
        <span className="caption-text leading-normal">{t("desc")}</span>
      </div>

      {error && (
        <p className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Input
          type="email"
          id="txtEmail"
          data-ai-field="newsletter-email"
          placeholder={t("placeholder")}
          required
          disabled={isLoading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 text-xs rounded-lg border-[var(--color-border-default)] focus-visible:ring-[#C8A96E] placeholder:text-[var(--color-text-tertiary)]/70 focus:border-[#C8A96E]"
        />
        <Button
          type="submit"
          id="btnRegisterEmail"
          variant="outline"
          size="icon"
          isLoading={isLoading}
          className="h-10 w-10 shrink-0 border-[#C8A96E]/40 hover:bg-[#C8A96E]/10 hover:border-[#C8A96E] text-[#C8A96E] transition-all rounded-lg active:scale-95"
          aria-label="Subscribe to newsletter"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </form>
  )
}
