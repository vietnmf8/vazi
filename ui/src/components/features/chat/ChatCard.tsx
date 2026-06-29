"use client"

import { useState } from "react"
import { AlertTriangle, CheckSquare, ExternalLink, Square, Navigation, Receipt, FileText, Ticket, CheckCircle2 } from "lucide-react"
import Link from "next/link"

import type { ChatCardData } from "@/types/api"

export type { ChatCardData }

interface ChatCardProps {
  card: ChatCardData
  whatsappUrl?: string
}

function VisaInfoCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-[var(--color-border-default)] p-3 text-xs">
      {!!data["type"] && <div><p className="font-medium text-[var(--color-text-muted)]">Visa type</p><p>{String(data["type"])}</p></div>}
      {!!data["validity"] && <div><p className="font-medium text-[var(--color-text-muted)]">Validity</p><p>{String(data["validity"])}</p></div>}
      {!!data["fee"] && <div><p className="font-medium text-[var(--color-text-muted)]">Fee</p><p>{String(data["fee"])}</p></div>}
      {!!data["processing"] && <div><p className="font-medium text-[var(--color-text-muted)]">Processing</p><p>{String(data["processing"])}</p></div>}
    </div>
  )
}

function VisaComparisonCard() {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-border-default)] text-xs">
      <table className="w-full">
        <thead className="bg-[var(--color-surface-elevated)]">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Feature</th>
            <th className="px-2 py-1.5 text-center font-medium">E-Visa</th>
            <th className="px-2 py-1.5 text-center font-medium">VOA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-default)]">
          {[
            ["Fee", "$25", "$45"],
            ["Validity", "90 days", "30 days"],
            ["Processing", "3 business days", "On arrival"],
            ["Entry", "Multiple", "Single"],
          ].map(([feature, evisa, voa]) => (
            <tr key={feature}>
              <td className="px-2 py-1.5 font-medium text-[var(--color-text-muted)]">{feature}</td>
              <td className="px-2 py-1.5 text-center">{evisa}</td>
              <td className="px-2 py-1.5 text-center">{voa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocumentChecklistCard({ data }: { data: Record<string, unknown> }) {
  const items = Array.isArray(data["items"]) ? (data["items"] as string[]) : []
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-[var(--color-border-default)] p-3 text-xs">
      <p className="font-medium">Required documents:</p>
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(i)}
          className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-[var(--color-surface-elevated)] transition-all"
        >
          {checked.has(i) ? (
            <CheckSquare className="size-4 shrink-0 text-green-500" />
          ) : (
            <Square className="size-4 shrink-0 text-[var(--color-text-muted)]" />
          )}
          <span className={checked.has(i) ? "line-through opacity-60" : ""}>{item}</span>
        </button>
      ))}
    </div>
  )
}

function WarningCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-2 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950">
      <AlertTriangle className="size-4 shrink-0 text-(--color-primary) mt-0.5" />
      <div>
        {!!data["title"] && <p className="font-semibold text-(--color-primary)">{String(data["title"])}</p>}
        {!!data["body"] && <p className="mt-0.5 text-(--color-primary)">{String(data["body"])}</p>}
      </div>
    </div>
  )
}

function UrgentCtaCard({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <div className="mt-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs dark:border-orange-700 dark:bg-orange-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 text-orange-500 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-orange-800 dark:text-orange-300">Urgent visa assistance needed?</p>
          <p className="mt-0.5 text-orange-700 dark:text-orange-400">
            Our emergency team is available 24/7 for urgent cases.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 transition-all"
          >
            <ExternalLink className="size-3" />
            Contact via WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

function CtaButtonsCard({ data }: { data: Record<string, unknown> }) {
  const buttons = Array.isArray(data["buttons"])
    ? (data["buttons"] as Array<{ label: string; href: string }>)
    : []

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {buttons.map((btn) => (
        <a
          key={btn.href}
          href={btn.href}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-default)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-all"
        >
          <ExternalLink className="size-3" />
          {btn.label}
        </a>
      ))}
    </div>
  )
}

function NavigationCard({ data }: { data: Record<string, unknown> }) {
  const label = String(data["label"] || "Click here")
  const url = String(data["url"] || "/")

  return (
    <div className="mt-2 flex w-full">
      <Link
        href={url}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white dark:text-black shadow-sm hover:opacity-90 transition-opacity"
      >
        <Navigation className="size-4" />
        {label}
      </Link>
    </div>
  )
}

import { useTranslations } from "next-intl"

function FeeSummaryCard({ data }: { data: Record<string, unknown> }) {
  const t = useTranslations("ApplyPage.PriceBreakdown")
  const total = String(data["total"] || 0);
  const currency = String(data["currency"] || "USD");
  const breakdown = Array.isArray(data["breakdown"]) ? data["breakdown"] : [];

  return (
    <div className="mt-2 rounded-lg border border-[var(--color-border-default)] p-3 text-xs">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--color-border-default)]">
        <Receipt className="size-4 text-[var(--color-primary)]" />
        <span className="font-semibold text-[var(--color-text-primary)]">{t("order_summary") || "Fee Summary"}</span>
      </div>
      <div className="space-y-1.5">
        {breakdown.map((item: any, i: number) => {
          let labelKey = String(item?.label || "");
          let translatedLabel = labelKey;
          
          if (labelKey === "pricing.breakdown.base_fee" || labelKey === "base_fee") {
            translatedLabel = t("base_fee");
          } else if (labelKey === "pricing.breakdown.processing" || labelKey === "processing") {
            translatedLabel = t("processing");
          } else if (labelKey === "pricing.breakdown.vip_fast_track" || labelKey === "vip_fast_track") {
            translatedLabel = t("vip_fast_track");
          }
          
          return (
            <div key={i} className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">{translatedLabel}</span>
              <span className="font-medium">{String(item?.amount || "")} {currency}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-[var(--color-border-default)] flex justify-between">
        <span className="font-semibold text-[var(--color-text-primary)]">{t("summary") || "Total"}</span>
        <span className="font-bold text-[var(--color-primary)]">{total} {currency}</span>
      </div>
    </div>
  )
}


function TicketConfirmationCard({ data }: { data: Record<string, unknown> }) {
  const t = useTranslations("Chat")
  const ticketId = String(data["ticketId"] || "");

  return (
    <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs dark:border-green-900 dark:bg-green-950/30">
      <div className="flex items-start gap-2">
        <Ticket className="size-4 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-green-800 dark:text-green-300">{t("ticket_title") || "Support Ticket Created"}</p>
          <p className="mt-0.5 text-green-700 dark:text-green-400">
            {t("ticket_id") || "Ticket ID"}: <strong>{ticketId}</strong>
          </p>
          <p className="mt-1 text-green-700 dark:text-green-400 opacity-90">
            {t("ticket_desc") || "We have received your request and our team will get back to you shortly."}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Renderer cho structured AI output cards — type-switched.
 */
export function ChatCard({ card, whatsappUrl = "https://wa.me/84965800392" }: ChatCardProps) {
  switch (card.type) {
    case "navigation":
      return <NavigationCard data={card.data} />
    case "visa_info":
      return <VisaInfoCard data={card.data} />
    case "visa_comparison":
      return <VisaComparisonCard />
    case "document_checklist":
      return <DocumentChecklistCard data={card.data} />
    case "warning":
      return <WarningCard data={card.data} />
    case "urgent_cta":
      return <UrgentCtaCard whatsappUrl={whatsappUrl} />
    case "cta_buttons":
      return <CtaButtonsCard data={card.data} />
    case "fee_summary":
      return <FeeSummaryCard data={card.data} />

    case "ticket_confirmation":
      return <TicketConfirmationCard data={card.data} />
    default:
      return null
  }
}
