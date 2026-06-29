import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { getFlagCdnUrl, getFlagCdnUrlByCode } from "@/lib/flagcdn"

// Bộ nhớ đệm toàn cục mức module lưu trữ trạng thái các ảnh cờ đã tải thành công.
// Tại sao: Khi chuyển tab hoặc mở rộng danh sách, React unmount và mount lại component khiến state loaded bị reset về false.
// Việc lưu cache toàn cục mức module giúp render đầu tiên của các component mới có loaded = true ngay lập tức nếu ảnh đã từng tải,
// triệt tiêu hoàn toàn hiện tượng trắng ảnh cờ hay nhấp nháy skeleton.
export const LOADED_FLAGS_CACHE = new Set<string>()

export interface LazyFlagProps {
  countryName?: string
  isoCode?: string
  fallbackFlag?: string
  className?: string
}

/**
 * Component hiển thị ảnh cờ quốc gia mượt mà với bộ nhớ đệm thông minh và cơ chế fallback an toàn.
 *
 * @param {LazyFlagProps} props Các thuộc tính của LazyFlag
 */
export function LazyFlag({ countryName, isoCode, fallbackFlag, className }: LazyFlagProps) {
  const url = isoCode ? getFlagCdnUrlByCode(isoCode, 160) : getFlagCdnUrl(countryName || "", 160)
  const [prevUrl, setPrevUrl] = useState(url)
  const [loaded, setLoaded] = useState(() => LOADED_FLAGS_CACHE.has(url))
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Đồng bộ hóa State trực tiếp trong quá trình Render khi URL thay đổi (React Recommended Pattern)
  // Tại sao: Khi React tái sử dụng component LazyFlag cho quốc gia khác, state loaded và error cần được reset về đúng URL mới.
  // Việc cập nhật state trực tiếp ngay trong thân component khi phát hiện url thay đổi giúp React lên lịch re-render lập tức
  // trong cùng chu kỳ hiện tại, triệt tiêu hoàn toàn lỗi "cascading renders" và nâng cao hiệu suất tuyệt đối.
  if (url !== prevUrl) {
    setPrevUrl(url)
    setLoaded(LOADED_FLAGS_CACHE.has(url))
    setError(false)
  }

  // useEffect chỉ còn làm duy nhất nhiệm vụ đồng bộ với hệ thống ngoài (Browser Cache / Image complete status)
  // Tại sao: Nếu ảnh load từ cache quá nhanh trước khi React kịp hydrate và gắn kết event handler,
  // sự kiện onLoad trong React sẽ không bao giờ được kích hoạt, khiến ảnh bị ẩn (opacity-0) vĩnh viễn.
  // Việc kiểm tra imgRef.current.complete giúp phát hiện trạng thái này và ép buộc ảnh hiển thị lập tức.
  useEffect(() => {
    const cached = LOADED_FLAGS_CACHE.has(url)
    if (!cached && imgRef.current && imgRef.current.complete) {
      LOADED_FLAGS_CACHE.add(url)
      setLoaded(true)
    }
  }, [url])

  if (error && fallbackFlag) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-2xl font-sans select-none rounded-full border border-stone-200 shadow-xs shrink-0",
          className
        )}
      >
        {fallbackFlag}
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden bg-stone-100 dark:bg-stone-800", className)}>
      {/* Hiệu ứng nhấp nháy shimmer tinh tế trong khi ảnh đang được tải về */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 dark:from-stone-800/40 dark:via-stone-700/40 dark:to-stone-800/40 animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt=""
        onLoad={() => {
          LOADED_FLAGS_CACHE.add(url)
          setLoaded(true)
        }}
        onError={() => {
          setError(true)
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}
