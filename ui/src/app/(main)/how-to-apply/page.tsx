import type { Metadata } from "next"
import Link from "next/link"
import { PageBanner } from "@/components/layout/PageBanner"
import { Button } from "@/components/ui/Button"
import { Typography } from "@/components/ui/Typography"
import { getTranslations } from "next-intl/server"
import { FAQPreview } from "@/components/sections/FAQPreview"
import { FloatingTOC } from "@/components/features/FloatingTOC"
import { ApplicationTimeline } from "./_components/ApplicationTimeline"
import { RequiredDocuments } from "./_components/RequiredDocuments"
import { getHowToApplyGuideline } from "@/lib/api/guidelines.api"

export async function generateMetadata({ params: { locale } }: any): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "HowToApplyPage" })
  return {
    title: t("title"),
    description: t("subtitle"),
  }
}

/**
 * Trang hướng dẫn quy trình nộp hồ sơ xin visa Việt Nam trực tuyến (How to Apply).
 * Giao diện được tối ưu hóa bằng cách tách các phần phức tạp thành component cục bộ,
 * đồng thời tích hợp hiệu ứng mượt mà và tái sử dụng component FAQ toàn hệ thống.
 * 
 * WHY: Cải thiện khả năng bảo trì và cấu trúc code (tách component), đồng bộ ngôn ngữ thiết kế
 * toàn diện (HowItWorks style) và mang lại trải nghiệm người dùng cao cấp với hình ảnh Unsplash
 * sắc nét cũng như accordion chuyển động mượt mà.
 */
export default async function HowToApplyPage() {
  const t = await getTranslations("HowToApplyPage")
  
  let steps = []
  let documents = []
  let tips = []

  try {
    const data = await getHowToApplyGuideline()
    steps = data.steps
    documents = data.documents
    tips = data.tips
  } catch (err) {
    console.warn("Failed to fetch dynamic guidelines, falling back to static locales", err)
    steps = t.raw("steps")
    documents = t.raw("documents")
    tips = t.raw("tips")
  }
  
  // Chuyển đổi dữ liệu TIPS từ mock data để khớp chính xác kiểu dữ liệu FAQItemType của component FAQPreview
  // WHY: Đảm bảo khả năng tương thích kiểu dữ liệu một cách an toàn mà không phải thay đổi cấu trúc mock dữ liệu gốc
  const parsedFaqItems = tips.map((tip: any, index: number) => ({
    id: `apply-tip-${index}`,
    question: tip.question,
    answer: tip.answer,
  }))

  const tocSections = [
    { id: "timeline", label: t("applicationTimelineTitle") },
    { id: "documents", label: t("requiredDocumentsTitle") },
    { id: "tips", label: t("quickAnswersTitle") },
  ]

  return (
    <>
      <FloatingTOC sections={tocSections} />
      {/* Banner đầu trang hướng dẫn nộp hồ sơ */}
      <PageBanner
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: t("title") },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Phần 1: Application Timeline ── Quy trình 5 bước nộp hồ sơ */}
        <section id="timeline" aria-labelledby="steps-heading">
          <Typography variant="h2" as="h2" id="steps-heading" className="mb-8">
            {t("applicationTimelineTitle")}
          </Typography>
          <ApplicationTimeline steps={steps} />
        </section>

        {/* Phần 2: Required Documents ── Tài liệu bắt buộc kèm ảnh minh họa trực quan */}
        <section id="documents" className="mt-16" aria-labelledby="documents-heading">
          <Typography variant="h2" as="h2" id="documents-heading" className="mb-8">
            {t("requiredDocumentsTitle")}
          </Typography>
          <RequiredDocuments documents={documents} />
        </section>


        {/* Phần 3: Quick Answers — Giải đáp nhanh, tái sử dụng FAQPreview với tập câu hỏi riêng */}
        <section id="tips" className="mt-12" aria-labelledby="tips-heading">
          <FAQPreview
            items={parsedFaqItems}
            title={t("quickAnswersTitle")}
            subtitle={t("quickAnswersSubtitle")}
          />
        </section>

        {/* Nút kêu gọi hành động bắt đầu làm đơn xin visa */}
        <div className="mt-12 text-center">
          <Button asChild size="lg" data-ai-element="how_to_apply_start">
            <Link href="/apply">{t("startApplicationBtn")}</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
