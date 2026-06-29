import { Footer } from "@/components/layout"
import { getFooterSettings } from "@/lib/api/footer.api"

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const contact = await getFooterSettings()

  return (
    <>
      <main className="flex-1 pt-(--header-total-height)">{children}</main>
      <Footer />
    </>
  )
}
