"use client"

import { useState } from "react"
import { HelpCircle, MessageCircle, ChevronDown } from "lucide-react"
import Link from "next/link"
import { AnimatePresence, m } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function StatusFaqsClient({ faqs, whatsappLink }: { faqs: any[], whatsappLink: string }) {
  const t = useTranslations("CheckStatusPage")
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section aria-labelledby="status-faqs-heading" data-ai-target="check_status_faqs">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle)">
          <HelpCircle className="size-4 text-(--color-primary) shrink-0" />
        </div>
        <h2
          id="status-faqs-heading"
          className="text-lg font-semibold text-(--color-text-primary) font-body"
        >
          {t("faqs_heading")}
        </h2>
      </div>

      <div className="space-y-3 mx-auto max-w-3xl lg:max-w-none" role="region" aria-label="FAQ list">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          const panelId = `faq-panel-${faq.id}`;
          const buttonId = `faq-button-${faq.id}`;

          return (
            <div
              key={faq.id}
              className={cn(
                "overflow-hidden rounded-2xl border transition-all duration-300",
                isOpen
                  ? "border-(--color-primary) bg-(--color-surface-1) shadow-sm"
                  : "border-(--color-border) bg-(--color-surface-1) hover:border-(--color-primary)/40 transition-all"
              )}
            >
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  className="flex min-h-16 w-full items-center justify-between gap-4 px-6 py-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface-1) "
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(faq.id)}
                >
                  <span className="font-body text-sm sm:text-base font-bold text-(--color-text-primary) transition-all">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-(--color-primary) transition-transform duration-300",
                      isOpen ? "rotate-180" : "rotate-0"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <m.div
                    key="content"
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="border-t border-(--color-border) bg-(--color-surface-2) px-6 py-5 text-sm leading-relaxed text-(--color-text-secondary) font-body">
                      {faq.answer}
                    </p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-(--color-text-muted)">
        <div className="flex size-6 items-center justify-center rounded-full bg-(--color-secondary-subtle)">
          <MessageCircle className="size-3.5 text-(--color-secondary) shrink-0" />
        </div>
        <span>
          {t("need_help")}{" "}
          <Link
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-secondary) hover:text-(--color-text-link) font-semibold transition-all"
          >
            {t("chat_whatsapp")}
          </Link>
        </span>
      </div>
    </section>
  )
}
