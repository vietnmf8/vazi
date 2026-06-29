import { useTranslations } from "next-intl"
import Image from "next/image"

/**
 * Component hiển thị danh sách các tài liệu bắt buộc khi nộp đơn e-visa.
 * Mỗi tài liệu được mô tả bằng một card chứa hình ảnh minh họa chất lượng cao và sát thực tế nhất với Visa từ Unsplash.
 * 
 * WHY: Việc bổ sung hình ảnh trực quan giúp người dùng dễ dàng hình dung loại tài liệu họ cần chuẩn bị,
 * đồng thời mang lại một giao diện giàu tính thẩm mỹ, hiện đại và cao cấp hơn.
 */
interface RequiredDocumentsProps {
  documents?: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string | null;
  }>;
}

export function RequiredDocuments({ documents: propDocuments }: RequiredDocumentsProps) {
  const t = useTranslations("HowToApplyPage")
  const documents: any[] = propDocuments || t.raw("documents")

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-ai-target="how_to_apply_documents">
      {documents.map((doc, index) => {
        // Dùng ảnh từ API, nếu không có thì fallback sang ảnh tĩnh ở root
        let imgSrc = doc.imageUrl;
        if (!imgSrc) {
          if (index === 0) imgSrc = "/passport.jpg";
          else if (index === 1) imgSrc = "/portrait.jpg";
          else imgSrc = "/form.jpg";
        }
        const imgAlt = doc.title

        return (
          <div
            key={doc.id}
            className="group overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-bg) transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md dark:dark-glass dark:bg-(--color-bg)/20"
          >
            {/* Khung chứa ảnh minh họa tài liệu */}
            {imgSrc && (
              <div className="relative h-48 w-full overflow-hidden border-b border-(--color-border)">
                {/* Ảnh minh họa tài liệu */}
                <Image
                  src={imgSrc}
                  alt={imgAlt || ""}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Lớp overlay chuyển màu mượt mà xuất hiện khi hover tạo chiều sâu cho ảnh */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )}

            {/* Phần thông tin chi tiết */}
            <div className="p-6">
              <h3 className="section-subtitle transition-all duration-300 group-hover:text-(--color-primary) mb-2">
                {doc.title}
              </h3>
              <p className="body-text-sm">
                {doc.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
