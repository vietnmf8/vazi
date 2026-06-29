import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PaymentGuideline } from "@/components/features/guide/PaymentGuideline"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PaymentGuideline")
  return {
    title: t("heroTitle"),
    description: t("heroSubtitle"),
  }
}

export default function PaymentGuidelinePage() {
  return (
    <div className="font-[family-name:var(--font-inter)]">
      <PaymentGuideline />
    </div>
  )
}
