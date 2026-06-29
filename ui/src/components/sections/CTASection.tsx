"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEntryGate } from "@/components/features/entry-gate/EntryGateContext"
import { ShieldCheck, RefreshCw, Headphones } from "lucide-react"
import { Button } from "@/components/ui/Button"

/**
 * CTA section cuối trang — mang đậm thiết kế điện ảnh tối (dark cinematic background) kết hợp gold accents.
 * Đã bọc Client Component để gọi qua EntryGateContext kích hoạt hiển thị cổng phân luồng nổi thống nhất tại chỗ.
 */
export function CTASection() {
  const router = useRouter()
  const { openGate } = useEntryGate()
  const t = useTranslations("HomePage.CTA")

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openGate({
      hideFastTrack: false, // Hiện đầy đủ cả 3 lựa chọn của Entry Gate Modal
      onConfirmNew: () => {
        router.push("/apply")
      },
      onConfirmUrgent: () => {
        router.push("/emergency-inquiry")
      },
      onConfirmFastTrack: () => {
        router.push("/apply?category=evisa-code&option=basic-fasttrack&vip=false&step=2")
      }
    })
  }

  return (
    <section
      aria-labelledby="cta-heading"
      data-ai-target="cta_section"
      data-ai-id="apply-now-cta"
      data-ai-desc="Phần kêu gọi hành động ở cuối trang chủ (Call to Action), cung cấp 2 nút chức năng chính: Nộp đơn ngay (Apply Now) và Kiểm tra trạng thái đơn (Check Status)"
      className="relative w-full bg-[var(--color-surface-1)] py-14 md:py-20 overflow-hidden"
    >
      {/* ── Atmospheric blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Radial gold glow phía sau heading */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[rgba(200,150,90,0.07)] blur-[100px]" />
        {/* Gold blob góc trái trên */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[rgba(200,150,90,0.05)] blur-[80px]" />
        {/* Teal blob góc phải dưới */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-[rgba(58,186,180,0.04)] blur-[80px]" />
        {/* Subtle gold gradient overlay trên surface */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(200,150,90,0.03)_0%,transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[var(--container-wide,1400px)] flex-col items-center text-center px-4 sm:px-6 lg:px-16">
        {/* Heading */}
        <h2
          id="cta-heading"
          className="section-title"
        >
          {t("title")}
        </h2>

        {/* Description */}
        <p className="mt-5 max-w-[600px] section-desc">
          {t("desc")}
        </p>

        {/* CTA buttons */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button onClick={handleApplyClick} size="lg" className=" border-0" data-ai-element="cta_apply">
            {t("apply_now")}
          </Button>
          <Button asChild variant="secondary" size="lg" data-ai-element="cta_check_status">
            <Link href="/check-status">{t("check_status")}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
