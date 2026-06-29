import { useEffect, useRef, useState } from "react"
import { calculatePrice as fetchCalculatePrice } from "@/lib/api/application.api"
import { mapStep1ToCalculatePriceRequest } from "@/lib/enum-mappers"
import { PRICE_DEBOUNCE_MS } from "@/lib/constants"
import type { PriceBreakdown as ApiPriceBreakdown } from "@/types/api"
import type { Step1FormValues } from "@/app/apply/_components/applySchemas"

export interface UseApplyPriceReturn {
  /** Chi tiết bảng giá trả về từ API */
  apiPrice: ApiPriceBreakdown | null
  /** Trạng thái đang tải / tính toán giá */
  isPriceLoading: boolean
  /** Hàm trigger làm mới và tính toán lại giá vé dựa trên dữ liệu Bước 1 */
  refreshApiPrice: (step1: Step1FormValues) => void
}

/**
 * Custom hook quản lý trạng thái và tính toán giá thị thực (Visa Price Calculation) kèm debounce.
 * Tách biệt logic này giúp giao diện mượt mà hơn, tránh việc gửi request tính giá dồn dập
 * khi người dùng thay đổi các tuỳ chọn liên tục trên form.
 *
 * @returns {UseApplyPriceReturn} Các trạng thái và phương thức liên quan đến giá vé
 */
export function useApplyPrice(): UseApplyPriceReturn {
  const [apiPrice, setApiPrice] = useState<ApiPriceBreakdown | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState<boolean>(false)
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshApiPrice = (step1: Step1FormValues) => {
    // Clear API price immediately so UI falls back to local price recalculation instantly
    setApiPrice(null)

    // Huỷ bỏ timer cũ nếu người dùng thao tác quá nhanh, giúp tối ưu hoá request
    if (priceDebounceRef.current) {
      clearTimeout(priceDebounceRef.current)
    }

    priceDebounceRef.current = setTimeout(async () => {
      // TẠI SAO: Standalone Fast-Track (code_fasttrack) có mức phí cơ bản là $0 và chỉ tính phí gói dịch vụ Basic ($35) hoặc VIP ($55).
      // Backend API hiện tại không hỗ trợ tính toán luồng này độc lập mà tự động map sang E-Visa và cộng thêm phí visa gốc ($55 hoặc $35).
      // Do đó, ta chặn không gửi request lên API mà thực hiện tính toán 100% tại client-side (local) để hiển thị bảng giá chuẩn xác nhất.
      if (step1.visa_category === "code_fasttrack") {
        setApiPrice(null)
        setIsPriceLoading(false)
        return
      }

      // Chỉ gửi request khi đã nhập đủ các thông tin tối thiểu bắt buộc để tính giá
      if (!step1.arrival_date || !step1.port_of_entry || !step1.purpose_of_visit) {
        return
      }

      setIsPriceLoading(true)
      try {
        const breakdown = await fetchCalculatePrice(mapStep1ToCalculatePriceRequest(step1))
        setApiPrice(breakdown)
      } catch {
        // Trả về null khi có lỗi xảy ra để UI hiển thị trạng thái lỗi hoặc giá mặc định
        setApiPrice(null)
      } finally {
        setIsPriceLoading(false)
      }
    }, PRICE_DEBOUNCE_MS)
  }

  // Dọn dẹp timer khi component sử dụng hook này bị unmount để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (priceDebounceRef.current) {
        clearTimeout(priceDebounceRef.current)
      }
    }
  }, [])

  return {
    apiPrice,
    isPriceLoading,
    refreshApiPrice,
  }
}
