import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { VisaExtensionGuide } from "@/components/features/guide/VisaExtensionGuide"
import { ExtraServicesGuide } from "@/components/features/guide/ExtraServicesGuide"
import { VisaExemptionsGuide } from "@/components/features/guide/VisaExemptionsGuide"
import { getLocale, getTranslations } from "next-intl/server"
import { getArticle } from "@/lib/api/articles.api"
import { getExemptionCountries } from "@/lib/api/exemption-countries.api"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("guideSlugPage"),
  ])

  try {
    const article = await getArticle(slug, locale)
    const LOCALIZABLE_SLUGS = ['extra-services', 'visa-extension', 'visa-exemptions']
    if (LOCALIZABLE_SLUGS.includes(slug)) {
      return {
        title: t(`${slug}.title` as any),
        description: t(`${slug}.description` as any),
      }
    }
    return {
      title: article.title,
      description: article.subtitle,
    }
  } catch {
    return { title: t("not_found") }
  }
}

const LOCALIZABLE_SLUGS = ['extra-services', 'visa-extension', 'visa-exemptions'] as const

export default async function GuideSlugPage({ params }: PageProps) {
  const { slug } = await params
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("guideSlugPage"),
  ])

  let article;
  try {
    article = await getArticle(slug, locale)
  } catch (error) {
    notFound()
  }

  const localizedArticle = LOCALIZABLE_SLUGS.includes(slug as any)
    ? {
        ...article,
        title: t(`${slug}.title` as any),
        subtitle: t(`${slug}.description` as any),
      }
    : article

  if (slug === 'extra-services') {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div className="font-[family-name:var(--font-inter)]">
          <ExtraServicesGuide article={localizedArticle} />
        </div>
      </Suspense>
    )
  }

  if (slug === 'visa-extension') {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div className="font-[family-name:var(--font-inter)]">
          <VisaExtensionGuide article={localizedArticle} />
        </div>
      </Suspense>
    )
  }

  if (slug === 'visa-exemptions') {
    let exemptionCountries: any[] = []
    try {
      exemptionCountries = await getExemptionCountries()
    } catch (err) {}

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div className="font-[family-name:var(--font-inter)]">
          <VisaExemptionsGuide article={localizedArticle} exemptionCountries={exemptionCountries} />
        </div>
      </Suspense>
    )
  }

  notFound()
}

