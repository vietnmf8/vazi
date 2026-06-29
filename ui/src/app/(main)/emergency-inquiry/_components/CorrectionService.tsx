"use client"

import { ShieldAlert, CheckCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"
import { WHATSAPP_URL } from "@/lib/constants"

export function CorrectionService() {
  const t = useTranslations("EmergencyInquiryPage");
  const commonErrors = [
    t("err_1"),
    t("err_2"),
    t("err_3"),
    t("err_4"),
  ]

  return (
    <div className="rounded-xl border border-red-500/25 bg-[rgba(239,68,68,0.04)] p-6 sm:p-8 space-y-6 relative overflow-hidden" data-ai-target="emergency_correction">
      {/* Red corner accent */}
      <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/10 rounded-bl-full pointer-events-none" />

      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-bold text-(--color-text-primary) font-body">
            {t("correction_title")}
          </h3>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 uppercase tracking-wider font-bold">
            {t("correction_subtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="body-text-sm" dangerouslySetInnerHTML={{ __html: t("correction_desc1").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

        <div className="rounded-lg bg-red-50 dark:bg-[#0B0D14]/40 border border-red-500/15 p-4 space-y-3">
          <p className="section-label !text-red-900 dark:!text-(--color-text-primary)">
            {t("correction_errors_title")}
          </p>
          <ul className="grid gap-2 text-xs text-red-950/80 dark:text-(--color-text-muted)">
            {commonErrors.map((err, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-red-500 dark:text-red-400 font-bold shrink-0">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="caption-text" dangerouslySetInnerHTML={{ __html: t("correction_desc2").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <Button
          asChild
          className="flex-1 bg-red-600 bg-none hover:bg-red-700 text-white transition-all border-0 shadow-none hover:shadow-none"
          data-ai-element="emergency_correction_whatsapp"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageSquare className="h-4 w-4" />
            {t("correction_btn")}
          </a>
        </Button>
      </div>
    </div>
  )
}
