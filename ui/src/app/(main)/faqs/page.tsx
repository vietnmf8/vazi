import type { Metadata } from "next"
import { PageBanner } from "@/components/layout/PageBanner"
import { FaqsClient } from "./_components/FaqsClient"
import { DynamicToc } from "./_components/DynamicToc"
import { getFaqs } from "@/lib/api/faqs.api"
import { getTranslations, getLocale } from "next-intl/server"
import type { FaqItem } from "@/types/api"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FaqsPage.UI")
  return {
    title: t("title"),
    description: t("subtitle"),
  }
}

/**
 * FAQs page — 2-column layout: TOC sidebar + FAQ content.
 * Redesigned: Modern 2026 Travel dark theme.
 */
export default async function FaqsPage() {
  const t = await getTranslations("FaqsPage")
  const locale = await getLocale()
  const apiFaqs = await getFaqs(locale).catch(() => []);
  const faqsList = Array.isArray(apiFaqs) ? apiFaqs : [];
  
  // Use translations fallback if API is empty
  const fallbackFaqs = t.raw("Data.Faqs") as FaqItem[];
  
  const faqsToUse: FaqItem[] = faqsList.length > 0
    ? faqsList.map(f => ({
        id: f.id,
        category: f.category.toLowerCase() as any,
        question: f.question,
        answer: f.answer,
      }))
    : fallbackFaqs;

  return (
    <div className="min-h-screen ">
      <PageBanner
        title={t("UI.title")}
        subtitle={t("UI.subtitle")}
        breadcrumb={[
          { label: t("UI.breadcrumbHome"), href: "/" },
          { label: t("UI.breadcrumbFaqs") },
        ]}
      />
      <div className="max-w-275 mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          {/* Sidebar TOC — hidden on mobile, sticky on desktop */}
          {/* <aside className="hidden lg:block w-56 shrink-0">
            <DynamicToc containerSelector="main" />
          </aside> */}
          {/* Main FAQ content */}
          <main id="faq-main" className="min-w-0 flex-1">
            <FaqsClient initialFaqs={faqsToUse} />
          </main>
        </div>
      </div>
    </div>
  )
}
