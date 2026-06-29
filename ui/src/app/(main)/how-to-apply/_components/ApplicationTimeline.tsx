import {
  ClipboardList,
  CreditCard,
  FileText,
  Mail,
  Upload,
} from "lucide-react"
import { useTranslations } from "next-intl"

// Danh sách các icon tương ứng cho từng bước của quy trình
const STEP_ICONS = [ClipboardList, Upload, FileText, CreditCard, Mail] as const

/**
 * Component hiển thị tiến trình 5 bước nộp hồ sơ e-visa.
 * Áp dụng hiệu ứng hover sinh động và phong cách đổ màu đồng bộ với HowItWorks ở trang chủ.
 * 
 * WHY: Thiết kế lại bằng cách đưa số thứ tự bước (01, 02) thành chữ mờ dạng watermark siêu lớn ở bên phải card.
 * Điều này loại bỏ việc hiển thị 2 khối tròn cạnh nhau gây mất tập trung, tạo ra một giao diện thoáng đãng,
 * tinh tế và mang lại cảm giác cực kỳ cao cấp (premium).
 */
interface ApplicationTimelineProps {
  steps?: Array<{
    step: number;
    title: string;
    description: string;
  }>;
}

export function ApplicationTimeline({ steps: propSteps }: ApplicationTimelineProps) {
  const t = useTranslations("HowToApplyPage")
  const steps: any[] = propSteps || t.raw("steps")

  return (
    <ol className="mt-10 space-y-6" data-ai-target="how_to_apply_timeline">
      {steps.map((item, index) => {
        const Icon = STEP_ICONS[index]
        return (
          <li
            key={item.step}
            // WHY: Xoá bỏ pr-16 trên mobile (chỉ giữ p-6) để căn giữa nội dung cân đối.
            // Trên desktop (sm trở lên) khôi phục pr-16 để chừa khoảng trống cho số watermark.
            className="group relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-2xl border border-(--color-border) bg-(--color-bg) p-6 sm:pr-16 transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md dark:dark-glass dark:bg-(--color-bg)/20"
          >
            {/* Icon đại diện duy nhất bên trái — tự phóng to nhẹ và đổi màu khi group hover */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-(--color-secondary-subtle) text-(--color-secondary) transition-all duration-300 border border-[var(--color-border)] group-hover:scale-110 group-hover:bg-[var(--color-primary-subtle)] group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/20 shadow-sm">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>

            {/* Text mô tả chi tiết bước — z-10 đảm bảo chữ luôn hiển thị rõ phía trên watermark */}
            <div className="min-w-0 flex-1 text-center sm:text-left z-10">
              <h3 className="section-subtitle transition-all duration-300 group-hover:text-(--color-primary)">
                {item.title}
              </h3>
              <p className="mt-2 body-text-sm">
                {item.description}
              </p>
            </div>

            {/* Số thứ tự bước nộp hồ sơ — dạng watermark siêu lớn nằm chìm ở góc phải card */}
            {/* WHY: Ẩn số thứ tự (hidden) trên mobile để giao diện tối giản và căn giữa đẹp hơn, chỉ hiện (sm:block) trên desktop */}
            <span
              className="absolute right-6 top-1/2 -translate-y-1/2 select-none font-mono text-6xl sm:text-7xl font-extrabold text-(--color-text-primary)/5 transition-all duration-300 group-hover:text-(--color-primary)/10 group-hover:scale-105 pointer-events-none hidden sm:block"
              aria-hidden="true"
            >
              0{item.step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
