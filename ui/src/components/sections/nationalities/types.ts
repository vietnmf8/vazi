/**
 * @file types.ts
 * @description Định nghĩa các kiểu dữ liệu sử dụng trong component check quốc tịch visa.
 */

export type NationalityGroup = "popular" | "good" | "normal" | "blacklist"

export interface NationalityCard {
  /** Mã quốc gia (dạng 2 ký tự in thường, vd "vn", "us") */
  code: string
  /** Tên hiển thị đầy đủ của quốc gia (vd "Vietnam") */
  label: string
  /** Tên gốc tiếng Anh của quốc gia dùng để lấy cờ */
  name?: string
  /** Đường dẫn hướng dẫn exemptions tương ứng */
  href: string
  /** Biểu tượng cờ emoji mặc định (fallback) */
  flag: string
  /** Đánh dấu là quốc gia phổ biến hay không */
  isPopular?: boolean
  /** Nhóm phân loại dịch vụ visa */
  group: NationalityGroup
  /** Số ngày miễn thị thực (0 = không được miễn) */
  exemptionDays?: number
}
