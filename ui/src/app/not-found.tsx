import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
import { Header, Footer } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import { Typography } from "@/components/ui/Typography"

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "NotFound" })

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-6xl font-bold text-[var(--color-text-tertiary)]" aria-hidden>
          404
        </p>
        <Typography variant="h1" as="h1" className="mt-4">
          {t("title")}
        </Typography>
        <Typography variant="body" className="mt-4 max-w-md text-[var(--color-text-tertiary)]">
          {t("description")}
        </Typography>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href={`/${locale}`}>{t("back_home")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/apply`}>{t("apply_visa")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  )
}
