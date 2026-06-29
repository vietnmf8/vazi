import type { Metadata } from "next"
import { StingerLink } from "@/components/stinger/StingerLink"
import { ArrowRight } from "lucide-react"
import { PageBanner } from "@/components/layout/PageBanner"
import { getTranslations, getLocale } from "next-intl/server"
import { getArticles } from "@/lib/api/articles.api"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GuidePage")
  return {
    title: t("title"),
    description: t("subtitle"),
  }
}

/**
 * Hub trang Guide — liên kết tới các sub-pages.
 */
export default async function GuidePage() {
  const t = await getTranslations("GuidePage")
  const locale = await getLocale()

  let apiGuides: any[] = []
  try {
    const res = await getArticles({ type: "guide", limit: 50, locale })
    apiGuides = res.items || []
  } catch (error) {
    console.error("Failed to fetch guide articles", error)
  }

  const GUIDE_LINKS = [
    {
      href: "/guide/vietnam-visa-fees",
      title: t("vietnamVisaFees.title"),
      description: t("vietnamVisaFees.description"),
    },
    ...apiGuides.map((article) => ({
      href: `/guide/${article.slug}`,
      title: article.title,
      description: article.subtitle,
    })),
  ]

  return (
    <>
      <PageBanner
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumb={[
          { label: t("breadcrumbHome"), href: "/" },
          { label: t("breadcrumbGuide") },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-ai-target="guide_links">
          {GUIDE_LINKS.map((item) => (
            <li key={item.href}>
              <StingerLink
                href={item.href}
                className="group flex flex-col h-full rounded-[2rem] bg-(--color-surface-2) p-8 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl dark:shadow-none dark:hover:shadow-blue-900/10 border border-(--color-border) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)"
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-(--color-text-primary) group-hover:text-(--color-primary) transition-all">
                    {item.title}
                  </h3>
                  <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-(--color-primary) group-hover:translate-x-1 transition-transform">
                  {t("readGuide")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </div>
              </StingerLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
