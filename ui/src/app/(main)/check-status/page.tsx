import type { Metadata } from "next"
import Link from "next/link"
import { HelpCircle, MessageCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { PageBanner } from "@/components/layout/PageBanner"
import { CheckStatusForm } from "./_components/CheckStatusForm"
import { StatusFaqsClient } from "./_components/StatusFaqsClient"
import { SubPageSidebar } from "@/components/layout/SubPageSidebar"
import { getFooterSettings } from "@/lib/api/footer.api"

export const metadata: Metadata = {
  title: "Check Application Status",
  description:
    "Track your Vietnam visa application with your booking number and email. Download your approved e-visa when ready.",
}

const getStatusFaqs = (t: any) => t.raw('faqs') as Array<{
  id: string
  question: string
  answer: string
}>

/**
 * Check Status Page — Stage 6 mock, Stage 7 nối API.
 * Redesigned: Modern 2026 Travel dark theme.
 */
export default async function CheckStatusPage() {
  const [t, contact] = await Promise.all([
    getTranslations("CheckStatusPage"),
    getFooterSettings(),
  ])
  const STATUS_FAQS = getStatusFaqs(t)

  return (
    <div className="min-h-screen">
      <PageBanner
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumb={[
          { label: t("breadcrumb_home"), href: "/" },
          { label: t("breadcrumb_check_status") },
        ]}
      />

      <div className="max-w-275 mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12 lg:items-start">

          {/* ── Main Content ── */}
          <div className="min-w-0 flex-1 space-y-12">

            {/* Status Form */}
            <CheckStatusForm />

            {/* ── Status FAQs Block ── */}
            <StatusFaqsClient faqs={STATUS_FAQS} whatsappLink={contact.whatsappUrl} />

          </div>

          {/* ── Right Sidebar ── */}
          <aside className="w-full lg:w-72 shrink-0">
            <SubPageSidebar whatsappLink={contact.whatsappUrl} />
          </aside>

        </div>
      </div>
    </div>
  )
}
