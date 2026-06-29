import Link from "next/link"
import { PageBanner } from "@/components/layout/PageBanner"
import { Button } from "@/components/ui/Button"
import { Typography } from "@/components/ui/Typography"

/**
 * 404 riêng cho guide slug — giữ user trong luồng Guide thay vì global 404.
 */
export default function GuideNotFound() {
  return (
    <>
      <PageBanner title="Guide Not Found" subtitle="This guide page does not exist" />
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <Typography variant="body" className="text-[var(--color-text-tertiary)]">
          The guide you are looking for may have been moved or removed. Browse our available
          guides below.
        </Typography>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/guide">Visa Guide Hub</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
